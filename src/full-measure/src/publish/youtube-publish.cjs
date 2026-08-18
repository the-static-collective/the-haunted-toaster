const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");

const YOUTUBE_UPLOAD_SCOPE = "https://www.googleapis.com/auth/youtube.upload";
const YOUTUBE_AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const YOUTUBE_RESUMABLE_UPLOAD_ENDPOINT = "https://www.googleapis.com/upload/youtube/v3/videos";
const PUBLICATION_RECEIPT_SCHEMA = "haunted-toaster.youtube-publication.v1";
const DEFAULT_CHUNK_SIZE = 8 * 1024 * 1024;

function buildAuthorizationUrl({ clientId, redirectUri, state, codeChallenge }) {
  if (!clientId || !redirectUri || !state || !codeChallenge) {
    throw new Error("YouTube authorization requires clientId, redirectUri, state, and codeChallenge.");
  }

  const url = new URL(YOUTUBE_AUTHORIZATION_ENDPOINT);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", YOUTUBE_UPLOAD_SCOPE);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

function createPkcePair({ randomBytesImpl = crypto.randomBytes } = {}) {
  if (typeof randomBytesImpl !== "function") {
    throw new Error("PKCE requires a cryptographic random byte source.");
  }
  const entropy = Buffer.from(randomBytesImpl(64));
  if (entropy.length < 32) {
    throw new Error("PKCE requires at least 32 bytes of entropy.");
  }
  const verifier = entropy.toString("base64url").slice(0, 128);
  const challenge = crypto
    .createHash("sha256")
    .update(verifier, "ascii")
    .digest("base64url");
  return { verifier, challenge };
}

function parseOAuthCallback(callbackUrl, expectedState) {
  const url = new URL(callbackUrl);
  const receivedState = url.searchParams.get("state");
  if (!expectedState || receivedState !== expectedState) {
    throw new Error("YouTube authorization state did not match the request.");
  }
  const providerError = url.searchParams.get("error");
  if (providerError) {
    throw new Error(`YouTube authorization failed: ${providerError}.`);
  }
  const code = url.searchParams.get("code");
  if (!code) throw new Error("YouTube authorization returned no code.");
  return { code };
}

async function responseError(response, label) {
  let detail = "";
  try {
    detail = String(await response.text()).trim();
  } catch {}
  const suffix = detail ? ` ${detail.slice(0, 1_000)}` : "";
  return new Error(`${label} failed with HTTP ${response.status}.${suffix}`);
}

async function tokenResponse(response, label) {
  if (!response.ok) throw await responseError(response, label);
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`${label} returned an unreadable response.`);
  }
  if (!payload?.access_token) {
    throw new Error(`${label} returned no access token.`);
  }
  return payload;
}

async function exchangeAuthorizationCode({
  clientId,
  code,
  codeVerifier,
  redirectUri,
  fetchImpl = globalThis.fetch,
  signal,
}) {
  if (!clientId || !code || !codeVerifier || !redirectUri) {
    throw new Error("YouTube token exchange requires clientId, code, codeVerifier, and redirectUri.");
  }
  if (typeof fetchImpl !== "function") throw new Error("Fetch is unavailable.");
  const body = new URLSearchParams({
    client_id: clientId,
    code,
    code_verifier: codeVerifier,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });
  const response = await fetchImpl(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    signal,
  });
  const payload = await tokenResponse(response, "YouTube authorization-code exchange");
  return {
    accessToken: String(payload.access_token),
    refreshToken: payload.refresh_token ? String(payload.refresh_token) : null,
    expiresInSeconds: Number(payload.expires_in) || 0,
  };
}

async function refreshAccessToken({
  clientId,
  refreshToken,
  fetchImpl = globalThis.fetch,
  signal,
}) {
  if (!clientId || !refreshToken) {
    throw new Error("YouTube token refresh requires clientId and refreshToken.");
  }
  if (typeof fetchImpl !== "function") throw new Error("Fetch is unavailable.");
  const body = new URLSearchParams({
    client_id: clientId,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const response = await fetchImpl(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    signal,
  });
  const payload = await tokenResponse(response, "YouTube token refresh");
  return {
    accessToken: String(payload.access_token),
    expiresInSeconds: Number(payload.expires_in) || 0,
  };
}

function buildPrivateVideoMetadata({ title, description = "" }) {
  const normalizedTitle = String(title || "").trim().slice(0, 100);
  if (!normalizedTitle) {
    throw new Error("YouTube upload requires a video title.");
  }

  return {
    snippet: {
      title: normalizedTitle,
      description: String(description || "").slice(0, 5_000),
    },
    status: {
      privacyStatus: "private",
    },
  };
}

async function beginResumableUpload({
  accessToken,
  sizeBytes,
  mimeType = "video/mp4",
  title,
  description = "",
  fetchImpl = globalThis.fetch,
  signal,
}) {
  if (!accessToken) throw new Error("A YouTube access token is required.");
  if (!Number.isSafeInteger(Number(sizeBytes)) || Number(sizeBytes) <= 0) {
    throw new Error("A positive source byte length is required for YouTube upload.");
  }
  if (typeof fetchImpl !== "function") throw new Error("Fetch is unavailable.");

  const url = new URL(YOUTUBE_RESUMABLE_UPLOAD_ENDPOINT);
  url.searchParams.set("uploadType", "resumable");
  url.searchParams.set("part", "snippet,status");

  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Length": String(sizeBytes),
      "X-Upload-Content-Type": mimeType,
    },
    body: JSON.stringify(buildPrivateVideoMetadata({ title, description })),
    signal,
  });

  if (!response.ok) throw await responseError(response, "YouTube resumable session");
  const sessionUrl = response.headers.get("location");
  if (!sessionUrl) {
    throw new Error("YouTube did not return a resumable upload session URL.");
  }
  return sessionUrl;
}

