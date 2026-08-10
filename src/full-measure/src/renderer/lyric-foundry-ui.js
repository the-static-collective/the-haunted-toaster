(() => {
  const api = window.fullMeasure;
  if (!api) return;

  const lyricsInput = document.querySelector("#lyricsInput");
  const timingPill = document.querySelector("#timingPill");
  const countLabel = document.querySelector("#lyricsCountLabel");
  const statusText = document.querySelector("#lyricsStatusText");
  const listenCloser = document.querySelector("#lyricsAutoSync");
  const cueList = document.querySelector("#cueList");
  const originalRelisten = document.querySelector("#relisten");

  let pendingBeforeEvidence = null;
  let pendingAnchorCount = 0;
  let deltaScheduled = false;

  function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
  }

  function parseDisplayedTime(value) {
    const normalized = String(value || "").trim().replace(",", ".");
    if (/^\d+(?:\.\d+)?$/.test(normalized)) return Number(normalized);
    const parts = normalized.split(":").map(Number);
    if (parts.length !== 2 || parts.some((part) => !Number.isFinite(part) || part < 0)) return null;
    return parts[0] * 60 + parts[1];
  }

  function phraseCount() {
    const value = Number(document.querySelector("#wordLineCount")?.textContent);
    return Number.isFinite(value) ? value : 0;
  }

  function refreshMainLyricTruth() {
    if (!timingPill || !lyricsInput) return;

    if (lyricsInput.dataset.lyricFoundryMode === "listened-partial") {
      const placed = Number(lyricsInput.dataset.lyricFoundryPlacedCount) || 0;
      const unresolved = Number(lyricsInput.dataset.lyricFoundryUnresolvedCount) || 0;
      setText(timingPill, `Listened · ${placed} placed · ${unresolved} unresolved`);
      setText(countLabel, "admitted timed cues");
      setText(statusText, "Create uses only admitted timing. Unresolved phrases remain unresolved.");
    } else if (timingPill.textContent === "Approximate") {
      const count = phraseCount();
      setText(timingPill, `Prepared · ${count} phrase${count === 1 ? "" : "s"}`);
      setText(countLabel, "timing unresolved");
      setText(statusText, "The Toaster can create with this as-is. Timing uncertainty will not be invented.");
    } else if (timingPill.textContent === "No lyrics") {
      setText(statusText, "Lyrics are optional.");
    }

    if (listenCloser) {
      setText(listenCloser, "Listen Closer");
      listenCloser.title = "Optional · help the Toaster place lyrics more precisely";
    }
  }

  function rows() {
    return [...(cueList?.querySelectorAll(".cue-row") || [])];
  }

  function preciseRowTime(row) {
    const sliderTime = Number(row.querySelector(".cue-slider")?.value);
    if (Number.isFinite(sliderTime)) return sliderTime;
    return parseDisplayedTime(row.querySelector(".cue-time")?.value);
  }

  function ensureEvidenceSurfaces() {
    const top = document.querySelector(".sync-editor-top");
    if (!top) return {};
    let prep = document.querySelector("#lyricPrepReceipt");
    if (!prep) {
      prep = document.createElement("details");
      prep.id = "lyricPrepReceipt";
      prep.className = "lyric-prep-receipt";
      const summary = document.createElement("summary");
      summary.textContent = "LYRIC PREP RECEIPT";
      const body = document.createElement("div");
      body.className = "lyric-prep-receipt-body";
      prep.append(summary, body);
      top.insertAdjacentElement("afterend", prep);
    }
    let delta = document.querySelector("#relistenDelta");
    if (!delta) {
      delta = document.createElement("p");
      delta.id = "relistenDelta";
      delta.className = "relisten-delta";
      delta.hidden = true;
      prep.insertAdjacentElement("afterend", delta);
    }
    return { prep, delta };
  }

  function refreshPrepReceipt() {
    const { prep } = ensureEvidenceSurfaces();
    if (!prep || !lyricsInput || typeof api.prepareListenerLyrics !== "function") return [];
    const result = api.prepareListenerLyrics(lyricsInput.value);
    const removedLabelsAndNotes = result.structuralLabelsRemoved + result.performanceNotesRemoved;
    const body = prep.querySelector(".lyric-prep-receipt-body");
    if (body) {
      body.replaceChildren();
      const compact = document.createElement("p");
      compact.textContent = `${result.retainedPhraseCount} phrases retained · ${removedLabelsAndNotes} headings/notes removed · ${result.wrapsJoined} wrap${result.wrapsJoined === 1 ? "" : "s"} joined`;
      body.append(compact);
      const list = document.createElement("ul");
      for (const entry of result.removed.filter((item) => item.reason !== "blank")) {
        const item = document.createElement("li");
        item.textContent = `line ${entry.sourceLines.join("–")} ${entry.raw.trim()} → ${entry.reason}`;
        list.append(item);
      }
      for (const line of result.prepared.filter((entry) => entry.decisions.includes("merged-indented-wrap"))) {
        const item = document.createElement("li");
        item.textContent = `lines ${line.sourceLines.join("–")} → indented wrap joined`;
        list.append(item);
      }
      if (list.childElementCount) body.append(list);
    }
    return result.prepared;
  }

  function annotateRows() {
    const prepared = refreshPrepReceipt();
    const currentRows = rows();
    for (const [index, row] of currentRows.entries()) {
      const line = prepared[index];
      if (line) row.dataset.lineId = line.lineId;
    }
    return currentRows;
  }

  function collectHumanAnchors() {
    return annotateRows()
      .filter((row) => row.dataset.status === "human")
      .map((row) => ({
        lineId: row.dataset.lineId || "",
        mediaTimeMs: Math.round(preciseRowTime(row) * 1000),
        source: "human-edit",
        anchorVersion: "lyric-anchor/v1",
      }))
      .filter((anchor) => anchor.lineId && Number.isFinite(anchor.mediaTimeMs) && anchor.mediaTimeMs >= 0);
  }

  function collectCurrentEvidence() {
    return annotateRows().map((row) => {
      const start = preciseRowTime(row);
      return {
        lineId: row.dataset.lineId || "",
        start: Number.isFinite(start) && !row.classList.contains("is-unplaced") ? start : null,
        status: row.dataset.status || "unmatched",
        humanCorrected: row.dataset.status === "human",
      };
    }).filter((entry) => entry.lineId);
  }

  function renderRelistenDelta(before, after, anchorCount) {
    const { delta } = ensureEvidenceSurfaces();
    if (!delta) return;
    const beforeByLine = new Map(before.map((entry) => [entry.lineId, entry]));
    let recovered = 0;
    let lost = 0;
    let unresolved = 0;
    for (const entry of after) {
      const prior = beforeByLine.get(entry.lineId);
      const isPlaced = Number.isFinite(entry.start);
      const wasPlaced = Number.isFinite(prior?.start);
      if (!isPlaced) unresolved += 1;
      if (prior && !wasPlaced && isPlaced && entry.status !== "human") recovered += 1;
      if (prior && wasPlaced && prior.status !== "human" && !isPlaced) lost += 1;
    }
    delta.hidden = false;
    delta.textContent = `${anchorCount} human anchor${anchorCount === 1 ? "" : "s"} held · ${recovered} machine phrase${recovered === 1 ? "" : "s"} recovered · ${unresolved} unresolved${lost ? ` · ${lost} machine placement${lost === 1 ? "" : "s"} lost` : ""}`;
  }

  timingPill && new MutationObserver(refreshMainLyricTruth).observe(timingPill, {
    childList: true,
    characterData: true,
    subtree: true,
  });

  cueList && new MutationObserver(() => {
    if (deltaScheduled) return;
    deltaScheduled = true;
    queueMicrotask(() => {
      deltaScheduled = false;
      const after = collectCurrentEvidence();
      if (pendingBeforeEvidence && after.length) {
        renderRelistenDelta(pendingBeforeEvidence, after, pendingAnchorCount);
        pendingBeforeEvidence = null;
        pendingAnchorCount = 0;
      }
    });
  }).observe(cueList, { childList: true, subtree: true });

  lyricsInput?.addEventListener("input", refreshPrepReceipt);

  if (originalRelisten) {
    const relisten = originalRelisten.cloneNode(true);
    originalRelisten.replaceWith(relisten);
    relisten.title = "Re-listen around what you have already anchored. Your human timing edits will be kept.";
    relisten.addEventListener("click", () => {
      const previousEvidence = collectCurrentEvidence();
      const anchors = collectHumanAnchors();
      pendingBeforeEvidence = previousEvidence;
      pendingAnchorCount = anchors.length;
      api.stageListenerEvidence?.({ anchors, previousEvidence });
      listenCloser?.click();
    });
  }

  window.hauntedListenerEvidence = {
    collectHumanAnchors,
    collectCurrentEvidence,
  };

  ensureEvidenceSurfaces();
  refreshPrepReceipt();
  refreshMainLyricTruth();
})();
