const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { JSDOM } = require("jsdom");
const { listToastFeels } = require("../src/toast-feels.cjs");

const root = path.resolve(__dirname, "..");
const rendererRoot = path.join(root, "src", "renderer");
const html = fs.readFileSync(path.join(rendererRoot, "index.html"), "utf8");

function tick(milliseconds = 0) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function candidateFamily() {
  return {
    familyHash: "family-1",
    producedCount: 1,
    requestedCount: 6,
    shortfall: true,
    candidates: [
      {
        index: 0,
        role: "baseline",
        signature: "open-field-proof",
        scoreAddress: "sha256:renderer-ui-proof",
        thumbnailDataUrl: "data:image/png;base64,",
        changedAxes: [],
      },
    ],
  };
}

function buildRenderer(overrides = {}) {
  const calls = {
    candidates: [],
    renders: [],
    formats: [],
    saves: [],
  };
  const dom = new JSDOM(html, {
    runScripts: "outside-only",
    url: "file:///haunted-toaster/index.html",
  });
  const { window } = dom;

  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.HTMLMediaElement.prototype.pause = () => {};
  window.HTMLMediaElement.prototype.play = () => Promise.resolve();
  window.HTMLCanvasElement.prototype.getContext = () => ({
    clearRect() {},
    fillRect() {},
    createLinearGradient: () => ({ addColorStop() {} }),
    fillStyle: "",
    globalAlpha: 1,
  });

  const noopSubscription = () => () => {};
  window.fullMeasure = {
    chooseAudio: async () => "/music/specimen.wav",
    chooseImage: async () => null,
    chooseLyrics: async () => null,
    chooseOutput: async () => "/output/specimen.mp4",
    inspectAudio: async () => ({
      filename: "specimen.wav",
      sizeBytes: 2048,
      duration: 30,
      audio: { sampleRate: 48000, channels: 2, codec: "pcm_s16le" },
      sections: [{ start: 0, end: 30, energy: 0.5, label: "field" }],
      energySamples: [{ db: -12 }],
    }),
    fileUrl: async () => "file:///music/specimen.wav",
    inspectLyrics: async (value) => ({
      timed: /^\[\d/.test(value),
      cueCount: value.trim() ? value.trim().split(/\n+/).length : 0,
      sourceFormat: /^\[\d/.test(value) ? "lrc" : "plain",
    }),
    discoverLyricSidecar: async () => null,
    listenerStatus: async () => ({ ready: true, installSupported: true, downloadBytes: 0 }),
    autoSyncLyrics: async () => ({
      engine: { source: "local-listener" },
      cues: [
        { text: "placed", start: 1.25, end: 2.5, status: "high", confidence: 0.98 },
        { text: "unresolved", start: null, end: null, status: "unmatched", confidence: 0 },
      ],
    }),
    formatLrc: async (config) => {
      calls.formats.push(config);
      return "[00:01.25]placed";
    },
    saveLyricSidecar: async (...args) => {
      calls.saves.push(args);
      return { saved: true, path: "/music/specimen.lrc" };
    },
    generateCandidates: async (config) => {
      calls.candidates.push(config);
      return candidateFamily();
    },
    mutateCandidates: async () => candidateFamily(),
    selectCandidate: async () => ({}),
    clearCandidates: async () => {},
    clearCandidateImage: async () => {},
    startRender: async (config) => {
      calls.renders.push(config);
      return {
        outputPath: "/output/specimen.mp4",
        receipt: {
          output: { sizeBytes: 4096 },
          validation: { durationDeltaMilliseconds: 0 },
        },
      };
    },
    cancelRender: async () => {},
    cancelListenerInstall: async () => {},
    cancelLyricSync: async () => {},
    manualLyricTrack: async () => ({ cues: [], engine: { source: "human" } }),
    installListener: async () => ({ ready: true }),
    openFile() {},
    revealFile() {},
    getVersion: async () => "0.5.0-alpha.6",
    getBuildInfo: async () => ({
      version: "0.5.0-alpha.6",
      commit: "test",
      sourceMode: true,
      rendererProfileGeneration: "test",
      capabilities: [],
    }),
    getToastFeels: async () => listToastFeels(),
    onPhase: noopSubscription,
    onProgress: noopSubscription,
    onListenerInstallProgress: noopSubscription,
    onLyricSyncPhase: noopSubscription,
    onLyricSyncProgress: noopSubscription,
    ...overrides,
  };

  for (const script of [
    "toast-feel-controller.js",
    "app.js",
    "candidate-ui.js",
    "lyric-foundry-ui.js",
    "sync-keyboard.js",
  ]) {
    window.eval(fs.readFileSync(path.join(rendererRoot, script), "utf8"));
  }

  return { dom, window, document: window.document, calls };
}

async function loadSong(document) {
  document.querySelector("#audioDrop").click();
  await tick();
  await tick();
}

function setMediaState(audio, { duration, currentTime = 0, paused = true }) {
  Object.defineProperty(audio, "duration", {
    configurable: true,
    value: duration,
  });
  Object.defineProperty(audio, "paused", {
    configurable: true,
    value: paused,
  });
  audio.currentTime = currentTime;
}

function pointerEvent(window, type, { clientX, pointerId = 1, button = 0 }) {
  const event = new window.MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX,
    button,
  });
  Object.defineProperty(event, "pointerId", { value: pointerId });
  return event;
}

