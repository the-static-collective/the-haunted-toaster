const crypto = require("node:crypto");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");
const {
  beginResumableUpload,
  buildAuthorizationUrl,
  createPkcePair,
  exchangeAuthorizationCode,
  parseOAuthCallback,
  refreshAccessToken,
  studioEditUrl,
  uploadResumableFile,
  writePublicationReceipt,
} = require("./youtube-publish.cjs");
const { createYouTubeCredentialStore } = require("./youtube-credentials.cjs");

const OAUTH_CALLBACK_PATH = "/oauth/youtube/callback";
const OAUTH_TIMEOUT_MS = 5 * 60 * 1000;

function abortError(message = "YouTube publishing cancelled.") {
  const error = new Error(message);
  error.name = "AbortError";
  return error;
}

async function hashFileSha256(filePath) {
  const hash = crypto.createHash("sha256");
  for await (const chunk of fs.createReadStream(filePath)) hash.update(chunk);
  return hash.digest("hex");
}

async function closeServer(server) {
  if (!server?.listening) return;
  await new Promise((resolve) => server.close(() => resolve()));
}

async function authorizeWithLoopback({ clientId, shell, signal }) {
  const oauthState = crypto.randomBytes(32).toString("base64url");
  const pkce = createPkcePair();
  let settleCallback;
  let rejectCallback;
  const callback = new Promise((resolve, reject) => {
    settleCallback = resolve;
    rejectCallback = reject;
  });

  const server = http.createServer((request, response) => {
    const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
    if (request.method !== "GET" || requestUrl.pathname !== OAUTH_CALLBACK_PATH) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found.");
      return;
    }

    try {
      const result = parseOAuthCallback(requestUrl.toString(), oauthState);
      response.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      });
      response.end(
        "<!doctype html><meta charset=\"utf-8\"><title>YouTube connected</title><body style=\"font-family:system-ui;background:#111;color:#eee;padding:3rem\"><h1>YouTube connected.</h1><p>You can close this tab and return to The Haunted Toaster.</p></body>",
      );
      settleCallback(result);
    } catch (error) {
      response.writeHead(400, {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      });
      response.end("YouTube authorization was not accepted. Return to The Haunted Toaster.");
      rejectCallback(error);
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    await closeServer(server);
    throw new Error("Could not open the local YouTube authorization callback.");
  }
  const redirectUri = `http://127.0.0.1:${address.port}${OAUTH_CALLBACK_PATH}`;
  const authorizationUrl = buildAuthorizationUrl({
    clientId,
    redirectUri,
    state: oauthState,
    codeChallenge: pkce.challenge,
  });

  const timeout = setTimeout(
    () => rejectCallback(new Error("YouTube authorization timed out.")),
    OAUTH_TIMEOUT_MS,
  );
  timeout.unref?.();
  const onAbort = () => rejectCallback(abortError("YouTube authorization cancelled."));
  signal?.addEventListener("abort", onAbort, { once: true });

  try {
    if (signal?.aborted) throw abortError("YouTube authorization cancelled.");
    await shell.openExternal(authorizationUrl);
    const { code } = await callback;
    return await exchangeAuthorizationCode({
      clientId,
      code,
      codeVerifier: pkce.verifier,
      redirectUri,
      signal,
    });
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", onAbort);
    await closeServer(server);
  }
}

