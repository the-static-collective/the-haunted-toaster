const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const main = read("src", "main.cjs");
const candidateSession = read("src", "candidate-session.cjs");
const renderer = read("src", "render", "render.cjs");

test("MEMORY-001 app wiring closes successful render -> archive -> future generation loop", () => {
  assert.match(main, /createMemoryService/);
  assert.match(main, /toaster-memory-v1/);
  assert.match(main, /createCandidateSession\(\{ memoryProvider: memoryService \}\)/);

  const renderStart = main.indexOf('ipcMain.handle("render:start"');
  const renderCancel = main.indexOf('ipcMain.handle("render:cancel"');
  const block = main.slice(renderStart, renderCancel);
  const renderIndex = block.indexOf("await renderVideo(");
  const archiveIndex = block.indexOf("await memoryService.archiveSuccessfulRender(renderResult)");
  assert.ok(renderIndex >= 0);
  assert.ok(archiveIndex > renderIndex);
  assert.match(block, /memoryArchive = \{\s*ok: false/);
  assert.match(block, /return \{ \.\.\.renderResult, memoryArchive \}/);
});

test("MEMORY-001 candidate-session uses memory only as proposal-time influence evidence", () => {
  assert.match(candidateSession, /memoryProvider\.contextForGeneration/);
  assert.match(candidateSession, /memoryPrism: memoryContext\?\.prism \|\| null/);
  assert.match(candidateSession, /memoryPrism:\s*structuredClone\(candidate\.memoryPrismSeat\)/);
  assert.match(candidateSession, /buildInfluenceTrace\(\{/);
});

test("MEMORY-001 renderer never receives ambient memory state as creative authority", () => {
  assert.doesNotMatch(renderer, /memoryContext/);
  assert.doesNotMatch(renderer, /memoryPrism/);
  assert.doesNotMatch(renderer, /toaster-memory-influence/);
});
