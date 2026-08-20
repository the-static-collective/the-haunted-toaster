const fsp = require("node:fs/promises");
const path = require("node:path");
const { SUPPORTED_VIDEO_EXTENSIONS, admitVideo } = require("./admit.cjs");
const { loadCatalog } = require("./catalog.cjs");

async function listSupportedVideoFiles(folderPath) {
  if (!folderPath || typeof folderPath !== "string") throw new Error("Choose a video folder first.");
  const resolvedFolder = path.resolve(folderPath);
  const stat = await fsp.stat(resolvedFolder);
  if (!stat.isDirectory()) throw new Error("The selected video folder is not a directory.");
  const entries = await fsp.readdir(resolvedFolder, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && SUPPORTED_VIDEO_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => path.join(resolvedFolder, entry.name))
    .sort();
}

function emitProgress(onProgress, payload) {
  if (typeof onProgress !== "function") return;
  try {
    onProgress(Object.freeze({ ...payload }));
  } catch {
    // Progress is observability only. A detached renderer must not abort intake.
  }
}

async function admitVideoFolder(
  folderPath,
  {
    catalogPath,
    admitVideoImpl = admitVideo,
    probeVideoImpl,
    hashFileImpl,
    observedAt = null,
    onProgress = null,
  } = {},
) {
  const files = await listSupportedVideoFiles(folderPath);
  let admitted = 0;
  let duplicates = 0;
  const refused = [];
  const touchedIds = new Set();
  const progress = (phase, index, filename = null, extra = {}) => emitProgress(onProgress, {
    phase,
    total: files.length,
    index,
    filename,
    admitted,
    duplicates,
    refused: refused.length,
    ...extra,
  });

  progress("discovered", 0);

  for (let index = 0; index < files.length; index += 1) {
    const filePath = files[index];
    const filename = path.basename(filePath);
    progress("processing", index + 1, filename);
    try {
      const result = await admitVideoImpl(filePath, {
        catalogPath,
        persist: true,
        probeVideoImpl,
        hashFileImpl,
        observedAt,
      });
      touchedIds.add(result.binding.specimenId);
      if (result.inserted) admitted += 1;
      else duplicates += 1;
    } catch (error) {
      refused.push({
        path: filePath,
        filename,
        error: String(error?.message || error),
      });
    }
    progress("processed", index + 1, filename);
  }

  const catalog = await loadCatalog(catalogPath);
  progress("complete", files.length, null, { catalogSize: catalog.specimens.length });
  return {
    admitted,
    duplicates,
    refused,
    catalogSize: catalog.specimens.length,
    specimenIds: [...touchedIds].sort(),
  };
}

module.exports = {
  admitVideoFolder,
  listSupportedVideoFiles,
};
