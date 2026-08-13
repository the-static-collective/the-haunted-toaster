(() => {
  const listeners = new Map();
  let renderMode = "complete";

  function subscribe(channel, callback) {
    const callbacks = listeners.get(channel) || [];
    callbacks.push(callback);
    listeners.set(channel, callbacks);
    return () => listeners.set(channel, callbacks.filter((item) => item !== callback));
  }

  function publish(channel, payload) {
    for (const callback of listeners.get(channel) || []) callback(payload);
  }

  function thumbnail(index) {
    const hue = 18 + index * 49;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><defs><linearGradient id="g"><stop stop-color="hsl(${hue} 66% 18%)"/><stop offset="1" stop-color="hsl(${(hue + 84) % 360} 72% 48%)"/></linearGradient></defs><rect width="640" height="360" fill="url(#g)"/><circle cx="${100 + index * 70}" cy="180" r="${72 + index * 6}" fill="none" stroke="#f4d5a2" stroke-width="7" opacity=".72"/></svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }

  function candidateFamily() {
    const roles = ["anchor", "topology-frontier", "motion-frontier", "material-frontier", "atmosphere-frontier", "converge-frontier"];
    return {
      familyHash: "ui-witness-family-v1",
      requestedCount: 6,
      producedCount: 6,
      shortfall: false,
      candidates: roles.map((role, index) => ({
        index,
        role,
        signature: ["warm spiral", "mirrored orchard", "fracture drift", "photocopy bloom", "firefly ring", "feral convergence"][index],
        scoreAddress: `htvs1_ui_witness_${String(index + 1).padStart(2, "0")}`,
        thumbnailDataUrl: thumbnail(index),
        changedAxes: index ? ["motion", "palette", "material"].slice(0, 1 + (index % 3)) : [],
        frontierEvidence: role === "converge-frontier"
          ? { selectedFrontierTarget: { topology: "mirrored-ring", motionGrammar: "fracture", materialTexture: "photocopy" } }
          : null,
      })),
    };
  }

  function prepareListenerLyrics(rawSource) {
    return {
      retainedPhraseCount: String(rawSource || "").split(/\n+/).filter(Boolean).length,
      structuralLabelsRemoved: 0,
      performanceNotesRemoved: 0,
      wrapsJoined: 0,
      removed: [],
      prepared: [],
    };
  }

  const commit = document.body.dataset.uiWitnessCommit || "local";
  const buildInfo = Object.freeze({
    version: "unknown",
    sourceMode: true,
    builtAt: null,
    rendererProfileGeneration: "unknown",
    capabilities: [],
    ...(window.__uiWitnessBuildInfo || {}),
    commit,
  });
  window.__consoleErrors = [];
  window.addEventListener("error", (event) => window.__consoleErrors.push(String(event.error?.message || event.message)));
  window.addEventListener("unhandledrejection", (event) => window.__consoleErrors.push(String(event.reason?.message || event.reason)));

  window.fullMeasure = Object.freeze({
    chooseAudio: async () => "/witness/Dreamstate Divide.wav",
    chooseImage: async () => "/witness/native-color-specimen.png",
    chooseLyrics: async () => null,
    chooseOutput: async () => "/witness/Dreamstate-Divide-alpha8.mp4",
    inspectAudio: async () => ({
      filename: "Dreamstate Divide.wav",
      sizeBytes: 18_874_368,
      duration: 30,
      audio: { sampleRate: 48_000, channels: 2, codec: "pcm_s16le" },
      sections: [
        { start: 0, end: 8, energy: 0.24, label: "Opening" },
        { start: 8, end: 19, energy: 0.72, label: "Lift" },
        { start: 19, end: 30, energy: 0.52, label: "Final form" },
      ],
      energySamples: Array.from({ length: 96 }, (_, index) => ({ db: -48 + (index % 19) * 1.8 })),
    }),
    fileUrl: async () => "data:audio/wav;base64,",
    inspectLyrics: async (value) => ({
      timed: /^\[\d/.test(String(value || "")),
      cueCount: String(value || "").split(/\n+/).filter((line) => line.trim()).length,
      sourceFormat: /^\[\d/.test(String(value || "")) ? "lrc" : "plain",
    }),
    prepareListenerLyrics,
    discoverLyricSidecar: async () => null,
    saveLyricSidecar: async () => ({ saved: true, path: "/witness/Dreamstate Divide.lrc" }),
    formatLrc: async ({ cues }) => cues.map((cue) => `[00:${String(cue.start.toFixed(2)).padStart(5, "0")}]${cue.text}`).join("\n"),
    manualLyricTrack: async () => ({ cues: [], engine: { source: "human" } }),
    listenerStatus: async () => ({ ready: true, installSupported: true, downloadBytes: 0 }),
    installListener: async () => ({ ready: true, installSupported: true, downloadBytes: 0 }),
    cancelListenerInstall: async () => {},
    stageListenerEvidence: () => ({ anchorCount: 0, previousEvidenceCount: 0 }),
    autoSyncLyrics: async () => ({
      engine: { source: "local-listener", policyVersion: "ui-witness-v1" },
      cues: [
        { text: "The house takes attendance", heard: "the house takes attendance", start: 2.2, end: 5.1, status: "high", confidence: 0.98 },
        { text: "Wire heat in the orchard", heard: "wire heat in the orchard", start: 9.4, end: 12.5, status: "medium", confidence: 0.76 },
        { text: "Native color comes home", heard: "native color comes home", start: 20.1, end: 23.4, status: "low", confidence: 0.58 },
        { text: "One honest missing phrase", heard: null, start: null, end: null, status: "unmatched", confidence: 0 },
      ],
    }),
    cancelLyricSync: async () => {},
    generateCandidates: async () => candidateFamily(),
    mutateCandidates: async () => candidateFamily(),
    stompCandidates: async () => candidateFamily(),
    selectCandidate: async ({ index }) => ({ familyHash: "ui-witness-family-v1", index }),
    clearCandidates: async () => {},
    clearCandidateImage: async () => {},
    startRender: async () => {
      publish("phase", { message: "Rendering the witnessed timeline…" });
      publish("progress", { ratio: 0.47, renderedSeconds: 14.1, duration: 30 });
      if (renderMode === "failure") throw new Error("Witness refusal specimen");
      if (renderMode === "pending") return new Promise(() => {});
      return {
        outputPath: "/witness/Dreamstate-Divide-alpha8.mp4",
        receipt: { output: { sizeBytes: 42_467_328 }, validation: { durationDeltaMilliseconds: 0 } },
      };
    },
    cancelRender: async () => {},
    revealFile: async () => {},
    openFile: async () => {},
    getVersion: async () => buildInfo.version,
    getBuildInfo: async () => structuredClone(buildInfo),
    getToastFeels: async () => structuredClone(window.__uiWitnessToastFeels || []),
    pathForFile: () => "",
    onProgress: (callback) => subscribe("progress", callback),
    onPhase: (callback) => subscribe("phase", callback),
    onListenerInstallProgress: (callback) => subscribe("listener-install", callback),
    onLyricSyncProgress: (callback) => subscribe("lyric-progress", callback),
    onLyricSyncPhase: (callback) => subscribe("lyric-phase", callback),
  });

  window.__uiWitness = Object.freeze({
    setRenderMode(mode) {
      renderMode = ["complete", "failure", "pending"].includes(mode) ? mode : "complete";
    },
  });

  document.title = "The Haunted Toaster";
  document.querySelector(".brand-line h1").textContent = "The Haunted Toaster";
  document.querySelector("#renderHeading").textContent = "Make the full video";
})();
