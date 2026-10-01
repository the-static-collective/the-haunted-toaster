const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const root = path.resolve(__dirname, "..");
const rendererRoot = path.join(root, "src", "renderer");
const html = fs.readFileSync(path.join(rendererRoot, "index.html"), "utf8");

function tick() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function familySnapshot(label = "album") {
  return {
    familyHash: `family-${label}`,
    scoreAddresses: Array.from({ length: 6 }, (_, index) => `htvs1_${label}_${index + 1}`),
    candidates: Array.from({ length: 6 }, (_, index) => ({
      index,
      scoreAddress: `htvs1_${label}_${index + 1}`,
      signature: `${label}-creature-${index + 1}`,
      role: index === 0 ? "baseline" : "coverage",
      changedAxes: index ? ["topology"] : [],
      thumbnailDataUrl: "data:image/png;base64,",
    })),
  };
}

function batchContext({ cursor = 0, complete = false } = {}) {
  if (complete) {
    return {
      stateSha256: "state-complete",
      cursor,
      complete: true,
      context: null,
    };
  }
  return {
    stateSha256: `state-${cursor}`,
    cursor,
    complete: false,
    context: {
      cursor,
      temporalContext: {
        present: {
          prophecy: {
            role: cursor === 0 ? "OPEN" : "CLOSE",
            focusApertures: cursor === 0 ? ["BODY", "TIME"] : ["COLOR", "EYE"],
          },
        },
      },
      materialProposal: {
        availableImageAssetIds: ["image-1", "image-2", "image-3"],
        availableVideoSpecimenIds: ["video-1", "video-2"],
        suggestedImageAssetId: "image-1",
        suggestedVideoSpecimenId: "video-1",
      },
    },
  };
}

function harness() {
  const dom = new JSDOM(html, {
    runScripts: "outside-only",
    url: "file:///haunted-toaster/index.html",
  });
  const { window } = dom;
  const { document } = window;

  const calls = {
    chooseFolder: 0,
    prime: 0,
    start: [],
    activate: [],
    apply: [],
    accept: [],
    close: 0,
    generated: [],
    candidateClose: 0,
    candidateOpen: 0,
  };

  const manifest = {
    manifestSha256: "manifest-batch-309",
    folderPath: "/album",
    folderName: "Future Record",
    trackCount: 2,
    imageCount: 3,
    localVideoCount: 1,
    ignoredCount: 0,
    pantryVideoCount: 2,
    tracks: [
      { trackIndex: 0, trackId: "01-open.wav", relativePath: "01-open.wav" },
      { trackIndex: 1, trackId: "02-close.wav", relativePath: "02-close.wav" },
    ],
    images: [],
    localVideos: [{
      relativePath: "raw-loop.mp4",
      status: "present-not-admitted",
      authority: "none-until-vspantry-admission",
    }],
  };

  const genome = familySnapshot("album");
  const trackFamily = familySnapshot("track");

  window.fullMeasure = {
    chooseBatchFolder: async () => {
      calls.chooseFolder += 1;
      return manifest;
    },
    primeBatchGenome: async () => {
      calls.prime += 1;
      return {
        manifestSha256: manifest.manifestSha256,
        trackIndex: 0,
        trackId: "01-open.wav",
        audioPath: "/album/01-open.wav",
        mediaAnalysis: { duration: 60, sections: [] },
        rootSeed: `album-genome:${manifest.manifestSha256}`,
        authority: "proposal-seed-only",
      };
    },
    startBatch: async (config) => {
      calls.start.push(config);
      return batchContext({ cursor: 0 });
    },
    getBatchContext: async () => batchContext({ cursor: 0 }),
    activateBatchTrack: async (config) => {
      calls.activate.push(config);
      return {
        schema: "haunted-toaster/folder-batch-prepared-track/v1",
        track: {
          trackIndex: 0,
          trackId: "01-open.wav",
          audioPath: "/album/01-open.wav",
          mediaAnalysis: {
            filename: "01-open.wav",
            duration: 60,
            sections: [],
            audio: { codec: "wav", sampleRate: 48000, channels: 2 },
          },
        },
        imagePath: "/album/opening.jpg",
        videoBinding: null,
        generationOptions: { rootSeed: "derived-track-seed", count: 6 },
        materialSelection: { imageAssetId: "image-1", videoSpecimenId: null },
      };
    },
    acceptBatchTrack: async (outcome) => {
      calls.accept.push(outcome);
      return batchContext({ cursor: 2, complete: true });
    },
    closeBatch: async () => {
      calls.close += 1;
      return {
        trackCount: 2,
        futureRearviewRetrospective: {
          revisitInvitations: [{
            earlierTrackIndex: 0,
            earlierTrackId: "01-open.wav",
            laterTrackIndex: 1,
            laterTrackId: "02-close.wav",
            aperture: "TIME",
            authority: "invitation-only",
          }],
        },
      };
    },
    clearBatch: async () => true,
  };

  window.fullMeasureUi = {
    applyBatchPreparedTrack: async (prepared) => {
      calls.apply.push(prepared);
      return true;
    },
  };

  let snapshot = null;
  window.candidateSixUp = {
    async generateWithRootSeed(rootSeed) {
      calls.generated.push(rootSeed);
      snapshot = calls.generated.length === 1 ? genome : trackFamily;
      return snapshot;
    },
    snapshot() {
      return snapshot;
    },
    open() {
      calls.candidateOpen += 1;
    },
    close() {
      calls.candidateClose += 1;
    },
  };

  window.eval(fs.readFileSync(path.join(rendererRoot, "batch-console-ui.js"), "utf8"));

  return { dom, window, document, calls, manifest, genome };
}

