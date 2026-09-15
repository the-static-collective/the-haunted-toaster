const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const preloadPath = path.join(root, "src", "preload.cjs");
const preloadSource = fs.readFileSync(preloadPath, "utf8");

function loadPreload(onInvoke) {
  let exposed = null;
  const ipcRenderer = {
    invoke: (...args) => onInvoke(...args),
    on() {},
    removeListener() {},
    sendSync() {
      return { prepared: [] };
    },
  };
  const electron = {
    contextBridge: {
      exposeInMainWorld(name, api) {
        assert.equal(name, "fullMeasure");
        exposed = api;
      },
    },
    ipcRenderer,
    webUtils: {
      getPathForFile() {
        return "";
      },
    },
  };
  const sandbox = {
    require(specifier) {
      if (specifier === "electron") return electron;
      throw new Error(`Unexpected preload dependency: ${specifier}`);
    },
    window: { addEventListener() {} },
    document: { querySelector() { return null; } },
    console,
    setTimeout,
    clearTimeout,
  };

  vm.runInNewContext(
    `(function(require) {\n${preloadSource}\n})(require);`,
    sandbox,
    { filename: preloadPath },
  );

  assert.ok(exposed);
  return exposed;
}

function humanAnchor(lineId, mediaTimeMs) {
  return {
    lineId,
    mediaTimeMs,
    source: "human-edit",
    anchorVersion: "lyric-anchor/v1",
  };
}

test("preload refuses a Re-listen result that moves or drops a staged human anchor", async () => {
  const anchor = humanAnchor("lyric-anchor-a", 12_345);
  const api = loadPreload(async (channel, payload) => {
    assert.equal(channel, "lyrics:auto-sync");
    assert.deepEqual(JSON.parse(JSON.stringify(payload.anchors)), [anchor]);
    return {
      cues: [
        {
          lineId: anchor.lineId,
          start: 12.7,
          status: "human",
          humanCorrected: true,
        },
      ],
    };
  });

  api.stageListenerEvidence({ anchors: [anchor], previousEvidence: [] });

  await assert.rejects(
    () => api.autoSyncLyrics({ audioPath: "C:/fixture.wav", lyrics: "Anchor A" }),
    /human anchor.*not held/i,
  );
});

test("preload admits a Re-listen result only when every staged human anchor returns at the exact millisecond", async () => {
  const anchors = [
    humanAnchor("lyric-anchor-a", 12_345),
    humanAnchor("lyric-anchor-b", 54_270),
  ];
  const api = loadPreload(async (channel, payload) => {
    assert.equal(channel, "lyrics:auto-sync");
    assert.deepEqual(JSON.parse(JSON.stringify(payload.anchors)), anchors);
    return {
      cues: [
        {
          lineId: anchors[0].lineId,
          start: 12.345,
          status: "human",
          humanCorrected: true,
        },
        {
          lineId: "machine-neighbor",
          start: 33.1,
          status: "high",
          humanCorrected: false,
        },
        {
          lineId: anchors[1].lineId,
          start: 54.27,
          status: "human",
          humanCorrected: true,
        },
      ],
    };
  });

  api.stageListenerEvidence({ anchors, previousEvidence: [] });
  const result = await api.autoSyncLyrics({
    audioPath: "C:/fixture.wav",
    lyrics: "Anchor A\nMachine neighbor\nAnchor B",
  });

  assert.equal(result.cues[0].start, 12.345);
  assert.equal(result.cues[2].start, 54.27);
});