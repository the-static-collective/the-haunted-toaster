const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const {
  YOUTUBE_UPLOAD_SCOPE,
  beginResumableUpload,
  buildAuthorizationUrl,
  buildPrivateVideoMetadata,
  createPkcePair,
  exchangeAuthorizationCode,
  parseOAuthCallback,
  refreshAccessToken,
  studioEditUrl,
  uploadResumableFile,
  writePublicationReceipt,
} = require("../src/publish/youtube-publish.cjs");

test("authorization URL requests only youtube.upload with PKCE and offline access", () => {
  const url = new URL(buildAuthorizationUrl({
    clientId: "desktop-client.apps.googleusercontent.com",
    redirectUri: "http://127.0.0.1:43123/callback",
    state: "state-token",
    codeChallenge: "challenge-token",
  }));

  assert.equal(url.origin, "https://accounts.google.com");
  assert.equal(url.pathname, "/o/oauth2/v2/auth");
  assert.equal(url.searchParams.get("client_id"), "desktop-client.apps.googleusercontent.com");
  assert.equal(url.searchParams.get("redirect_uri"), "http://127.0.0.1:43123/callback");
  assert.equal(url.searchParams.get("scope"), YOUTUBE_UPLOAD_SCOPE);
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("access_type"), "offline");
  assert.equal(url.searchParams.get("code_challenge"), "challenge-token");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.get("state"), "state-token");
});

test("PKCE verifier and S256 challenge are base64url and reproducible from supplied entropy", () => {
  const entropy = Buffer.alloc(64, 0xa5);
  const pair = createPkcePair({ randomBytesImpl: () => entropy });
  const expectedVerifier = entropy.toString("base64url");
  const expectedChallenge = crypto
    .createHash("sha256")
    .update(expectedVerifier, "ascii")
    .digest("base64url");

  assert.equal(pair.verifier, expectedVerifier);
  assert.equal(pair.challenge, expectedChallenge);
  assert.match(pair.verifier, /^[A-Za-z0-9_-]{43,128}$/);
});

test("OAuth callback accepts only the expected state and authorization code", () => {
  assert.deepEqual(
    parseOAuthCallback("http://127.0.0.1:43123/callback?code=abc&state=expected", "expected"),
    { code: "abc" },
  );
  assert.throws(
    () => parseOAuthCallback("http://127.0.0.1:43123/callback?code=abc&state=wrong", "expected"),
    /state/i,
  );
  assert.throws(
    () => parseOAuthCallback("http://127.0.0.1:43123/callback?error=access_denied&state=expected", "expected"),
    /access_denied/i,
  );
});

test("authorization-code exchange sends PKCE without requiring a client secret", async () => {
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url: String(url), options });
    return {
      ok: true,
      status: 200,
      json: async () => ({
        access_token: "access-token",
        refresh_token: "refresh-token",
        expires_in: 3600,
        token_type: "Bearer",
      }),
      text: async () => "",
    };
  };

  const tokens = await exchangeAuthorizationCode({
    clientId: "desktop-client.apps.googleusercontent.com",
    code: "auth-code",
    codeVerifier: "verifier",
    redirectUri: "http://127.0.0.1:43123/callback",
    fetchImpl,
  });

  assert.deepEqual(tokens, {
    accessToken: "access-token",
    refreshToken: "refresh-token",
    expiresInSeconds: 3600,
  });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "https://oauth2.googleapis.com/token");
  const form = new URLSearchParams(requests[0].options.body);
  assert.equal(form.get("client_id"), "desktop-client.apps.googleusercontent.com");
  assert.equal(form.get("code"), "auth-code");
  assert.equal(form.get("code_verifier"), "verifier");
  assert.equal(form.get("grant_type"), "authorization_code");
  assert.equal(form.get("redirect_uri"), "http://127.0.0.1:43123/callback");
  assert.equal(form.has("client_secret"), false);
});

test("refresh-token exchange returns a fresh access token without exposing refresh material", async () => {
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url: String(url), options });
    return {
      ok: true,
      status: 200,
      json: async () => ({ access_token: "fresh-access", expires_in: 1800 }),
      text: async () => "",
    };
  };

  const tokens = await refreshAccessToken({
    clientId: "desktop-client.apps.googleusercontent.com",
    refreshToken: "stored-refresh",
    fetchImpl,
  });

  assert.deepEqual(tokens, {
    accessToken: "fresh-access",
    expiresInSeconds: 1800,
  });
  const form = new URLSearchParams(requests[0].options.body);
  assert.equal(form.get("grant_type"), "refresh_token");
  assert.equal(form.get("refresh_token"), "stored-refresh");
  assert.equal(form.has("client_secret"), false);
});