test("production renderer carries the Batch Console as an album transport, not a second renderer", () => {
  const document = new JSDOM(html).window.document;

  assert.ok(document.querySelector('link[href="./batch-console-ui.css"]'));
  assert.ok(document.querySelector('script[src="./batch-console-ui.js"]'));
  assert.ok(document.querySelector("#batchLaunch"));
  assert.ok(document.querySelector("#batchConsole[role='dialog']"));
  assert.ok(document.querySelector("#batchTrackList"));
  assert.ok(document.querySelector("#batchGenomeGrid"));
  assert.equal(document.querySelector("#batchStartButton").textContent.trim(), "TOAST THE RECORD");
});

test("Batch Console walks folder -> exact six-up genome -> current track -> accepted receipt -> retrospective", async () => {
  const view = harness();
  try {
    view.document.querySelector("#batchLaunch").click();
    await tick();
    await tick();

    assert.equal(view.calls.chooseFolder, 1);
    assert.equal(view.calls.prime, 1);
    assert.equal(view.document.querySelector("#batchConsole").classList.contains("is-hidden"), false);
    assert.equal(view.document.querySelectorAll("#batchTrackList .batch-track").length, 2);
    assert.match(view.document.querySelector("#batchMaterialSummary").textContent, /1 local video not auto-admitted/);

    view.document.querySelector("#batchGenomeButton").click();
    await tick();
    await tick();

    assert.equal(view.calls.generated[0], "album-genome:manifest-batch-309");
    assert.equal(view.document.querySelectorAll("#batchGenomeGrid .batch-genome-cell").length, 6);
    assert.equal(view.document.querySelector("#batchStartButton").disabled, false);

    view.document.querySelector("#batchStartButton").click();
    await tick();
    await tick();
    await tick();

    assert.equal(view.calls.start.length, 1);
    assert.equal(view.calls.start[0].sixUpSeed.familyHash, view.genome.familyHash);
    assert.deepEqual(view.calls.start[0].sixUpSeed.scoreAddresses, view.genome.scoreAddresses);
    assert.equal(view.calls.activate.length, 1);
    assert.equal(view.calls.apply.length, 1);
    assert.equal(view.calls.generated.at(-1), "derived-track-seed");
    assert.equal(view.document.querySelector("#batchConsole").classList.contains("is-hidden"), true);

    view.window.dispatchEvent(new view.window.CustomEvent("candidate-kept", {
      detail: {
        familyHash: "family-track",
        candidateIndex: 2,
        scoreAddress: "htvs1_track_3",
        changedAxes: ["topology", "palette", "lyric"],
      },
    }));
    view.window.dispatchEvent(new view.window.CustomEvent("haunted-render-complete", {
      detail: {
        receiptSha256: "e".repeat(64),
        outputPath: "/out/01-open.mp4",
      },
    }));
    await tick();
    await tick();
    await tick();

    assert.equal(view.calls.accept.length, 1);
    assert.equal(view.calls.accept[0].acceptedRenderReceiptSha256, "e".repeat(64));
    assert.equal(view.calls.accept[0].familyHash, "family-track");
    assert.equal(view.calls.accept[0].selectedScoreAddress, "htvs1_track_3");
    assert.deepEqual(view.calls.accept[0].observedAxes, ["topology", "palette"]);
    assert.equal(view.calls.close, 1);
    assert.equal(view.document.querySelector("#batchConsole").classList.contains("is-hidden"), false);
    assert.equal(view.document.querySelector("#batchRetrospective").classList.contains("is-hidden"), false);
    assert.match(view.document.querySelector("#batchRetrospective").textContent, /Nothing was rewritten automatically/);
  } finally {
    view.dom.window.close();
  }
});
