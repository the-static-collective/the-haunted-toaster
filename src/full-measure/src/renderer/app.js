(() => {
  const api = window.fullMeasure;
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const state = {
    audioPath: null,
    audio: null,
    imagePath: null,
    presetId: "porchlight",
    presetName: "Porchlight",
    rendering: false,
    result: null,
    lyricSummary: null,
    lyricProvenance: null,
    listenerStatus: null,
    syncing: false,
    installingListener: false,
    alignment: null,
    selectedCueIndex: null,
    tapMode: false,
    internalLyricUpdate: false,
  };

  const elements = {
    audioDrop: $("#audioDrop"),
    audioDropTitle: $("#audioDropTitle"),
    audioDropHint: $("#audioDropHint"),
    audioChooseChip: $("#audioChooseChip"),
    songFacts: $("#songFacts"),
    durationFact: $("#durationFact"),
    codecFact: $("#codecFact"),
    sectionFact: $("#sectionFact"),
    imageDrop: $("#imageDrop"),
    imageDropTitle: $("#imageDropTitle"),
    imageDropHint: $("#imageDropHint"),
    imageAction: $("#imageAction"),
    removeImage: $("#removeImage"),
    titleInput: $("#titleInput"),
    artistInput: $("#artistInput"),
    lyricsInput: $("#lyricsInput"),
    lyricsImport: $("#lyricsImport"),
    lyricsAutoSync: $("#lyricsAutoSync"),
    timingPill: $("#timingPill"),
    lyricsStatusText: $("#lyricsStatusText"),
    wordLineCount: $("#wordLineCount"),
    lyricsCountLabel: $("#lyricsCountLabel"),
    shapeState: $("#shapeState"),
    timeline: $("#timeline"),
    sectionLegend: $("#sectionLegend"),
    slateDuration: $("#slateDuration"),
    slatePicture: $("#slatePicture"),
    slateGarment: $("#slateGarment"),
    slateAudio: $("#slateAudio"),
    progressCard: $("#progressCard"),
    phaseMessage: $("#phaseMessage"),
    progressPercent: $("#progressPercent"),
    progressFill: $("#progressFill"),
    progressTime: $("#progressTime"),
    resultCard: $("#resultCard"),
    resultName: $("#resultName"),
    resultProof: $("#resultProof"),
    openResult: $("#openResult"),
    revealResult: $("#revealResult"),
    errorCard: $("#errorCard"),
    errorMessage: $("#errorMessage"),
    renderButton: $("#renderButton"),
    cancelButton: $("#cancelButton"),
    versionLabel: $("#versionLabel"),
    buildInfoSummary: $("#buildInfoSummary"),
    buildInfoDetails: $("#buildInfoDetails"),
    syncDialog: $("#syncDialog"),
    syncClose: $("#syncClose"),
    syncDialogSubtitle: $("#syncDialogSubtitle"),
    listenerSetup: $("#listenerSetup"),
    listenerSetupMessage: $("#listenerSetupMessage"),
    listenerDownloadSize: $("#listenerDownloadSize"),
    listenerInstall: $("#listenerInstall"),
    listenerManual: $("#listenerManual"),
    listenerInstallProgress: $("#listenerInstallProgress"),
    listenerInstallLabel: $("#listenerInstallLabel"),
    listenerInstallPercent: $("#listenerInstallPercent"),
    listenerInstallFill: $("#listenerInstallFill"),
    listenerInstallCancel: $("#listenerInstallCancel"),
    syncWorking: $("#syncWorking"),
    syncWorkingTitle: $("#syncWorkingTitle"),
    syncProgressFill: $("#syncProgressFill"),
    syncProgressPercent: $("#syncProgressPercent"),
    syncCancel: $("#syncCancel"),
    syncEditor: $("#syncEditor"),
    syncVerdictPill: $("#syncVerdictPill"),
    syncVerdictTitle: $("#syncVerdictTitle"),
    syncVerdictText: $("#syncVerdictText"),
    syncCounts: $("#syncCounts"),
    syncAudio: $("#syncAudio"),
    syncWaveform: $("#syncWaveform"),
    syncPlayhead: $("#syncPlayhead"),
    tapThrough: $("#tapThrough"),
    relisten: $("#relisten"),
    cueList: $("#cueList"),
    syncSaveNote: $("#syncSaveNote"),
    syncEditorClose: $("#syncEditorClose"),
    syncAccept: $("#syncAccept"),
  };

  function basename(filePath) {
    return String(filePath || "").split(/[\\/]/).pop() || "";
  }

  function stem(filePath) {
    const name = basename(filePath);
    const dot = name.lastIndexOf(".");
    return dot > 0 ? name.slice(0, dot) : name;
  }

  function formatDuration(seconds) {
    if (!Number.isFinite(Number(seconds))) return "0:00";
    const total = Math.max(0, Math.round(Number(seconds)));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const remainder = total % 60;
    if (hours) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(
        remainder,
      ).padStart(2, "0")}`;
    }
    return `${minutes}:${String(remainder).padStart(2, "0")}`;
  }

  function formatBytes(bytes) {
    const value = Number(bytes);
    if (!Number.isFinite(value) || value <= 0) return "unknown size";
    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(
      units.length - 1,
      Math.floor(Math.log(value) / Math.log(1024)),
    );
    return `${(value / 1024 ** index).toFixed(index > 1 ? 1 : 0)} ${
      units[index]
    }`;
  }

  function formatTimecode(seconds) {
    if (!Number.isFinite(Number(seconds))) return "--:--.--";
    const centiseconds = Math.max(0, Math.round(Number(seconds) * 100));
    const minutes = Math.floor(centiseconds / 6_000);
    const remainder = centiseconds - minutes * 6_000;
    return `${String(minutes).padStart(2, "0")}:${String(
      Math.floor(remainder / 100),
    ).padStart(2, "0")}.${String(remainder % 100).padStart(2, "0")}`;
  }

  function parseTimecode(value) {
    const normalized = String(value || "").trim().replace(",", ".");
    if (/^\d+(?:\.\d+)?$/.test(normalized)) return Number(normalized);
    const parts = normalized.split(":").map(Number);
    if (
      parts.length !== 2 ||
      parts.some((part) => !Number.isFinite(part) || part < 0)
    ) {
      return null;
    }
    return parts[0] * 60 + parts[1];
  }

  async function setLyricsValue(value, provenance = null) {
    state.internalLyricUpdate = true;
    try {
      elements.lyricsInput.value = value;
      state.lyricProvenance = provenance;
      await inspectLyricsNow();
    } finally {
      state.internalLyricUpdate = false;
    }
  }

  function showSyncView(view) {
    elements.listenerSetup.classList.toggle("is-hidden", view !== "setup");
    elements.syncWorking.classList.toggle("is-hidden", view !== "working");
    elements.syncEditor.classList.toggle("is-hidden", view !== "editor");
  }

  function openSyncDialog() {
    elements.syncDialog.classList.remove("is-hidden");
    document.body.classList.add("has-dialog");
  }

  function closeSyncDialog() {
    if (state.syncing || state.installingListener) return;
    elements.syncDialog.classList.add("is-hidden");
    document.body.classList.remove("has-dialog");
    state.tapMode = false;
    elements.syncAudio.pause();
  }

  function setError(error) {
    const message =
      typeof error === "string"
        ? error
        : error?.message || "An unknown render error occurred.";
    elements.errorMessage.textContent = message;
    elements.errorCard.classList.remove("is-hidden");
  }

  function clearError() {
    elements.errorCard.classList.add("is-hidden");
    elements.errorMessage.textContent = "";
  }

  function setRenderState(rendering) {
    state.rendering = rendering;
    elements.audioDrop.disabled = rendering;
    elements.imageDrop.disabled = rendering;
    elements.lyricsImport.disabled = rendering;
    elements.lyricsAutoSync.disabled =
      rendering ||
      !state.audio ||
      !elements.lyricsInput.value.trim() ||
      Boolean(state.lyricSummary?.timed);
    elements.renderButton.disabled = rendering || !state.audio;
    elements.renderButton.classList.toggle("is-hidden", rendering);
    elements.cancelButton.classList.toggle("is-hidden", !rendering);
    if (rendering) {
      elements.progressCard.classList.remove("is-hidden");
      elements.resultCard.classList.add("is-hidden");
      elements.progressPercent.textContent = "0%";
      elements.progressFill.style.width = "0%";
      elements.phaseMessage.textContent = "Preparing the instrument…";
      elements.progressTime.textContent = `0:00 of ${formatDuration(
        state.audio?.duration,
      )}`;
    }
  }


function selectCueForTime(cues, timestampSeconds, mediaDuration) {
  if (!cues || !cues.length || typeof timestampSeconds !== "number" || Number.isNaN(timestampSeconds)) {
    return null;
  }

  const duration = Number.isFinite(mediaDuration) ? mediaDuration : Infinity;
  let selected = null;

  for (let index = 0; index < cues.length; index += 1) {
    const cue = cues[index];
    let end = Number.isFinite(cue.end) ? cue.end : null;

    if (end === null) {
      if (index + 1 < cues.length) {
        end = cues[index + 1].start;
      } else {
        end = duration;
      }
    }

    if (index + 1 < cues.length && end > cues[index + 1].start) {
      end = cues[index + 1].start;
    }

    if (timestampSeconds >= cue.start && timestampSeconds < end) {
      selected = cue;
    }
  }

  return selected;
}

  let lyricInspectionTimer = null;
  let lyricInspectionVersion = 0;

  function showLyricSummary(summary) {
    state.lyricSummary = summary;
    elements.timingPill.classList.remove("is-timed", "is-approximate");

    if (!summary || !summary.cueCount) {
      elements.timingPill.textContent = "No lyrics";
      elements.wordLineCount.textContent = "0";
      elements.lyricsCountLabel.textContent = "usable lines";
      elements.lyricsAutoSync.disabled = true;
      return;
    }

    elements.wordLineCount.textContent = String(summary.cueCount);
    if (summary.timed) {
      elements.timingPill.textContent = `${summary.sourceFormat.toUpperCase()} synced`;
      elements.timingPill.classList.add("is-timed");
      elements.lyricsCountLabel.textContent =
        summary.cueCount === 1
          ? "vocal-timed cue"
          : "vocal-timed cues";
    } else {
      elements.timingPill.textContent = "Approximate";
      elements.timingPill.classList.add("is-approximate");
      elements.lyricsCountLabel.textContent =
        summary.cueCount === 1
          ? "line · spaced across song"
          : "lines · spaced across song";
    }
    elements.lyricsAutoSync.disabled =
      state.rendering || !state.audio || summary.timed || !summary.cueCount;
  }

  async function inspectLyricsNow() {
    const version = ++lyricInspectionVersion;
    const value = elements.lyricsInput.value;
    if (!value.trim()) {
      showLyricSummary(null);
      return;
    }

    try {
      const summary = await api.inspectLyrics(
        value,
        state.audio?.duration || 86_400,
      );
      if (version === lyricInspectionVersion) showLyricSummary(summary);
    } catch (error) {
      if (version === lyricInspectionVersion) setError(error);
    }
  }

  function scheduleLyricInspection() {
    clearTimeout(lyricInspectionTimer);
    lyricInspectionTimer = setTimeout(inspectLyricsNow, 140);
  }

  function renderTimeline() {
    elements.timeline.replaceChildren();
    if (!state.audio?.sections?.length) {
      elements.timeline.className = "timeline empty";
      elements.timeline.append(document.createElement("span"));
      elements.shapeState.textContent = "Waiting for a song";
      elements.sectionLegend.textContent =
        "The visual phases will change at musical energy boundaries.";
      return;
    }

    elements.timeline.className = "timeline";
    const labels = [];
    for (const section of state.audio.sections) {
      const segment = document.createElement("span");
      segment.className = "timeline-segment";
      segment.style.flexGrow = Math.max(0.1, section.end - section.start);
      segment.style.setProperty(
        "--energy",
        Math.max(0, Math.min(1, section.energy)).toFixed(3),
      );
      segment.title = `${section.label} · ${formatDuration(
        section.start,
      )}–${formatDuration(section.end)}`;
      elements.timeline.append(segment);
      labels.push(section.label);
    }
    elements.shapeState.textContent = `${state.audio.sections.length} phases`;
    elements.sectionLegend.textContent = labels.join("  ·  ");
  }

  function refreshSlate() {
    if (state.audio) {
      elements.slateDuration.textContent = `${formatDuration(
        state.audio.duration,
      )} · full song`;
      elements.slateAudio.textContent = ["aac", "mp3", "alac"].includes(
        state.audio.audio?.codec,
      )
        ? "Original stream · copied"
        : "Original master · 320k AAC";
    } else {
      elements.slateDuration.textContent = "Waiting";
      elements.slateAudio.textContent = "Original master";
    }
    elements.slatePicture.textContent = state.imagePath
      ? "Image + procedural"
      : "Procedural";
    elements.slateGarment.textContent = state.presetName;
    elements.renderButton.disabled = state.rendering || !state.audio;
  }

  async function loadAudio(filePath) {
    if (!filePath || state.rendering) return;
    clearError();
    elements.audioDrop.classList.add("is-loading");
    elements.audioDropTitle.textContent = "Listening…";
    elements.audioDropHint.textContent = "Finding sections and energy changes";
    elements.audioChooseChip.textContent = "Analyzing";

    try {
      const audio = await api.inspectAudio(filePath);
      state.audioPath = filePath;
      state.audio = audio;
      state.result = null;
      state.alignment = null;
      state.selectedCueIndex = null;
      elements.syncAudio.src = await api.fileUrl(filePath);

      elements.audioDrop.classList.add("has-file");
      elements.audioDropTitle.textContent = audio.filename;
      elements.audioDropHint.textContent = `${formatBytes(
        audio.sizeBytes,
      )} · ${audio.audio.sampleRate / 1000} kHz · ${
        audio.audio.channels
      } channel${audio.audio.channels === 1 ? "" : "s"}`;
      elements.audioChooseChip.textContent = "Replace";
      elements.songFacts.classList.remove("is-hidden");
      elements.durationFact.textContent = formatDuration(audio.duration);
      elements.codecFact.textContent = audio.audio.codec.toUpperCase();
      elements.sectionFact.textContent = `${audio.sections.length} phases`;
      elements.resultCard.classList.add("is-hidden");
      if (!elements.titleInput.value.trim()) {
        elements.titleInput.placeholder = stem(audio.filename);
      }
      renderTimeline();
      refreshSlate();
      if (!elements.lyricsInput.value.trim()) {
        const sidecar = await api.discoverLyricSidecar(filePath);
        if (sidecar?.content) {
          await setLyricsValue(sidecar.content, {
            mode: "discovered-lrc-sidecar",
            sidecarFilename: sidecar.filename,
          });
        }
      }
      await inspectLyricsNow();
    } catch (error) {
      state.audioPath = null;
      state.audio = null;
      elements.syncAudio.removeAttribute("src");
      elements.audioDrop.classList.remove("has-file");
      elements.audioDropTitle.textContent = "Drop a finished song";
      elements.audioDropHint.textContent = "MP3 or WAV · click to choose";
      elements.audioChooseChip.textContent = "Choose file";
      elements.songFacts.classList.add("is-hidden");
      renderTimeline();
      refreshSlate();
      await inspectLyricsNow();
      setError(error);
    } finally {
      elements.audioDrop.classList.remove("is-loading");
    }
  }

  function loadImage(filePath) {
    if (!filePath || state.rendering) return;
    state.imagePath = filePath;
    elements.imageDropTitle.textContent = basename(filePath);
    elements.imageDropHint.textContent = "Will be woven into the garment";
    elements.imageAction.textContent = "↻";
    elements.removeImage.classList.remove("is-hidden");
    refreshSlate();
  }

  function clearImage() {
    state.imagePath = null;
    elements.imageDropTitle.textContent = "Add one image";
    elements.imageDropHint.textContent = "Optional · PNG, JPG, or WebP";
    elements.imageAction.textContent = "+";
    elements.removeImage.classList.add("is-hidden");
    refreshSlate();
  }

  async function pickAudio() {
    const filePath = await api.chooseAudio();
    if (filePath) await loadAudio(filePath);
  }

  async function pickImage() {
    const filePath = await api.chooseImage();
    if (filePath) loadImage(filePath);
  }

  async function pickLyrics() {
    if (state.rendering) return;
    clearError();
    try {
      const selected = await api.chooseLyrics();
      if (!selected) return;
      await setLyricsValue(selected.content, {
        mode: "imported-timing-file",
        sidecarFilename: selected.filename,
      });
    } catch (error) {
      setError(error);
    }
  }

  function wireDropTarget(element, kind) {
    for (const eventName of ["dragenter", "dragover"]) {
      element.addEventListener(eventName, (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!state.rendering) element.classList.add("is-dragging");
      });
    }
    for (const eventName of ["dragleave", "drop"]) {
      element.addEventListener(eventName, (event) => {
        event.preventDefault();
        event.stopPropagation();
        element.classList.remove("is-dragging");
      });
    }
    element.addEventListener("drop", async (event) => {
      if (state.rendering) return;
      const file = event.dataTransfer.files?.[0];
      if (!file) return;
      const filePath = api.pathForFile(file);
      if (!filePath) {
        setError("The dropped file path could not be read.");
        return;
      }
      if (kind === "audio") await loadAudio(filePath);
      else loadImage(filePath);
    });
  }

  async function refreshListenerStatus() {
    state.listenerStatus = await api.listenerStatus();
    elements.listenerDownloadSize.textContent = state.listenerStatus
      .downloadBytes
      ? `about ${formatBytes(state.listenerStatus.downloadBytes)}`
      : "manual configuration";
    if (!state.listenerStatus.installSupported && !state.listenerStatus.ready) {
      elements.listenerSetupMessage.textContent =
        "Automatic Listener setup currently supports 64-bit Windows. This system can use an externally configured whisper.cpp listener.";
      elements.listenerInstall.textContent = "Automatic setup unavailable";
      elements.listenerInstall.disabled = true;
    } else {
      elements.listenerSetupMessage.textContent =
        "Install a verified local listening engine and compact English model. Audio still never leaves this computer.";
      elements.listenerInstall.textContent = "Install local Listener";
      elements.listenerInstall.disabled = false;
    }
    return state.listenerStatus;
  }

  function suggestedCueTime(index) {
    const cues = state.alignment?.cues || [];
    const cue = cues[index];
    if (Number.isFinite(cue?.start)) return cue.start;

    let previousIndex = index - 1;
    while (
      previousIndex >= 0 &&
      !Number.isFinite(cues[previousIndex]?.start)
    ) {
      previousIndex -= 1;
    }
    let nextIndex = index + 1;
    while (
      nextIndex < cues.length &&
      !Number.isFinite(cues[nextIndex]?.start)
    ) {
      nextIndex += 1;
    }

    if (previousIndex < 0 && nextIndex >= cues.length) return 0;
    if (previousIndex < 0) return cues[nextIndex].start;
    if (nextIndex >= cues.length) return cues[previousIndex].start;

    const duration = state.audio?.duration || 0;
    const previousTime = cues[previousIndex].start;
    const nextTime = cues[nextIndex].start;
    const span = nextIndex - previousIndex;
    const ratio = span > 0 ? (index - previousIndex) / span : 0;
    return Math.max(0, Math.min(duration, previousTime + (nextTime - previousTime) * ratio));
  }

  function currentCueCounts() {
    const cues = state.alignment?.cues || [];
    const counts = {
      high: 0,
      medium: 0,
      low: 0,
      unmatched: 0,
      human: 0,
    };
    for (const cue of cues) {
      const status = counts[cue.status] === undefined ? "low" : cue.status;
      counts[status] += 1;
    }
    return counts;
  }

  function updateSyncVerdict() {
    const cues = state.alignment?.cues || [];
    const counts = currentCueCounts();
    const unplaced = cues.filter((cue) => !Number.isFinite(cue.start)).length;
    const review = counts.medium + counts.low + counts.unmatched;

    elements.syncCounts.replaceChildren();
    for (const [label, value, className] of [
      ["Certain", counts.high, "high"],
      ["Review", counts.medium + counts.low, "review"],
      ["Human", counts.human, "human"],
      ["Unplaced", unplaced, "missing"],
    ]) {
      if (!value && label !== "Certain") continue;
      const item = document.createElement("span");
      item.className = `sync-count ${className}`;
      item.textContent = `${value} ${label.toLowerCase()}`;
      elements.syncCounts.append(item);
    }

    if (!review && !unplaced) {
      elements.syncVerdictPill.textContent = "Clean listening pass";
      elements.syncVerdictTitle.textContent = "Every line has a witness.";
      elements.syncVerdictText.textContent =
        "The written lyrics were preserved and every entrance was placed.";
    } else if (unplaced) {
      elements.syncVerdictPill.textContent = `${unplaced} honest gap${
        unplaced === 1 ? "" : "s"
      }`;
      elements.syncVerdictTitle.textContent =
        "The listener abstained where it was uncertain.";
      elements.syncVerdictText.textContent =
        "Select each red line and press Space at its vocal entrance.";
    } else {
      elements.syncVerdictPill.textContent = `${review} line${
        review === 1 ? "" : "s"
      } worth hearing`;
      elements.syncVerdictTitle.textContent =
        "The timing is complete, with uncertainty exposed.";
      elements.syncVerdictText.textContent =
        "Yellow lines are usable estimates. Tap or drag any line you want to tighten.";
    }

    elements.syncAccept.disabled = unplaced > 0;
    elements.syncAccept.textContent = unplaced
      ? `Place ${unplaced} missing line${unplaced === 1 ? "" : "s"}`
      : "Use reviewed timing";
  }

  function selectCue(index, options = {}) {
    if (!state.alignment?.cues?.[index]) return;
    state.selectedCueIndex = index;
    for (const row of elements.cueList.querySelectorAll(".cue-row")) {
      row.classList.toggle(
        "is-selected",
        Number(row.dataset.cueIndex) === index,
      );
    }
    const selected = elements.cueList.querySelector(
      `.cue-row[data-cue-index="${index}"]`,
    );
    if (options.scroll !== false) {
      selected?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
    if (options.focus !== false) {
      elements.syncAudio.focus({ preventScroll: true });
    }
  }

  function updateCueRow(index) {
    const cue = state.alignment?.cues?.[index];
    const row = elements.cueList.querySelector(
      `.cue-row[data-cue-index="${index}"]`,
    );
    if (!cue || !row) return;
    const timeInput = row.querySelector(".cue-time");
    const slider = row.querySelector(".cue-slider");
    const status = row.querySelector(".cue-confidence");
    timeInput.value = formatTimecode(cue.start);
    slider.value = Number.isFinite(cue.start)
      ? String(cue.start)
      : String(suggestedCueTime(index));
    row.classList.toggle("is-unplaced", !Number.isFinite(cue.start));
    row.dataset.status = cue.status;
    status.className = `cue-confidence ${cue.status}`;
    status.textContent =
      cue.status === "human"
        ? "human"
        : cue.status === "unmatched"
          ? "unplaced"
          : `${cue.status} ${Math.round((cue.confidence || 0) * 100)}%`;
    updateSyncVerdict();
  }

  function setCueTime(index, seconds, source = "human") {
    const cue = state.alignment?.cues?.[index];
    const duration = state.audio?.duration || 0;
    if (!cue || !Number.isFinite(Number(seconds))) return;
    const start = Math.max(0, Math.min(duration, Number(seconds)));
    cue.start = Number(start.toFixed(3));
    cue.end = Number(
      Math.min(
        duration,
        Math.max(cue.start + 0.3, Number(cue.end) || cue.start + 2.8),
      ).toFixed(3),
    );
    if (source === "human") {
      cue.status = "human";
      cue.confidence = 1;
      cue.humanCorrected = true;
    }
    updateCueRow(index);
  }

  function nudgeCueTime(index, delta) {
    const cue = state.alignment?.cues?.[index];
    if (!cue) return;
    const current = Number.isFinite(cue.start)
      ? cue.start
      : suggestedCueTime(index);
    setCueTime(index, current + delta);
    selectCue(index, { scroll: false, focus: false });

    const time = elements.cueList.querySelector(
      `.cue-row[data-cue-index="${index}"] .cue-time`,
    );
    if (time) {
      time.classList.remove("just-nudged");
      void time.offsetWidth;
      time.classList.add("just-nudged");
    }
  }

  function bindCueNudge(button, index, delta) {
    button.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      nudgeCueTime(index, delta);
    });
    button.addEventListener("keydown", (event) => {
      if (!["Enter", " "].includes(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      nudgeCueTime(index, delta);
    });
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
  }

  function nextReviewCue(afterIndex = -1) {
    const cues = state.alignment?.cues || [];
    for (let index = afterIndex + 1; index < cues.length; index += 1) {
      if (
        !Number.isFinite(cues[index].start) ||
        ["medium", "low", "unmatched"].includes(cues[index].status)
      ) {
        return index;
      }
    }
    return null;
  }

  function makeCueButton(label, className, title) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    button.title = title;
    return button;
  }

  function renderCueEditor() {
    elements.cueList.replaceChildren();
    const duration = state.audio?.duration || 0;
    for (const [index, cue] of state.alignment.cues.entries()) {
      const row = document.createElement("article");
      row.className = "cue-row";
      row.dataset.cueIndex = String(index);
      row.dataset.status = cue.status;

      const play = makeCueButton("▶", "cue-play", "Play this entrance");
      const time = document.createElement("input");
      time.className = "cue-time";
      time.type = "text";
      time.inputMode = "decimal";
      time.value = formatTimecode(cue.start);
      time.setAttribute("aria-label", `Timestamp for ${cue.text}`);

      const copy = document.createElement("div");
      copy.className = "cue-copy";
      const lyric = document.createElement("strong");
      lyric.textContent = cue.text;
      const heard = document.createElement("small");
      heard.textContent = cue.heard
        ? `Listener heard: ${cue.heard}`
        : "No confident vocal witness";
      copy.append(lyric, heard);

      const confidence = document.createElement("span");
      confidence.className = `cue-confidence ${cue.status}`;

      const nudgeBack = makeCueButton("−.1", "cue-nudge", "Move 0.1 seconds earlier");
      const nudgeForward = makeCueButton("+.1", "cue-nudge", "Move 0.1 seconds later");
      const slider = document.createElement("input");
      slider.className = "cue-slider";
      slider.type = "range";
      slider.min = "0";
      slider.max = String(Math.max(0.01, duration));
      slider.step = "0.01";
      slider.value = String(
        Number.isFinite(cue.start) ? cue.start : suggestedCueTime(index),
      );
      slider.setAttribute("aria-label", `Drag timing for ${cue.text}`);

      const controls = document.createElement("div");
      controls.className = "cue-controls";
      controls.append(time, nudgeBack, nudgeForward);
      row.append(play, copy, confidence, controls, slider);

      row.addEventListener("click", (event) =>
        selectCue(index, {
          scroll: false,
          focus: !event.target.closest("input, button"),
        }),
      );
      play.addEventListener("click", (event) => {
        event.stopPropagation();
        selectCue(index);
        elements.syncAudio.currentTime = Math.max(
          0,
          (Number.isFinite(cue.start) ? cue.start : suggestedCueTime(index)) -
            0.8,
        );
        elements.syncAudio.play().catch(() => {});
      });
      time.addEventListener("change", () => {
        const parsed = parseTimecode(time.value);
        if (parsed === null) {
          time.value = formatTimecode(cue.start);
          return;
        }
        setCueTime(index, parsed);
      });
      slider.addEventListener("input", () => {
        setCueTime(index, Number(slider.value));
      });
      bindCueNudge(nudgeBack, index, -0.1);
      bindCueNudge(nudgeForward, index, 0.1);

      elements.cueList.append(row);
      updateCueRow(index);
    }
    selectCue(nextReviewCue() ?? 0, { scroll: false });
    updateSyncVerdict();
  }

  function drawSyncWaveform() {
    const canvas = elements.syncWaveform;
    const context = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    const samples = state.audio?.energySamples || [];
    context.clearRect(0, 0, width, height);
    const gradient = context.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, "#df7147");
    gradient.addColorStop(0.52, "#f0bf68");
    gradient.addColorStop(1, "#83d1bf");
    context.fillStyle = "rgba(255,255,255,0.025)";
    context.fillRect(0, 0, width, height);
    context.fillStyle = gradient;

    const bars = Math.min(width / 2, Math.max(1, samples.length));
    for (let index = 0; index < bars; index += 1) {
      const sample =
        samples[Math.floor((index / Math.max(1, bars - 1)) * (samples.length - 1))];
      const energy = Math.max(0.04, Math.min(1, (Number(sample?.db) + 58) / 58));
      const barHeight = energy * (height - 18);
      const x = (index / bars) * width;
      context.globalAlpha = 0.25 + energy * 0.55;
      context.fillRect(x, (height - barHeight) / 2, 1.3, barHeight);
    }
    context.globalAlpha = 1;
  }

  function updateSyncPlayhead() {
    const duration = elements.syncAudio.duration || state.audio?.duration || 0;
    const ratio = duration
      ? elements.syncAudio.currentTime / duration
      : 0;
    elements.syncPlayhead.style.left = `${Math.max(
      0,
      Math.min(100, ratio * 100),
    )}%`;

    if (!state.tapMode && state.alignment?.cues?.length) {
      const normalizedTimeline = normalizeCueTimeline(state.alignment.cues, duration);
      const activeCue = selectCueForTime(normalizedTimeline, elements.syncAudio.currentTime);
      let activeIndex = -1;
      if (activeCue) {
        activeIndex = state.alignment.cues.findIndex(c => c.start === activeCue.start && c.text === activeCue.text);
      }

      if (activeIndex !== -1 && state.selectedCueIndex !== activeIndex) {
        selectCue(activeIndex, { scroll: true, focus: false });
      }
    }

    if (!elements.syncAudio.paused && !elements.syncDialog.classList.contains("is-hidden")) {
      requestAnimationFrame(updateSyncPlayhead);
    }
  }

  function showAlignmentEditor(alignment) {
    state.alignment = alignment;
    state.tapMode = false;
    showSyncView("editor");
    drawSyncWaveform();
    renderCueEditor();
    elements.syncSaveNote.textContent =
      "A same-named .lrc will be saved beside the song after review.";
  }

  async function runAutoSync() {
    if (!state.audio || state.syncing) return;
    state.syncing = true;
    let closeAfterError = false;
    showSyncView("working");
    elements.syncWorkingTitle.textContent =
      "Preparing a private listening copy…";
    elements.syncProgressFill.style.width = "3%";
    elements.syncProgressPercent.textContent = "3%";
    elements.syncClose.disabled = true;

    try {
      const alignment = await api.autoSyncLyrics({
        audioPath: state.audioPath,
        lyrics: elements.lyricsInput.value,
        duration: state.audio.duration,
        title: elements.titleInput.value.trim() || stem(state.audio.filename),
        artist: elements.artistInput.value.trim(),
        language: "en",
      });
      showAlignmentEditor(alignment);
    } catch (error) {
      if (error?.code === "LISTENER_PACK_REQUIRED") {
        await refreshListenerStatus();
        showSyncView("setup");
      } else if (!String(error?.message || "").toLowerCase().includes("cancel")) {
        setError(error);
        closeAfterError = true;
      }
    } finally {
      state.syncing = false;
      elements.syncClose.disabled = false;
      if (closeAfterError) closeSyncDialog();
    }
  }

  async function beginAutoSync() {
    if (
      !state.audio ||
      !elements.lyricsInput.value.trim() ||
      state.lyricSummary?.timed
    ) {
      return;
    }
    clearError();
    openSyncDialog();
    const status = await refreshListenerStatus();
    if (status.ready) {
      await runAutoSync();
    } else {
      showSyncView("setup");
    }
  }

  async function installListener() {
    if (state.installingListener || !state.listenerStatus?.installSupported) {
      return;
    }
    state.installingListener = true;
    elements.listenerInstall.classList.add("is-hidden");
    elements.listenerManual.disabled = true;
    elements.listenerInstallProgress.classList.remove("is-hidden");
    elements.listenerInstallFill.style.width = "0%";
    elements.listenerInstallPercent.textContent = "0%";
    elements.syncClose.disabled = true;
    try {
      state.listenerStatus = await api.installListener();
      await runAutoSync();
    } catch (error) {
      if (!String(error?.message || "").toLowerCase().includes("cancel")) {
        setError(error);
      }
    } finally {
      state.installingListener = false;
      elements.listenerInstall.classList.remove("is-hidden");
      elements.listenerManual.disabled = false;
      elements.listenerInstallProgress.classList.add("is-hidden");
      elements.syncClose.disabled = false;
    }
  }

  async function acceptSyncedLyrics() {
    const cues = state.alignment?.cues || [];
    const unplaced = cues.filter((cue) => !Number.isFinite(cue.start));
    if (unplaced.length) return;

    const counts = currentCueCounts();
    const humanCorrectedCount = cues.filter(
      (cue) => cue.humanCorrected,
    ).length;
    const reviewCount = counts.medium + counts.low;
    const lrc = await api.formatLrc({
      cues,
      title: elements.titleInput.value.trim() || stem(state.audio.filename),
      artist: elements.artistInput.value.trim(),
      note: humanCorrectedCount
        ? `${humanCorrectedCount} lines human-corrected after local alignment`
        : reviewCount
          ? `${reviewCount} lower-confidence lines accepted after review`
          : `${cues.length} lines aligned locally`,
    });
    let saved = null;
    try {
      saved = await api.saveLyricSidecar(state.audioPath, lrc);
    } catch (error) {
      setError(
        `The reviewed timing is active, but its LRC sidecar could not be saved beside the song.\n${error?.message || error}`,
      );
    }
    const sidecarFilename = saved?.saved ? basename(saved.path) : null;
    await setLyricsValue(lrc, {
      mode:
        state.alignment.engine?.source === "human"
          ? "tap-synced-human"
          : "auto-synced-local",
      engine: state.alignment.engine,
      alignment: {
        lineCount: cues.length,
        matchedCount: cues.length,
        reviewCount,
        humanCorrectedCount,
      },
      sidecarFilename,
    });
    elements.syncSaveNote.textContent = saved?.saved
      ? `${basename(saved.path)} saved beside the song.`
      : saved
        ? "Timing is active in this render; the existing sidecar was kept."
        : "Timing is active in this render; the sidecar could not be written.";
    closeSyncDialog();
  }

  async function startRender() {
    if (!state.audio || state.rendering) return;
    clearError();
    const title =
      elements.titleInput.value.trim() || stem(state.audio.filename);
    const outputPath = await api.chooseOutput(`${title}-full-measure`);
    if (!outputPath) return;

    setRenderState(true);
    try {
      const result = await api.startRender({
        audioPath: state.audioPath,
        imagePath: state.imagePath,
        outputPath,
        presetId: state.presetId,
        title: elements.titleInput.value,
        artist: elements.artistInput.value,
        lyrics: elements.lyricsInput.value,
        lyricProvenance: state.lyricProvenance,
        width: 1920,
        height: 1080,
        fps: 30,
      });
      state.result = result;
      elements.progressCard.classList.add("is-hidden");
      elements.resultCard.classList.remove("is-hidden");
      elements.resultName.textContent = basename(result.outputPath);
      elements.resultProof.textContent = `${formatBytes(
        result.receipt.output.sizeBytes,
      )} · ${result.receipt.validation.durationDeltaMilliseconds} ms duration delta · receipt verified`;
    } catch (error) {
      if (!String(error?.message || "").toLowerCase().includes("cancel")) {
        setError(error);
      }
      elements.progressCard.classList.add("is-hidden");
    } finally {
      setRenderState(false);
    }
  }

  elements.audioDrop.addEventListener("click", pickAudio);
  elements.imageDrop.addEventListener("click", pickImage);
  elements.lyricsImport.addEventListener("click", pickLyrics);
  elements.lyricsAutoSync.addEventListener("click", beginAutoSync);
  elements.removeImage.addEventListener("click", clearImage);
  elements.renderButton.addEventListener("click", startRender);
  elements.cancelButton.addEventListener("click", async () => {
    elements.phaseMessage.textContent = "Stopping safely…";
    await api.cancelRender();
  });
  elements.openResult.addEventListener("click", () => {
    if (state.result) api.openFile(state.result.outputPath);
  });
  elements.revealResult.addEventListener("click", () => {
    if (state.result) api.revealFile(state.result.outputPath);
  });
  elements.lyricsInput.addEventListener("input", () => {
    if (!state.internalLyricUpdate) state.lyricProvenance = null;
    scheduleLyricInspection();
  });
  elements.syncClose.addEventListener("click", closeSyncDialog);
  elements.syncEditorClose.addEventListener("click", closeSyncDialog);
  for (const closer of $$("[data-sync-close]")) {
    closer.addEventListener("click", closeSyncDialog);
  }
  elements.listenerInstall.addEventListener("click", installListener);
  elements.listenerManual.addEventListener("click", async () => {
    const alignment = await api.manualLyricTrack(
      elements.lyricsInput.value,
    );
    showAlignmentEditor(alignment);
    state.tapMode = true;
    selectCue(0);
  });
  elements.listenerInstallCancel.addEventListener("click", () =>
    api.cancelListenerInstall(),
  );
  elements.syncCancel.addEventListener("click", () => api.cancelLyricSync());
  elements.syncAccept.addEventListener("click", acceptSyncedLyrics);
  elements.relisten.addEventListener("click", async () => {
    if (
      state.alignment &&
      !window.confirm("Run a fresh listening pass and discard these cue edits?")
    ) {
      return;
    }
    await runAutoSync();
  });
  elements.tapThrough.addEventListener("click", () => {
    const index = nextReviewCue();
    if (index === null) return;
    state.tapMode = true;
    selectCue(index);
    elements.syncAudio.currentTime = Math.max(
      0,
      suggestedCueTime(index) - 2,
    );
    elements.syncAudio.play().catch(() => {});
  });
  elements.syncAudio.addEventListener("play", updateSyncPlayhead);
  elements.syncAudio.addEventListener("timeupdate", updateSyncPlayhead);
  elements.syncWaveform.addEventListener("click", (event) => {
    const bounds = elements.syncWaveform.getBoundingClientRect();
    const ratio = (event.clientX - bounds.left) / Math.max(1, bounds.width);
    elements.syncAudio.currentTime =
      Math.max(0, Math.min(1, ratio)) *
      (elements.syncAudio.duration || state.audio?.duration || 0);
  });
  document.addEventListener("keydown", (event) => {
    if (
      event.code !== "Space" ||
      elements.syncEditor.classList.contains("is-hidden") ||
      elements.syncDialog.classList.contains("is-hidden") ||
      state.selectedCueIndex === null
    ) {
      return;
    }
    if (
      ["INPUT", "TEXTAREA", "BUTTON"].includes(
        document.activeElement?.tagName,
      )
    ) {
      return;
    }
    event.preventDefault();
    const index = state.selectedCueIndex;
    setCueTime(index, elements.syncAudio.currentTime);
    if (state.tapMode) {
      const next = nextReviewCue(index);
      if (next === null) {
        state.tapMode = false;
      } else {
        selectCue(next);
      }
    }
  });

  for (const card of $$(".garment-card")) {
    card.addEventListener("click", () => {
      if (state.rendering) return;
      for (const sibling of $$(".garment-card")) {
        sibling.classList.remove("is-selected");
        sibling.setAttribute("aria-checked", "false");
      }
      card.classList.add("is-selected");
      card.setAttribute("aria-checked", "true");
      state.presetId = card.dataset.preset;
      state.presetName = card.querySelector(".garment-copy strong").textContent;
      refreshSlate();
    });
  }

  wireDropTarget(elements.audioDrop, "audio");
  wireDropTarget(elements.imageDrop, "image");

  window.addEventListener("dragover", (event) => event.preventDefault());
  window.addEventListener("drop", (event) => event.preventDefault());

  api.onPhase(({ message }) => {
    elements.phaseMessage.textContent = message;
  });
  api.onProgress(({ ratio, renderedSeconds, duration }) => {
    const percent = Math.max(0, Math.min(100, Math.round(ratio * 100)));
    elements.progressPercent.textContent = `${percent}%`;
    elements.progressFill.style.width = `${percent}%`;
    elements.progressTime.textContent = `${formatDuration(
      renderedSeconds,
    )} of ${formatDuration(duration)}`;
  });
  api.onListenerInstallProgress(
    ({ label, ratio, receivedBytes, totalBytes }) => {
      const percent = Math.max(0, Math.min(100, Math.round(ratio * 100)));
      elements.listenerInstallLabel.textContent = totalBytes
        ? `${label} · ${formatBytes(receivedBytes)} of ${formatBytes(totalBytes)}`
        : label;
      elements.listenerInstallPercent.textContent = `${percent}%`;
      elements.listenerInstallFill.style.width = `${percent}%`;
    },
  );
  api.onLyricSyncPhase(({ message }) => {
    elements.syncWorkingTitle.textContent = message;
  });
  api.onLyricSyncProgress(({ ratio }) => {
    const percent = Math.max(0, Math.min(100, Math.round(ratio * 100)));
    elements.syncProgressPercent.textContent = `${percent}%`;
    elements.syncProgressFill.style.width = `${percent}%`;
  });

  api
    .getVersion()
    .then((version) => {
      elements.versionLabel.textContent = version;
    })
    .catch(() => {});

  api
    .getBuildInfo()
    .then((info) => {
      const capabilities = Array.isArray(info.capabilities) && info.capabilities.length
        ? info.capabilities.join(", ")
        : "source mode / no packaged capability manifest";
      elements.buildInfoSummary.textContent = `Build ${info.version} · ${info.commit}`;
      elements.buildInfoDetails.textContent = `Built ${info.builtAt} · ${info.rendererProfileGeneration} · ${capabilities}`;
    })
    .catch(() => {
      elements.buildInfoDetails.textContent = "Build provenance unavailable.";
    });

  renderTimeline();
  refreshSlate();
  showLyricSummary(null);
  refreshListenerStatus().catch(() => {});
})();
