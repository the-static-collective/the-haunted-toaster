const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const preload = fs.readFileSync(
  path.resolve(__dirname, "../src/preload.cjs"),
  "utf8",
);

test("preload exposes explicit KEEP and SCRAPE bridges without removing focus/debug selection", () => {
  assert.match(
    preload,
    /keepCandidate:\s*\(config\)\s*=>\s*ipcRenderer\.invoke\("candidate:keep",\s*config\)/,
    "KEEP must cross an explicit candidate:keep IPC boundary",
  );
  assert.match(
    preload,
    /scrapeCandidates:\s*\(config\)\s*=>\s*ipcRenderer\.invoke\("candidate:scrape",\s*config\)/,
    "SCRAPE must cross an explicit candidate:scrape IPC boundary",
  );
  assert.match(
    preload,
    /selectCandidate:\s*\(config\)\s*=>\s*ipcRenderer\.invoke\("candidate:select",\s*config\)/,
    "focus/select remains available as an observational or expert/debug bridge",
  );
});
