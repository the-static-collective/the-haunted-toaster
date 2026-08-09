const crypto = require("node:crypto");
const fs = require("node:fs");
const fsPromises = require("node:fs/promises");
const path = require("node:path");

async function hashFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

function receiptPathFor(outputPath) {
  const parsed = path.parse(outputPath);
  return path.join(parsed.dir, `${parsed.name}.video-receipt.json`);
}

function buildProvenance() {
  // Lazy loading avoids a renderer/build-capabilities CommonJS cycle while
  // still stamping the exact build identity at the point the receipt exists.
  const buildInfo = require("../build-info.cjs");
  return Object.freeze({
    version: buildInfo.version,
    commit: buildInfo.commit,
    dirty: Boolean(buildInfo.dirty),
    builtAt: buildInfo.builtAt || null,
    sourceMode: Boolean(buildInfo.sourceMode),
  });
}

async function writeReceipt(receipt, outputPath) {
  receipt.build = buildProvenance();
  const receiptPath = receiptPathFor(outputPath);
  await fsPromises.writeFile(
    receiptPath,
    `${JSON.stringify(receipt, null, 2)}\n`,
    "utf8",
  );
  return receiptPath;
}

module.exports = {
  buildProvenance,
  hashFile,
  receiptPathFor,
  writeReceipt,
};
