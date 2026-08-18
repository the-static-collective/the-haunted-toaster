const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const main = read("src", "main.cjs");
const preload = read("src", "preload.cjs");
const render = read("src", "render", "render.cjs");

const CHANNELS = [
  "memory:list-past-toasts",
  "memory:get-past-toast",
  "memory:submit-verdict",
  "memory:arm-retoast",
  "memory:clear-retoast",
  "memory:current-influence-trace",
  "memory:open-artifact",
];

test("Electron main owns one local memory service and registers only narrow memory channels", () => {
  assert.match(main, /createMemoryService/);
  assert.match(main, /path\.join\(app\.getPath\("userData"\),\s*"toaster-memory-v1"\)/);
  assert.match(main, /createCandidateSession\(\{\s*memoryProvider:\s*memoryService\s*\}\)/);
  for (const channel of CHANNELS) {
    assert.ok(main.includes(`ipcMain.handle("${channel}"`), `missing ${channel}`);
  }
  assert.doesNotMatch(main, /ipcMain\.handle\("memory:open-artifact"[\s\S]{0,700}config\?\.path/);
  assert.match(main, /memoryService\.resolveArtifact\(\{[\s\S]{0,240}receiptSha256:[\s\S]{0,120}kind:/);
});

test("successful render archives after canonical render and archive failure cannot revoke success", () => {
  const start = main.indexOf('ipcMain.handle("render:start"');
  const cancel = main.indexOf('ipcMain.handle("render:cancel"');
  const block = main.slice(start, cancel);
  const renderIndex = block.indexOf("await renderVideo(");
  const archiveIndex = block.indexOf("await memoryService.archiveSuccessfulRender(");
  assert.ok(renderIndex >= 0, "renderVideo call missing");
  assert.ok(archiveIndex > renderIndex, "archive must happen only after renderVideo succeeds");
  assert.match(block, /let memoryArchive = null/);
  assert.match(block, /catch \(error\)[\s\S]{0,320}memoryArchive = \{[\s\S]{0,160}ok:\s*false/);
  assert.match(block, /recordWitnessEncounter/);
  assert.match(block, /return \{ \.\.\.renderResult, memoryArchive \}/);
});

test("memory metadata remains outside full-measure.video-receipt.v1 serialization", () => {
  assert.doesNotMatch(render, /memoryContext/);
  assert.doesNotMatch(render, /reToastAncestor/);
  assert.doesNotMatch(render, /human-verdict/);
  assert.doesNotMatch(render, /influence-trace/);
});

test("sandboxed preload exposes structured memory bridge methods without local filesystem authority", () => {
  let exposedBridge = null;
  const invoked = [];
  const sandbox = {
    console,
    document: { querySelector() { return null; } },
    window: { addEventListener() {} },
    require(specifier) {
      if (specifier !== "electron") throw new Error(`sandboxed preload cannot require ${specifier}`);
      return {
        contextBridge: {
          exposeInMainWorld(_name, bridge) { exposedBridge = bridge; },
        },
        ipcRenderer: {
          invoke: async (...args) => { invoked.push(args); return null; },
          on() {},
          removeListener() {},
        },
        webUtils: { getPathForFile() { return ""; } },
      };
    },
  };
  vm.runInNewContext(preload, sandbox, { filename: "preload.cjs" });

  for (const method of [
    "listPastToasts",
    "getPastToast",
    "submitToastVerdict",
    "armReToast",
    "clearReToast",
    "getCurrentInfluenceTrace",
    "openPastToastArtifact",
  ]) {
    assert.equal(typeof exposedBridge?.[method], "function", `missing preload method ${method}`);
  }
  exposedBridge.openPastToastArtifact({ receiptSha256: "a".repeat(64), kind: "receipt", reveal: false });
  assert.equal(invoked.at(-1)[0], "memory:open-artifact");
  assert.deepEqual(Object.keys(invoked.at(-1)[1]).sort(), ["kind", "receiptSha256", "reveal"]);
});