test("beta upload metadata is private-only", () => {
  assert.deepEqual(buildPrivateVideoMetadata({
    title: "Jubilee",
    description: "",
  }), {
    snippet: {
      title: "Jubilee",
      description: "",
    },
    status: {
      privacyStatus: "private",
    },
  });
});

test("resumable session request targets videos.insert and private metadata", async () => {
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url: String(url), options });
    return {
      ok: true,
      status: 200,
      headers: new Headers({ location: "https://upload.example/session-1" }),
      text: async () => "",
    };
  };

  const session = await beginResumableUpload({
    accessToken: "access-token",
    sizeBytes: 12_345,
    mimeType: "video/mp4",
    title: "Jubilee",
    description: "",
    fetchImpl,
  });

  assert.equal(session, "https://upload.example/session-1");
  assert.equal(requests.length, 1);
  const request = requests[0];
  const url = new URL(request.url);
  assert.equal(url.origin, "https://www.googleapis.com");
  assert.equal(url.pathname, "/upload/youtube/v3/videos");
  assert.equal(url.searchParams.get("uploadType"), "resumable");
  assert.equal(url.searchParams.get("part"), "snippet,status");
  assert.equal(request.options.headers.Authorization, "Bearer access-token");
  assert.equal(request.options.headers["X-Upload-Content-Length"], "12345");
  assert.equal(request.options.headers["X-Upload-Content-Type"], "video/mp4");
  assert.deepEqual(JSON.parse(request.options.body), buildPrivateVideoMetadata({
    title: "Jubilee",
    description: "",
  }));
});

test("resumable file upload advances through 308 responses and returns video id", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "toaster-youtube-"));
  const videoPath = path.join(tempRoot, "tiny.mp4");
  await fs.writeFile(videoPath, Buffer.from("abcdefghijkl"));
  const ranges = [];
  const progress = [];
  const fetchImpl = async (_url, options) => {
    ranges.push(options.headers["Content-Range"]);
    if (ranges.length === 1) {
      return {
        ok: false,
        status: 308,
        headers: new Headers({ range: "bytes=0-4" }),
        text: async () => "",
        json: async () => ({}),
      };
    }
    return {
      ok: true,
      status: 200,
      headers: new Headers(),
      text: async () => JSON.stringify({ id: "yt-video-123" }),
      json: async () => ({ id: "yt-video-123" }),
    };
  };

  try {
    const result = await uploadResumableFile({
      sessionUrl: "https://upload.example/session-1",
      filePath: videoPath,
      sizeBytes: 12,
      mimeType: "video/mp4",
      chunkSize: 5,
      fetchImpl,
      onProgress: (value) => progress.push(value),
    });

    assert.equal(result.videoId, "yt-video-123");
    assert.deepEqual(ranges, ["bytes 0-4/12", "bytes 5-9/12"]);
    assert.deepEqual(progress.map((entry) => entry.uploadedBytes), [5, 10]);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("publication receipt is separate, private, source-bound, and contains no credentials", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "toaster-youtube-receipt-"));
  const outputPath = path.join(tempRoot, "jubilee.mp4");
  await fs.writeFile(outputPath, Buffer.from("video"));

  try {
    const result = await writePublicationReceipt({
      outputPath,
      sourceSha256: "abc123",
      sourceSizeBytes: 5,
      videoId: "yt-video-123",
      title: "Jubilee",
      description: "",
      publishedAt: "2026-08-18T03:10:00.000Z",
      accessToken: "must-not-leak",
      refreshToken: "must-not-leak-either",
    });

    assert.equal(path.basename(result.receiptPath), "jubilee.youtube-receipt.json");
    const receipt = JSON.parse(await fs.readFile(result.receiptPath, "utf8"));
    assert.equal(receipt.schema, "haunted-toaster.youtube-publication.v1");
    assert.equal(receipt.destination, "youtube");
    assert.equal(receipt.source.filename, "jubilee.mp4");
    assert.equal(receipt.source.sha256, "abc123");
    assert.equal(receipt.youtube.videoId, "yt-video-123");
    assert.equal(receipt.youtube.requestedPrivacy, "private");
    assert.equal(receipt.youtube.effectivePrivacy, "private");
    assert.equal(receipt.publicationAuthority, "human-in-youtube-studio");
    assert.equal(receipt.status, "uploaded");
    assert.equal(receipt.createdAt, "2026-08-18T03:10:00.000Z");
    const serialized = JSON.stringify(receipt);
    assert.equal(serialized.includes("must-not-leak"), false);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("Studio handoff is scoped to the uploaded video id", () => {
  assert.equal(
    studioEditUrl("yt-video-123"),
    "https://studio.youtube.com/video/yt-video-123/edit",
  );
  assert.throws(() => studioEditUrl("../../escape"), /video id/i);
});
