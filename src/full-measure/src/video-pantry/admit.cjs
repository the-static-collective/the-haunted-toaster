const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { canonicalSpecimenId, VIDEO_SOURCE_SCHEMA } = require("./schema.cjs");
const { loadCatalog, saveCatalog, upsertSpecimen } = require("./catalog.cjs");
const { probeVideo } = require("./probe.cjs");

const SUPPORTED_VIDEO_EXTENSIONS = new Set([".mp4", ".webm"]);

async function hashFile(filePath) {
  const digest = crypto.createHash("sha256");
  let byteLength = 0;
  await new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath);
    stream.on("data", (chunk) => {
      byteLength += chunk.length;
      digest.update(chunk);
    });
    stream.on("error", reject);
    stream.on("end", resolve);
  });
  return { sha256: digest.digest("hex"), byteLength };
}

async function assertSupportedVideo(filePath) {
  if (!filePath || typeof filePath !== "string") throw new Error("Choose a video first.");
  const resolved = path.resolve(filePath);
  if (!SUPPORTED_VIDEO_EXTENSIONS.has(path.extname(resolved).toLowerCase())) {
    throw new Error("VSPantry v1 accepts local MP4 or WebM video only.");
  }
  const stat = await fsp.stat(resolved);
  if (!stat.isFile()) throw new Error("The selected video is not a file.");
  return resolved;
}

async function admitVideo(
  filePath,
  {
    catalogPath,
    persist = true,
    probeVideoImpl = probeVideo,
    hashFileImpl = hashFile,
    observedAt = null,
  } = {},
) {
  const resolved = await assertSupportedVideo(filePath);
  const [{ sha256, byteLength }, probe] = await Promise.all([
    hashFileImpl(resolved),
    probeVideoImpl(resolved),
  ]);
  const specimenId = canonicalSpecimenId({ sha256, byteLength });
  const admittedAt = observedAt ? new Date(observedAt).toISOString() : new Date().toISOString();
  const filename = path.basename(resolved);
  const binding = {
    schema: VIDEO_SOURCE_SCHEMA,
    specimenId,
    sourceSha256: String(sha256).toLowerCase(),
    byteLength: Number(byteLength),
    path: resolved,
    filename,
    probe: structuredClone(probe),
    persisted: persist === true,
  };

  if (persist !== true) {
    return { binding, catalog: null, inserted: false };
  }
  if (!catalogPath) throw new TypeError("A VSPantry catalogue path is required for persistent admission.");

  const catalog = await loadCatalog(catalogPath);
  const specimen = {
    specimenId,
    sourceSha256: binding.sourceSha256,
    byteLength: binding.byteLength,
    filename,
    paths: [resolved],
    probe: structuredClone(probe),
    analysis: { state: "pending", version: null },
    admittedAt,
  };
  const upserted = upsertSpecimen(catalog, specimen);
  const saved = await saveCatalog(catalogPath, upserted.catalog);
  return { binding, catalog: saved, inserted: upserted.inserted };
}

module.exports = {
  SUPPORTED_VIDEO_EXTENSIONS,
  admitVideo,
  assertSupportedVideo,
  hashFile,
};