test("raw renderer markup is a truthful host with no retired garment furniture", () => {
  const dom = new JSDOM(html);
  const slate = dom.window.document.querySelector("#slateToastFeel");
  assert.equal(slate.textContent.trim(), "Loading…");
  assert.equal(slate.previousElementSibling.textContent.trim(), "Toast Feel");
  assert.ok(dom.window.document.querySelector("#toastFeelChoices"));
  assert.equal(dom.window.document.querySelectorAll(".garment-card").length, 0);
  dom.window.close();
});

test("manifest-driven Toast Feel identity is shared by six-up and render", async () => {
  const harness = buildRenderer();
  const { document, window, calls } = harness;
  try {
    await tick();
    assert.equal(document.querySelectorAll(".toast-feel").length, 7);
    assert.equal(window.toastFeel.getToastFeelId(), "low-and-slow");
    assert.equal(document.querySelector("#slateToastFeel").textContent, "Low & Slow");

    const wireHeat = document.querySelector('[data-toast-feel-id="wire-heat"]');
    wireHeat.click();
    assert.equal(window.toastFeel.getToastFeelId(), "wire-heat");
    assert.equal(wireHeat.getAttribute("aria-checked"), "true");
    assert.equal(document.querySelector("#slateToastFeel").textContent, "Wire Heat");

    await loadSong(document);
    document.querySelector(".candidate-launch").click();
    await tick();
    document.querySelector("#renderButton").click();
    await tick();

    assert.equal(calls.candidates.length, 1);
    assert.equal(calls.renders.length, 1);
    assert.equal(calls.candidates[0].presetId, "openField");
    assert.equal(calls.renders[0].presetId, calls.candidates[0].presetId);
    assert.equal(calls.candidates[0].toastFeelId, "wire-heat");
    assert.equal(calls.renders[0].toastFeelId, calls.candidates[0].toastFeelId);
  } finally {
    harness.dom.window.close();
  }
});

test("Toast Feel selection publishes canonical manifest evidence, not edited DOM copy", async () => {
  const harness = buildRenderer();
  const { document, window } = harness;
  try {
    await tick();
    let detail = null;
    window.addEventListener("toast-feel-change", (event) => { detail = event.detail; });
    const ashBloom = document.querySelector('[data-toast-feel-id="ash-bloom"]');
    ashBloom.querySelector("strong").textContent = "DOM impostor";
    ashBloom.click();
    assert.deepEqual(JSON.parse(JSON.stringify(detail)), {
      id: "ash-bloom",
      name: "Ash Bloom",
      contractVersion: "toast-feel-v1",
      semanticClass: "ordinary",
    });
  } finally {
    harness.dom.window.close();
  }
});

test("partial lyric acceptance is single-flight and admits finite cues once", async () => {
  const harness = buildRenderer({
    formatLrc: async (config) => {
      harness.calls.formats.push(config);
      await tick(25);
      return "[00:01.25]placed";
    },
  });
  const { document, window, calls } = harness;
  try {
    await loadSong(document);
    const lyrics = document.querySelector("#lyricsInput");
    lyrics.value = "placed\nunresolved";
    lyrics.dispatchEvent(new window.Event("input", { bubbles: true }));
    await tick(170);
    document.querySelector("#lyricsAutoSync").click();
    await tick();
    await tick();

    const accept = document.querySelector("#syncAccept");
    accept.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    accept.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    await tick();
    assert.equal(calls.formats.length, 1);
    assert.equal(calls.formats[0].cues.length, 1);
    assert.equal(calls.formats[0].cues[0].text, "placed");

    await tick(35);
    assert.equal(calls.saves.length, 1);
    assert.equal(document.querySelector("#syncDialog").classList.contains("is-hidden"), true);
  } finally {
    harness.dom.window.close();
  }
});

