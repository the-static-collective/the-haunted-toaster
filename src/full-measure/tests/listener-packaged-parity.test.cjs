const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const pkg = require("../package.json");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

const main = read("src", "main.cjs");
const preload = read("src", "preload.cjs");
const rendererHtml = read("src", "renderer", "index.html");

test("packaged Electron entrypoint includes the active Listener transport assets", () => {
  assert.equal(pkg.main, "src/main.cjs");
  assert.ok(pkg.build.files.includes("src/**/*"));
  assert.match(
    main,
    /loadFile\(path\.join\(__dirname,\s*"renderer",\s*"index\.html"\)\)/,
  );
  assert.match(rendererHtml, /href="\.\/listener-transport\.css"/);
  assert.match(
    rendererHtml,
    /id="syncWaveformHint">Click or drag waveform to seek\./,
  );
  assert.match(rendererHtml, /id="syncTimeReadout"/);
  assert.match(rendererHtml, /src="\.\/lyric-foundry-ui\.js"/);
  assert.match(rendererHtml, /src="\.\/sync-keyboard\.js"/);
});

test("sandboxed preload boots and exposes the renderer bridge without local CommonJS", () => {
  let exposedName = null;
  let exposedBridge = null;
  const sandbox = {
    console,
    document: {
      querySelector() {
        return null;
      },
    },
    window: {
      addEventListener() {},
    },
    require(specifier) {
      if (specifier !== "electron") {
        throw new Error(`sandboxed preload cannot require ${specifier}`);
      }
      return {
        contextBridge: {
          exposeInMainWorld(name, bridge) {
            exposedName = name;
            exposedBridge = bridge;
          },
        },
        ipcRenderer: {
          invoke: async () => null,
          on() {},
          removeListener() {},
        },
        webUtils: {
          getPathForFile() {
            return "";
          },
        },
      };
    },
  };

  vm.runInNewContext(preload, sandbox, { filename: "preload.cjs" });

  assert.equal(exposedName, "fullMeasure");
  assert.equal(typeof exposedBridge?.chooseAudio, "function");
  assert.equal(typeof exposedBridge?.prepareListenerLyrics, "function");
});
