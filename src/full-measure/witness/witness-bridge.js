(() => {
  const listeners = new Map();
  let renderMode = "complete";
  let currentVideo = null;
  const pantrySpecimens = [];
  const requestedState = new URLSearchParams(window.location.search).get("state") || "empty";
  const betaHomeState = requestedState === "beta-home" || requestedState === "beta-history";
  const betaHistoryState = requestedState === "beta-history";

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
      toastmoodField: betaHomeState ? {
        policy: "toastmood-field-v1",
        mandatoryPreselection: false,
      } : null,
      candidates: roles.map((role, index) => ({
        index,
        role,
        signature: ["warm spiral", "mirrored orchard", "fracture drift", "photocopy bloom", "firefly ring", "feral convergence"][index],
        scoreAddress: `htvs1_ui_witness_${String(index + 1).padStart(2, "0")}`,
        thumbnailDataUrl: thumbnail(index),
        changedAxes: index ? ["motion", "palette", "material"].slice(0, 1 + (index % 3)) : [],
        toastmoodLane: betaHomeState
          ? { id: `witness-lane-${index + 1}`, name: `Witness lane ${index + 1}` }
          : null,
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

  function witnessVideoBinding({ persisted = true, index = 1 } = {}) {
    return {
      schema: "haunted-toaster/video-source/v1",
      specimenId: `sha256:ui-witness-video-${String(index).padStart(2, "0")}:4096`,
      sourceSha256: `ui-witness-video-${String(index).padStart(2, "0")}`,
      byteLength: 4096,
      path: `/witness/visual-specimen-${index}.mp4`,
      filename: `visual-specimen-${index}.mp4`,
      probe: {
        durationSeconds: 4,
        width: 1920,
        height: 1080,
        frameRate: "24/1",
        container: "mov,mp4,m4a,3gp,3g2,mj2",
        codec: "h264",
        hasAudio: false,
      },
      persisted,
    };
  }

  function addWitnessPantrySpecimen(binding) {
    if (!binding?.persisted) return false;
    if (pantrySpecimens.some((item) => item.specimenId === binding.specimenId)) return false;
    pantrySpecimens.push({
      specimenId: binding.specimenId,
      sourceSha256: binding.sourceSha256,
      byteLength: binding.byteLength,
      filename: binding.filename,
      paths: [binding.path],
      probe: structuredClone(binding.probe),
      analysis: { state: "pending", version: null },
      admittedAt: "2026-08-17T00:00:00.000Z",
    });
    pantrySpecimens.sort((left, right) => left.specimenId.localeCompare(right.specimenId));
    return true;
  }

  const RECENT_TOASTS = Object.freeze([
    Object.freeze({
      id: "toast-jubilee",
      title: "Jubilee",
      rating: 5,
      disposition: "keep",
      mediaAvailable: true,
      receiptAvailable: true,
    }),
    Object.freeze({
      id: "toast-ice9",
      title: "ice9",
      rating: 4,
      disposition: "weird",
      mediaAvailable: true,
      receiptAvailable: true,
    }),
    Object.freeze({
      id: "toast-danco",
      title: "release (DANCO)",
      rating: 5,
      disposition: "keep",
      mediaAvailable: true,
      receiptAvailable: true,
    }),
  ]);

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

  function witnessBuildInfo() {
    const info = structuredClone(buildInfo);
    const capabilities = new Set(Array.isArray(info.capabilities) ? info.capabilities : []);
    if (betaHomeState) capabilities.add("betaCandidateEcologyV1");
    else capabilities.delete("betaCandidateEcologyV1");
    info.capabilities = [...capabilities];
    return info;
  }

  window.__consoleErrors = [];
  window.addEventListener("error", (event) => window.__consoleErrors.push(String(event.error?.message || event.message)));
  window.addEventListener("unhandledrejection", (event) => window.__consoleErrors.push(String(event.reason?.message || event.reason)));


  function witnessNextGenCrossing() {
    const roles = [
      ["texture-loop", "derived-texture"],
      ["texture-release", "derived-texture"],
      ["topology-loop", "derived-mask"],
      ["topology-stretch", "derived-mask"],
      ["motion-release", "derived-motion"],
      ["motion-stretch", "derived-motion"],
    ];
    return {
      schema: "static-collective/nextgen-live-crossing/v0",
      policy: "nextgen-live-crossings-006",
      authority: "proposal-pressure-and-material-reservoir-only",
      crossingIdentity: "c".repeat(64),
      basis: { candidateIndex: 0, timelineHash: "d".repeat(64) },
      listeningEye: {
        authority: "influence-only",
        listeningEyeSha256: "e".repeat(64),
        album: { trackIndex: 1, trackCount: 1 },
      },
      snapLandmarks: [
        {kind:"section",label:"opening",songSeconds:0,compositionFrame:0,energy:0.2},
        {kind:"phrase",label:"phrase-1",songSeconds:1,compositionFrame:288,energy:0.7},
        {kind:"section",label:"lift",songSeconds:1.333333,compositionFrame:384,energy:0.8},
        {kind:"transient",label:"transient-1",songSeconds:2,compositionFrame:576,energy:0.9},
        {kind:"section",label:"arrival",songSeconds:2.666667,compositionFrame:768,energy:0.55},
        {kind:"boundary",label:"song-end",songSeconds:4,compositionFrame:1151,energy:0},
      ],
      frankenPressure: {
        authority: "influence-only",
        pressureHash: "f".repeat(64),
        dominantLens: { id: "architecture", name: "Architecture", slotIndex: 1, score: 4.2 },
        edits: {
          movingTakeSceneId: "ASSEMBLE",
          transitions: { arriveCross: "radial-reveal", crossAssemble: "panel-wipe" },
          variation: 7,
        },
      },
      videoDigestion: {
        schema: "haunted-toaster/video-digestion-six/v0",
        authority: "proposal-only",
        familyHash: "a".repeat(64),
        descendants: roles.map(([roleId, projectionClass], index) => {
          const planHash=String(index + 1).repeat(64);
          const family=projectionClass==="derived-texture"?"texture":roleId.startsWith("motion-")?"motion":"topology";
          return {
            slot:index+1,
            roleId,
            materialId:`video-digest:${roleId}:${planHash.slice(0,12)}`,
            projectionClass,
            planHash,
            sourceDurationFrames:96,
            projectionTreatment:{
              schema:"static-collective/franken-video-digestion-treatment/v0",
              authority:"projection-style-only",
              family,
              grayscale:1,
              contrast:family==="motion"?2.1:family==="topology"?1.75:1.3,
              saturate:family==="texture"?0.35:0,
              brightness:family==="motion"?1.14:family==="topology"?0.96:1.06,
              blurPx:family==="texture"?1.2:family==="topology"?0.8:0.4,
            },
          };
        }),
      },
    };
  }

  function witnessFrankenProposal(digestPlacements = []) {
    const cardOrder = ["card-01", "card-02", "card-03", "card-04", "card-05", "card-06"];
    const sceneRoles = {
      "card-01": "ARRIVE", "card-02": "ARRIVE",
      "card-03": "CROSS", "card-04": "CROSS",
      "card-05": "ASSEMBLE", "card-06": "ASSEMBLE",
    };
    const sceneStarts={ARRIVE:0,CROSS:384,ASSEMBLE:768};
    const sceneTracks=(sceneId,base)=>{
      const placements=digestPlacements.filter((placement)=>placement.sceneId===sceneId);
      return placements.length
        ?[...base.slice(0,base.length-1),{
            role:"video-digestion-placement",
            clips:placements.map((placement)=>({
              clipId:`clip-${sceneId.toLowerCase()}-${placement.placementId||"digest"}`,
              materialId:placement.materialId,
              startFrame:sceneStarts[sceneId]+Number(placement.startOffsetFrames||0),
              durationFrames:Number(placement.durationFrames||1),
              sourceWindow:{
                startSeconds:Number(placement.sourceStartFrames||0)/24,
                endSeconds:(Number(placement.sourceStartFrames||0)+Number(placement.durationFrames||1))/24,
              },
              transform:structuredClone(placement.transform||{x:0.5,y:0.5,scale:1,rotationDegrees:0}),
              transformKeyframes:structuredClone(placement.transformKeyframes||[]),
              crop:placement.crop?structuredClone(placement.crop):null,
              opacity:Number(placement.opacity??1),
              blend:placement.blend||"screen",
              stackOrder:Number(placement.stackOrder??30),
            })),
          },base.at(-1)]
        :base;
    };
    return {
      proposalSchema: "static-collective/franken-proposal/v0",
      authority: "proposal-only",
      seed: "witness-franken-001",
      cardOrder,
      sceneRoles,
      worldRule: "manga-room",
      movingTakeSceneId: "CROSS",
      transitionChoices: { arriveCross: "panel-wipe", crossAssemble: "radial-reveal" },
      text: "THE ROOM REMEMBERS",
      variation: 0,
      digestPlacements: structuredClone(digestPlacements),
      scenes: [
        { sceneId: "ARRIVE", tracks: sceneTracks("ARRIVE",[{ role: "card" }, { role: "typography" }]) },
        { sceneId: "CROSS", tracks: sceneTracks("CROSS",[{ role: "card" }, { role: "moving-take" }, { role: "typography" }, { role: "topology-material" }]) },
        { sceneId: "ASSEMBLE", tracks: sceneTracks("ASSEMBLE",[{ role: "card" }, { role: "typography" }, { role: "topology-material" }]) },
      ],
    };
  }

  window.fullMeasure = Object.freeze({
    chooseAudio: async () => "/witness/Dreamstate Divide.wav",
    chooseImage: async () => "/witness/native-color-specimen.png",
    chooseVideo: async ({ addToPantry = true } = {}) => {
      currentVideo = witnessVideoBinding({ persisted: addToPantry !== false, index: 1 });
      const inserted = addWitnessPantrySpecimen(currentVideo);
      return {
        binding: structuredClone(currentVideo),
        inserted,
        pantryCount: currentVideo.persisted ? pantrySpecimens.length : null,
      };
    },
    chooseVideoFolder: async () => {
      publish("video-pantry-import", {
        phase: "discovered",
        total: 3,
        index: 0,
        filename: null,
        admitted: 0,
        duplicates: 0,
        refused: 0,
      });
      publish("video-pantry-import", {
        phase: "processing",
        total: 3,
        index: 1,
        filename: "visual-specimen-1.mp4",
        admitted: 0,
        duplicates: 0,
        refused: 0,
      });
      await new Promise((resolve) => setTimeout(resolve, 300));

      let admitted = 0;
      let duplicates = 0;
      for (const index of [1, 2, 3]) {
        if (addWitnessPantrySpecimen(witnessVideoBinding({ persisted: true, index }))) admitted += 1;
        else duplicates += 1;
      }
      publish("video-pantry-import", {
        phase: "complete",
        total: 3,
        index: 3,
        filename: null,
        admitted,
        duplicates,
        refused: 0,
        catalogSize: pantrySpecimens.length,
      });
      return {
        admitted,
        duplicates,
        refused: [],
        catalogSize: pantrySpecimens.length,
        specimenIds: pantrySpecimens.map((item) => item.specimenId),
      };
    },
    listVideoPantry: async () => ({
      schema: "haunted-toaster/video-pantry-catalog/v1",
      specimens: structuredClone(pantrySpecimens),
    }),
    clearVideo: async () => {
      currentVideo = null;
      return true;
    },
    setVideoDigestOperator: async (digestOperatorId) => {
      if (!currentVideo) throw new Error("Video digestion requires an admitted Video specimen.");
      if (!["clip-luma-texture-v1", "clip-luma-mask-v1", "clip-motion-mask-v1"].includes(digestOperatorId)) {
        throw new Error("Unsupported video digestion.");
      }
      currentVideo = { ...currentVideo, digestOperatorId };
      return structuredClone(currentVideo);
    },
    setVideoSamplingPolicy: async (samplingPolicyId) => {
      if (!currentVideo) throw new Error("Video timing requires an admitted Video specimen.");
      if (!["loop-source-clip-v1", "play-source-once-v1", "stretch-source-clip-v1"].includes(samplingPolicyId)) {
        throw new Error("Unsupported video timing.");
      }
      currentVideo = { ...currentVideo, samplingPolicyId };
      return structuredClone(currentVideo);
    },
    chooseFrankenPlaydeckDeck: async () => "/witness/franken/playdeck-deck.json",
    chooseFrankenWorldRule: async () => "/witness/franken/playdeck-world-rule.json",
    chooseFrankenPlaydeckAssetMap: async () => "/witness/franken/playdeck-assets.local.json",
    chooseFrankenBlenderAcceptance: async () => "/witness/franken/accepted-take.json",
    chooseFrankenBlenderReceipt: async () => "/witness/franken/accepted-take.mp4.receipt.json",
    chooseFrankenBlenderVideo: async () => "/witness/franken/accepted-take.mp4",
    composeFranken: async (config = {}) => {
      const base = witnessFrankenProposal(config.edits?.digestPlacements || []);
      const proposal = {
        ...base,
        movingTakeSceneId: config.edits?.movingTakeSceneId || base.movingTakeSceneId,
        transitionChoices: {
          ...base.transitionChoices,
          ...(config.edits?.transitions || {}),
        },
        text: config.edits?.text ?? base.text,
        variation: Number.isSafeInteger(config.edits?.variation)
          ? config.edits.variation
          : base.variation,
        digestPlacements: structuredClone(config.edits?.digestPlacements || []),
        ...(config.nextGen?.enabled
          ? {
              ancestry: {
                nextGenCrossing: {
                  crossingIdentity: config.nextGen.expectedCrossingIdentity,
                },
              },
            }
          : {}),
      };
      const previewAssets=Object.fromEntries(
        (config.edits?.digestPlacements||[]).map((placement)=>[
          placement.materialId,
          {kind:"video",url:"/witness/visual-specimen-1.mp4"},
        ]),
      );
      return { proposalIdentity: "a".repeat(64), proposal, previewAssets };
    },
    freezeFranken: async () => ({ planHash: "b".repeat(64), plan: { schema: "static-collective/franken-composition/v0" } }),
    writeFrankenProjectionBundle: async () => ({ directory: "/witness/franken/render-bundle", planHash: "b".repeat(64) }),
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
    crossCandidates: async () => candidateFamily(),
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
    getBuildInfo: async () => witnessBuildInfo(),
    getNextGenProfile: async () => structuredClone(window.__uiWitnessNextGenProfile || null),
    inspectNextGenCrossings: async () => structuredClone(witnessNextGenCrossing()),
    getToastFeels: async () => structuredClone(window.__uiWitnessToastFeels || []),
    ...(betaHistoryState ? {
      listPastToasts: async ({ limit = 3 } = {}) => structuredClone(RECENT_TOASTS.slice(0, Math.min(3, Number(limit) || 3))),
      openPastToast: async () => true,
      openPastToasts: async () => true,
    } : {}),
    pathForFile: () => "",
    onProgress: (callback) => subscribe("progress", callback),
    onPhase: (callback) => subscribe("phase", callback),
    onVideoPantryImportProgress: (callback) => subscribe("video-pantry-import", callback),
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