for (const failurePoint of ["format", "save"]) {
  test(`${failurePoint} failure stays visible and keeps the Listener alive`, async () => {
    const overrides = failurePoint === "format"
      ? { formatLrc: async () => { throw new Error("format refused"); } }
      : { saveLyricSidecar: async () => { throw new Error("save refused"); } };
    const harness = buildRenderer(overrides);
    const { document, window } = harness;
    try {
      await loadSong(document);
      const lyrics = document.querySelector("#lyricsInput");
      lyrics.value = "placed\nunresolved";
      lyrics.dispatchEvent(new window.Event("input", { bubbles: true }));
      await tick(170);
      document.querySelector("#lyricsAutoSync").click();
      await tick();
      await tick();
      document.querySelector("#syncAccept").click();
      await tick();
      await tick();

      assert.equal(document.querySelector("#syncDialog").classList.contains("is-hidden"), false);
      assert.equal(document.querySelector("#errorCard").classList.contains("is-hidden"), false);
      assert.match(document.querySelector("#errorMessage").textContent, /still open so you can retry/);
      assert.equal(document.querySelector("#syncAccept").disabled, false);
    } finally {
      harness.dom.window.close();
    }
  });
}

test("Listener waveform advertises an accessible seek transport", () => {
  const harness = buildRenderer();
  const { document } = harness;
  try {
    const waveform = document.querySelector("#syncWaveform");
    const hint = document.querySelector("#syncWaveformHint");
    const readout = document.querySelector("#syncTimeReadout");

    assert.equal(waveform.getAttribute("role"), "slider");
    assert.equal(waveform.getAttribute("tabindex"), "0");
    assert.match(waveform.getAttribute("aria-label") || "", /seek/i);
    assert.equal(hint?.textContent.trim(), "Click or drag waveform to seek.");
    assert.equal(readout?.textContent.trim(), "0:00 / 0:00");
  } finally {
    harness.dom.window.close();
  }
});

test("Listener waveform pointer drag captures, scrubs, and clamps", async () => {
  const harness = buildRenderer();
  const { document, window } = harness;
  try {
    await loadSong(document);
    const waveform = document.querySelector("#syncWaveform");
    const audio = document.querySelector("#syncAudio");
    setMediaState(audio, { duration: 30, currentTime: 0 });
    waveform.getBoundingClientRect = () => ({ left: 100, width: 200 });

    const captured = [];
    const released = [];
    waveform.setPointerCapture = (pointerId) => captured.push(pointerId);
    waveform.releasePointerCapture = (pointerId) => released.push(pointerId);

    waveform.dispatchEvent(pointerEvent(window, "pointerdown", {
      clientX: 150,
      pointerId: 7,
    }));
    assert.equal(audio.currentTime, 7.5);
    assert.deepEqual(captured, [7]);

    waveform.dispatchEvent(pointerEvent(window, "pointermove", {
      clientX: 340,
      pointerId: 7,
    }));
    assert.equal(audio.currentTime, 30);

    waveform.dispatchEvent(pointerEvent(window, "pointermove", {
      clientX: 20,
      pointerId: 7,
    }));
    assert.equal(audio.currentTime, 0);

    waveform.dispatchEvent(pointerEvent(window, "pointerup", {
      clientX: 20,
      pointerId: 7,
    }));
    assert.deepEqual(released, [7]);
  } finally {
    harness.dom.window.close();
  }
});

test("Listener waveform click updates playback, playhead, and live time together", async () => {
  const harness = buildRenderer();
  const { document, window } = harness;
  try {
    await loadSong(document);
    const waveform = document.querySelector("#syncWaveform");
    const audio = document.querySelector("#syncAudio");
    const playhead = document.querySelector("#syncPlayhead");
    const readout = document.querySelector("#syncTimeReadout");
    setMediaState(audio, { duration: 30, currentTime: 0 });
    waveform.getBoundingClientRect = () => ({ left: 100, width: 200 });

    waveform.dispatchEvent(new window.MouseEvent("click", {
      bubbles: true,
      clientX: 200,
    }));

    assert.equal(audio.currentTime, 15);
    assert.equal(playhead.style.left, "50%");
    assert.equal(readout?.textContent.trim(), "0:15 / 0:30");
  } finally {
    harness.dom.window.close();
  }
});

test("Listener waveform keyboard seeks by steps and boundaries", async () => {
  const harness = buildRenderer();
  const { document, window } = harness;
  try {
    await loadSong(document);
    const waveform = document.querySelector("#syncWaveform");
    const audio = document.querySelector("#syncAudio");
    setMediaState(audio, { duration: 30, currentTime: 10 });

    waveform.dispatchEvent(new window.KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "ArrowRight",
    }));
    assert.equal(audio.currentTime, 15);

    waveform.dispatchEvent(new window.KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "ArrowLeft",
    }));
    assert.equal(audio.currentTime, 10);

    waveform.dispatchEvent(new window.KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "End",
    }));
    assert.equal(audio.currentTime, 30);

    waveform.dispatchEvent(new window.KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Home",
    }));
    assert.equal(audio.currentTime, 0);
  } finally {
    harness.dom.window.close();
  }
});