function createYouTubePublishing({
  app,
  ipcMain,
  shell,
  safeStorage,
  isBusy = () => false,
}) {
  let lastCompletedRender = null;
  let activeYouTubePublish = null;
  let lastUploadedVideoId = null;
  let credentialStore = null;

  function store() {
    if (!credentialStore) {
      credentialStore = createYouTubeCredentialStore({
        root: path.join(app.getPath("userData"), "youtube"),
        safeStorage,
      });
    }
    return credentialStore;
  }

  async function status() {
    const credentialStatus = await store().status();
    return {
      ...credentialStatus,
      canPublish: Boolean(lastCompletedRender?.outputPath),
      sourceFilename: lastCompletedRender?.outputPath
        ? path.basename(lastCompletedRender.outputPath)
        : null,
      publishing: Boolean(activeYouTubePublish),
    };
  }

  async function acquireAccessToken(signal) {
    const clientId = await store().loadClientId();
    if (!clientId) {
      throw new Error("Add a Google desktop OAuth client ID before publishing to YouTube.");
    }

    const refreshToken = await store().loadRefreshToken();
    if (refreshToken) {
      try {
        const refreshed = await refreshAccessToken({
          clientId,
          refreshToken,
          signal,
        });
        return refreshed.accessToken;
      } catch (error) {
        if (signal?.aborted) throw error;
        await store().clearRefreshToken();
      }
    }

    const authorized = await authorizeWithLoopback({ clientId, shell, signal });
    if (!authorized.refreshToken) {
      throw new Error(
        "Google authorized this upload but did not return a reusable refresh token. Reconnect and grant consent again.",
      );
    }
    await store().saveRefreshToken(authorized.refreshToken);
    return authorized.accessToken;
  }

  async function verifyLastRender() {
    if (!lastCompletedRender?.outputPath || !lastCompletedRender?.receipt?.output?.sha256) {
      throw new Error("Finish a witnessed local render before publishing to YouTube.");
    }

    const outputPath = lastCompletedRender.outputPath;
    const stat = await fsp.stat(outputPath);
    if (!stat.isFile() || path.extname(outputPath).toLowerCase() !== ".mp4") {
      throw new Error("The completed render is no longer a local MP4 file.");
    }
    const expectedSize = Number(lastCompletedRender.receipt.output.sizeBytes);
    if (Number.isFinite(expectedSize) && expectedSize > 0 && stat.size !== expectedSize) {
      throw new Error("The completed render changed after its receipt was written; refusing to upload it.");
    }
    const actualSha256 = await hashFileSha256(outputPath);
    if (actualSha256 !== String(lastCompletedRender.receipt.output.sha256)) {
      throw new Error("The completed render hash no longer matches its receipt; refusing to upload it.");
    }
    return { outputPath, stat };
  }

  function noteCompletedRender(result) {
    if (!result?.outputPath || !result?.receipt?.output?.sha256) return false;
    lastCompletedRender = result;
    lastUploadedVideoId = null;
    return true;
  }

  function registerIpc() {
    ipcMain.handle("youtube:status", () => status());

    ipcMain.handle("youtube:configure", async (_event, config) => {
      await store().saveClientId(config?.clientId);
      return status();
    });

    ipcMain.handle("youtube:publish", async (event, config = {}) => {
      if (activeYouTubePublish) {
        throw new Error("A YouTube upload is already in progress.");
      }
      if (isBusy()) {
        throw new Error("Finish the current Toaster job before publishing to YouTube.");
      }

      const { outputPath, stat } = await verifyLastRender();
      const title = String(config?.title || path.parse(outputPath).name)
        .trim()
        .slice(0, 100);
      const description = String(config?.description || "").slice(0, 5_000);
      if (!title) throw new Error("YouTube publishing requires a title.");

      const controller = new AbortController();
      activeYouTubePublish = controller;
      try {
        const accessToken = await acquireAccessToken(controller.signal);
        const sessionUrl = await beginResumableUpload({
          accessToken,
          sizeBytes: stat.size,
          mimeType: "video/mp4",
          title,
          description,
          signal: controller.signal,
        });
        const uploaded = await uploadResumableFile({
          sessionUrl,
          accessToken,
          filePath: outputPath,
          sizeBytes: stat.size,
          mimeType: "video/mp4",
          signal: controller.signal,
          onProgress(progress) {
            if (!event.sender.isDestroyed()) {
              event.sender.send("youtube:progress", progress);
            }
          },
        });

        const publication = await writePublicationReceipt({
          outputPath,
          sourceSha256: lastCompletedRender.receipt.output.sha256,
          sourceSizeBytes: stat.size,
          videoId: uploaded.videoId,
          title,
          description,
        });
        lastUploadedVideoId = uploaded.videoId;
        return {
          status: "uploaded",
          visibility: "private",
          videoId: uploaded.videoId,
          receiptPath: publication.receiptPath,
        };
      } finally {
        activeYouTubePublish = null;
      }
    });

    ipcMain.handle("youtube:cancel", () => {
      if (!activeYouTubePublish) return false;
      activeYouTubePublish.abort();
      return true;
    });

    ipcMain.handle("youtube:open-studio", async (_event, videoId) => {
      if (!lastUploadedVideoId || videoId !== lastUploadedVideoId) {
        throw new Error("Only the video uploaded by this completed toast can be opened here.");
      }
      await shell.openExternal(studioEditUrl(videoId));
      return true;
    });
  }

  function abort() {
    activeYouTubePublish?.abort();
  }

  return Object.freeze({
    abort,
    noteCompletedRender,
    registerIpc,
    status,
  });
}

module.exports = {
  OAUTH_CALLBACK_PATH,
  createYouTubePublishing,
  hashFileSha256,
};
