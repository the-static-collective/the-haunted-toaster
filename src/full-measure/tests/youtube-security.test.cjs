const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { uploadResumableFile } = require("../src/publish/youtube-publish.cjs");
const {
  createYouTubeCredentialStore,
  validateDesktopClientId,
} = require("../src/publish/youtube-credentials.cjs");

function fakeSafeStorage({ available = true } = {}) {
  return {
    async isAsyncEncryptionAvailable() {
      return available;
    },
    async encryptStringAsync(value) {
      return Buffer.from(String(value).split("").reverse().join(""), "utf8");
    },
    async decryptStringAsync(buffer) {
      return {
        result: Buffer.from(buffer).toString("utf8").split("").reverse().join(""),
        shouldReEncrypt: false,
      };
    },
  };
}

test("desktop client id validation accepts Google desktop ids and rejects arbitrary text", () => {
  assert.equal(
    validateDesktopClientId("123456-abcdef.apps.googleusercontent.com"),
    "123456-abcdef.apps.googleusercontent.com",
  );
  assert.throws(() => validateDesktopClientId("not-a-client-id"), /client id/i);
});

test("refresh token is encrypted at rest and can be recovered only through safeStorage", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "toaster-youtube-credentials-"));
  try {
    const store = createYouTubeCredentialStore({
      root,
      safeStorage: fakeSafeStorage(),
    });
    await store.saveClientId("123456-abcdef.apps.googleusercontent.com");
    await store.saveRefreshToken("refresh-secret-123");

    const encrypted = await fs.readFile(path.join(root, "youtube-refresh-token.bin"));
    assert.equal(encrypted.toString("utf8").includes("refresh-secret-123"), false);
    assert.equal(await store.loadRefreshToken(), "refresh-secret-123");
    assert.deepEqual(await store.status(), {
      configured: true,
      connected: true,
    });
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("changing OAuth client id invalidates the refresh token bound to the prior client", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "toaster-youtube-client-change-"));
  try {
    const store = createYouTubeCredentialStore({
      root,
      safeStorage: fakeSafeStorage(),
    });
    await store.saveClientId("123456-first.apps.googleusercontent.com");
    await store.saveRefreshToken("refresh-secret-123");
    await store.saveClientId("123456-second.apps.googleusercontent.com");

    assert.equal(await store.loadRefreshToken(), null);
    assert.deepEqual(await store.status(), {
      configured: true,
      connected: false,
    });
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("protected token persistence refuses when async OS encryption is unavailable", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "toaster-youtube-no-storage-"));
  try {
    const store = createYouTubeCredentialStore({
      root,
      safeStorage: fakeSafeStorage({ available: false }),
    });
    await assert.rejects(
      () => store.saveRefreshToken("refresh-secret-123"),
      /protected storage/i,
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("resumable upload PUT carries the bearer token as well as the byte range", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "toaster-youtube-auth-put-"));
  const filePath = path.join(root, "tiny.mp4");
  await fs.writeFile(filePath, Buffer.from("abcde"));
  let observedHeaders = null;
  const fetchImpl = async (_url, options) => {
    observedHeaders = options.headers;
    return {
      ok: true,
      status: 201,
      headers: new Headers(),
      json: async () => ({ id: "yt-video-123" }),
      text: async () => JSON.stringify({ id: "yt-video-123" }),
    };
  };

  try {
    const result = await uploadResumableFile({
      sessionUrl: "https://upload.example/session-1",
      accessToken: "access-token",
      filePath,
      sizeBytes: 5,
      mimeType: "video/mp4",
      fetchImpl,
    });
    assert.equal(result.videoId, "yt-video-123");
    assert.equal(observedHeaders.Authorization, "Bearer access-token");
    assert.equal(observedHeaders["Content-Range"], "bytes 0-4/5");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
