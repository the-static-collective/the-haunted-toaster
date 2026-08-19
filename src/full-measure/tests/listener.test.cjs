const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const {
  DEFAULT_PLACEMENT_LEAD_SECONDS,
  autoSyncLyrics,
  discoverLyricSidecar,
  saveLyricSidecar,
  sidecarPathForAudio,
  whisperProgress,
} = require("../src/align/auto-sync.cjs");
const {
  MODEL_BYTES,
  MODEL_FILENAME,
  listenerPackStatus,
  packDirectory,
  validateArchiveEntries,
} = require("../src/align/listener-pack.cjs");

test("rejects archive entries that could escape the Listener directory", () => {
  assert.deepEqual(
    validateArchiveEntries(
      [
        "Release/",
        "Release/whisper-cli.exe",
        "Release/whisper.dll",
      ].join("\n"),
    ),
    [
      "Release/",
      "Release/whisper-cli.exe",
      "Release/whisper.dll",
    ],
  );
  assert.throws(
    () => validateArchiveEntries("../escape.exe"),
    /unsafe path/,
  );
  assert.throws(
    () => validateArchiveEntries("C:\\escape.exe"),
    /unsafe path/,
  );
  assert.throws(
    () => validateArchiveEntries("/absolute/escape.exe"),
    /unsafe path/,
  );
});

test("recognizes a complete managed listener pack without loading the model", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "listener-status-"));
  const pack = packDirectory(root);
  const binary = path.join(pack, "bin", "Release", "whisper-cli.exe");
  const model = path.join(pack, "model", MODEL_FILENAME);
  try {
    await fs.mkdir(path.dirname(binary), { recursive: true });
    await fs.mkdir(path.dirname(model), { recursive: true });
    await fs.writeFile(binary, "fixture");
    await fs.writeFile(model, "");
    await fs.truncate(model, MODEL_BYTES);

    const status = await listenerPackStatus(root, "win32", "x64");
    assert.equal(status.ready, true);
    assert.equal(status.source, "managed");
    assert.equal(status.binaryPath, binary);
    assert.equal(status.modelPath, model);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("auto-sync runs a private listening pass and returns editable LRC", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "listener-run-"));
  const audioPath = path.join(root, "receipt-song.wav");
  await fs.writeFile(audioPath, "fixture");
  const phases = [];
  let observedArguments = null;

  try {
    const result = await autoSyncLyrics(
      {
        audioPath,
        lyrics: [
          "[Verse]",
          "The spoon remembers",
          "The porch light stays",
        ].join("\n"),
        duration: 8,
        title: "Receipt Song",
        artist: "The Static Collective",
        pack: {
          ready: true,
          binaryPath: path.join(root, "whisper-cli.exe"),
          modelPath: path.join(root, "model.bin"),
          source: "fixture",
          modelId: "fixture-model",
          whisperCppVersion: "fixture",
        },
      },
      {
        async prepareAudio(_source, output) {
          await fs.writeFile(output, "prepared fixture");
        },
        async runListener(_binary, args, options) {
          observedArguments = args;
          const prefix = args[args.indexOf("-of") + 1];
          await fs.writeFile(
            `${prefix}.json`,
            JSON.stringify({
              transcription: [
                {
                  text: "the spoon remembers",
                  offsets: { from: 1000, to: 2500 },
                  tokens: [{ p: 0.9 }],
                },
                {
                  text: "the porch lights stay",
                  offsets: { from: 4000, to: 5600 },
                  tokens: [{ p: 0.82 }],
                },
              ],
            }),
          );
          options.onStderr?.("whisper progress = 100%\n");
          return { stdout: "", stderr: "", code: 0 };
        },
        onPhase(phase) {
          phases.push(phase);
        },
      },
    );

    assert.ok(observedArguments.includes("-ojf"));
    assert.ok(observedArguments.includes("-ml"));
    assert.deepEqual(phases, ["preparing", "listening", "matching", "ready"]);
    assert.equal(result.matchedCount, 2);
    assert.equal(DEFAULT_PLACEMENT_LEAD_SECONDS, 0);
    assert.match(result.lrc, /\[00:01\.00\]The spoon remembers/);
    assert.match(result.lrc, /\[00:04\.00\]The porch light stays/);
    assert.equal(result.engine.source, "fixture");
    assert.equal(result.engine.placementLeadSeconds, 0);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("same-named LRC sidecars are discovered and never overwritten silently", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "listener-sidecar-"));
  const audioPath = path.join(root, "song.mp3");
  const expectedPath = path.join(root, "song.lrc");
  try {
    await fs.writeFile(audioPath, "audio");
    assert.equal(sidecarPathForAudio(audioPath), expectedPath);

    const first = await saveLyricSidecar(
      audioPath,
      "[00:01.00]First witness\n",
    );
    assert.equal(first.saved, true);
    const discovered = await discoverLyricSidecar(audioPath);
    assert.equal(discovered.path, expectedPath);
    assert.match(discovered.content, /First witness/);

    const protectedWrite = await saveLyricSidecar(
      audioPath,
      "[00:02.00]Replacement\n",
    );
    assert.equal(protectedWrite.saved, false);
    assert.equal(protectedWrite.exists, true);
    assert.match(await fs.readFile(expectedPath, "utf8"), /First witness/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("extracts whisper progress without trusting unrelated numbers", () => {
  assert.equal(whisperProgress("progress = 42%"), 42);
  assert.equal(whisperProgress("model 100 MB"), null);
  assert.equal(whisperProgress("5% then 110%"), 100);
});
