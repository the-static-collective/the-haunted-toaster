const CATALOG_SCHEMA = "haunted-toaster/video-pantry-catalog/v1";
const VIDEO_SOURCE_SCHEMA = "haunted-toaster/video-source/v1";

function normalizeSha256(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(normalized)) {
    throw new TypeError("A 64-character SHA-256 hex digest is required.");
  }
  return normalized;
}

function normalizeByteLength(value) {
  const byteLength = Number(value);
  if (!Number.isSafeInteger(byteLength) || byteLength < 0) {
    throw new TypeError("A non-negative safe-integer byte length is required.");
  }
  return byteLength;
}

function canonicalSpecimenId({ sha256, byteLength } = {}) {
  const normalizedSha = normalizeSha256(sha256);
  const normalizedLength = normalizeByteLength(byteLength);
  return `sha256:${normalizedSha}:${normalizedLength}`;
}

module.exports = {
  CATALOG_SCHEMA,
  VIDEO_SOURCE_SCHEMA,
  canonicalSpecimenId,
  normalizeByteLength,
  normalizeSha256,
};
