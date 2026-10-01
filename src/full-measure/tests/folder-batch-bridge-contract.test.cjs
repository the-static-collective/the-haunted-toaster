const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..", "src");

test("BATCH-001 production bridge is registered and exposed through preload", () => {
  const main = fs.readFileSync(path.join(root, "main.cjs"), "utf8");
  const preload = fs.readFileSync(path.join(root, "preload.cjs"), "utf8");

  assert.match(main, /registerFolderBatchIpc/);
  assert.match(main, /videoPantryCatalogPath/);
  assert.match(preload, /chooseBatchFolder/);
  assert.match(preload, /startBatch/);
  assert.match(preload, /activateBatchTrack/);
  assert.match(preload, /acceptBatchTrack/);
  assert.match(preload, /closeBatch/);
  assert.match(preload, /clearBatch/);
});
