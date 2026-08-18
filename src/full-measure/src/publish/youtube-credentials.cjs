const fs = require("node:fs/promises");
const path = require("node:path");

const CLIENT_ID_FILENAME = "youtube-client-id.txt";
const REFRESH_TOKEN_FILENAME = "youtube-refresh-token.bin";

function validateDesktopClientId(value) {
  const clientId = String(value || "").trim();
  if (
    clientId.length < 10 ||
    clientId.length > 256 ||
    !/^[A-Za-z0-9._-]+\.apps\.googleusercontent\.com$/.test(clientId)
  ) {
    throw new Error("Enter a valid Google desktop OAuth client ID.");
  }
  return clientId;
}

function createYouTubeCredentialStore({ root, safeStorage, fsImpl = fs }) {
  if (!root || typeof root !== "string") {
    throw new Error("YouTube credential storage requires an application data directory.");
  }
  if (!safeStorage) {
    throw new Error("YouTube credential storage requires Electron protected storage.");
  }

  const clientIdPath = path.join(root, CLIENT_ID_FILENAME);
  const refreshTokenPath = path.join(root, REFRESH_TOKEN_FILENAME);

  async function ensureRoot() {
    await fsImpl.mkdir(root, { recursive: true });
  }

  async function loadClientId() {
    try {
      const value = await fsImpl.readFile(clientIdPath, "utf8");
      return validateDesktopClientId(value);
    } catch (error) {
      if (error?.code === "ENOENT") return null;
      throw error;
    }
  }

  async function clearRefreshToken() {
    await fsImpl.rm(refreshTokenPath, { force: true });
    return true;
  }

  async function saveClientId(value) {
    const clientId = validateDesktopClientId(value);
    const existing = await loadClientId();
    await ensureRoot();
    if (existing && existing !== clientId) {
      await clearRefreshToken();
    }
    await fsImpl.writeFile(clientIdPath, `${clientId}\n`, "utf8");
    return clientId;
  }

  async function protectedStorageAvailable() {
    if (typeof safeStorage.isAsyncEncryptionAvailable !== "function") return false;
    try {
      return await safeStorage.isAsyncEncryptionAvailable();
    } catch {
      return false;
    }
  }

  async function saveRefreshToken(value) {
    const refreshToken = String(value || "");
    if (!refreshToken) throw new Error("A YouTube refresh token is required.");
    if (!(await protectedStorageAvailable())) {
      throw new Error("Protected storage is unavailable; YouTube credentials were not saved.");
    }
    if (typeof safeStorage.encryptStringAsync !== "function") {
      throw new Error("Protected storage cannot encrypt YouTube credentials on this system.");
    }

    const encrypted = await safeStorage.encryptStringAsync(refreshToken);
    if (!Buffer.isBuffer(encrypted) || encrypted.length === 0) {
      throw new Error("Protected storage returned no encrypted YouTube credential material.");
    }
    await ensureRoot();
    await fsImpl.writeFile(refreshTokenPath, encrypted);
    return true;
  }

  async function loadRefreshToken() {
    let encrypted;
    try {
      encrypted = await fsImpl.readFile(refreshTokenPath);
    } catch (error) {
      if (error?.code === "ENOENT") return null;
      throw error;
    }

    if (!(await protectedStorageAvailable())) return null;
    if (typeof safeStorage.decryptStringAsync !== "function") return null;

    const decrypted = await safeStorage.decryptStringAsync(encrypted);
    const refreshToken = String(decrypted?.result || "");
    if (!refreshToken) return null;

    if (decrypted?.shouldReEncrypt === true) {
      await saveRefreshToken(refreshToken);
    }
    return refreshToken;
  }

  async function status() {
    const [clientId, refreshToken] = await Promise.all([
      loadClientId(),
      loadRefreshToken(),
    ]);
    return {
      configured: Boolean(clientId),
      connected: Boolean(clientId && refreshToken),
    };
  }

  return Object.freeze({
    clearRefreshToken,
    loadClientId,
    loadRefreshToken,
    saveClientId,
    saveRefreshToken,
    status,
  });
}

module.exports = {
  CLIENT_ID_FILENAME,
  REFRESH_TOKEN_FILENAME,
  createYouTubeCredentialStore,
  validateDesktopClientId,
};