function nextOffsetFromRange(rangeHeader, fallbackOffset) {
  const match = /^bytes=\d+-(\d+)$/i.exec(String(rangeHeader || "").trim());
  if (!match) return fallbackOffset;
  return Number(match[1]) + 1;
}

async function uploadResumableFile({
  sessionUrl,
  filePath,
  sizeBytes,
  mimeType = "video/mp4",
  chunkSize = DEFAULT_CHUNK_SIZE,
  fetchImpl = globalThis.fetch,
  signal,
  onProgress,
}) {
  if (!sessionUrl) throw new Error("A resumable YouTube session URL is required.");
  if (!filePath) throw new Error("A local video path is required.");
  if (!Number.isSafeInteger(Number(sizeBytes)) || Number(sizeBytes) <= 0) {
    throw new Error("A positive source byte length is required for YouTube upload.");
  }
  if (!Number.isSafeInteger(Number(chunkSize)) || Number(chunkSize) <= 0) {
    throw new Error("YouTube upload chunkSize must be a positive integer.");
  }
  if (typeof fetchImpl !== "function") throw new Error("Fetch is unavailable.");

  const handle = await fs.open(filePath, "r");
  let offset = 0;
  try {
    while (offset < sizeBytes) {
      if (signal?.aborted) {
        const error = new Error("YouTube upload cancelled.");
        error.name = "AbortError";
        throw error;
      }

      const requestedLength = Math.min(chunkSize, sizeBytes - offset);
      const buffer = Buffer.allocUnsafe(requestedLength);
      const { bytesRead } = await handle.read(buffer, 0, requestedLength, offset);
      if (bytesRead <= 0) {
        throw new Error(`YouTube upload reached EOF at byte ${offset} before ${sizeBytes}.`);
      }
      const chunk = bytesRead === buffer.length ? buffer : buffer.subarray(0, bytesRead);
      const end = offset + bytesRead - 1;

      const response = await fetchImpl(sessionUrl, {
        method: "PUT",
        headers: {
          "Content-Length": String(bytesRead),
          "Content-Type": mimeType,
          "Content-Range": `bytes ${offset}-${end}/${sizeBytes}`,
        },
        body: chunk,
        signal,
      });

      if (response.status === 308) {
        const fallbackOffset = end + 1;
        const nextOffset = nextOffsetFromRange(
          response.headers.get("range"),
          fallbackOffset,
        );
        if (!Number.isSafeInteger(nextOffset) || nextOffset <= offset) {
          throw new Error("YouTube returned an invalid resumable upload range.");
        }
        offset = Math.min(nextOffset, sizeBytes);
        onProgress?.({
          uploadedBytes: offset,
          sizeBytes,
          ratio: offset / sizeBytes,
        });
        continue;
      }

      if (!response.ok) throw await responseError(response, "YouTube video upload");

      offset = end + 1;
      onProgress?.({
        uploadedBytes: Math.min(offset, sizeBytes),
        sizeBytes,
        ratio: Math.min(1, offset / sizeBytes),
      });

      let payload;
      try {
        payload = await response.json();
      } catch {
        const text = await response.text();
        payload = text ? JSON.parse(text) : null;
      }
      if (!payload?.id) {
        throw new Error("YouTube accepted the upload but returned no video ID.");
      }
      return { videoId: String(payload.id) };
    }
  } finally {
    await handle.close();
  }

  throw new Error("YouTube upload ended without a completed video response.");
}

function studioEditUrl(videoId) {
  const normalized = String(videoId || "").trim();
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(normalized)) {
    throw new Error("A valid YouTube video ID is required for Studio handoff.");
  }
  return `https://studio.youtube.com/video/${normalized}/edit`;
}

function publicationReceiptPath(outputPath) {
  const parsed = path.parse(outputPath);
  return path.join(parsed.dir, `${parsed.name}.youtube-receipt.json`);
}

async function writePublicationReceipt({
  outputPath,
  sourceSha256,
  sourceSizeBytes,
  videoId,
  title,
  description = "",
  publishedAt = new Date().toISOString(),
}) {
  if (!outputPath || !sourceSha256 || !videoId) {
    throw new Error("Publication receipt requires outputPath, sourceSha256, and videoId.");
  }

  const receipt = {
    schema: PUBLICATION_RECEIPT_SCHEMA,
    destination: "youtube",
    status: "uploaded",
    createdAt: String(publishedAt),
    source: {
      filename: path.basename(outputPath),
      sha256: String(sourceSha256),
      sizeBytes: Number(sourceSizeBytes),
    },
    youtube: {
      videoId: String(videoId),
      title: String(title || "").trim().slice(0, 100),
      description: String(description || "").slice(0, 5_000),
      requestedPrivacy: "private",
      effectivePrivacy: "private",
    },
    publicationAuthority: "human-in-youtube-studio",
  };

  const receiptPath = publicationReceiptPath(outputPath);
  await fs.writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  return { receiptPath, receipt };
}

module.exports = {
  DEFAULT_CHUNK_SIZE,
  PUBLICATION_RECEIPT_SCHEMA,
  YOUTUBE_UPLOAD_SCOPE,
  beginResumableUpload,
  buildAuthorizationUrl,
  buildPrivateVideoMetadata,
  createPkcePair,
  exchangeAuthorizationCode,
  parseOAuthCallback,
  publicationReceiptPath,
  refreshAccessToken,
  studioEditUrl,
  uploadResumableFile,
  writePublicationReceipt,
};
