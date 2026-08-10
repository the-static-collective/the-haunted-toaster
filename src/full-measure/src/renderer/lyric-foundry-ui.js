(() => {
  const api = window.fullMeasure;
  if (!api) return;

  const lyricsInput = document.querySelector("#lyricsInput");
  const timingPill = document.querySelector("#timingPill");
  const countLabel = document.querySelector("#lyricsCountLabel");
  const statusText = document.querySelector("#lyricsStatusText");
  const listenCloser = document.querySelector("#lyricsAutoSync");
  const cueList = document.querySelector("#cueList");
  const relisten = document.querySelector("#relisten");

  const ANCHOR_ENVELOPE_PREFIX = "[[HT_ANCHORS_V1:";
  const ANCHOR_ENVELOPE_SUFFIX = "]]";

  let pendingHumanAnchors = [];
  let restoringAnchors = false;

  function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
  }

  function parseDisplayedTime(value) {
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

  function collectHumanAnchors() {
    return rows()
      .filter((row) => row.dataset.status === "human")
      .map((row) => ({
        cueIndex: Number(row.dataset.cueIndex),
        text: row.querySelector(".cue-copy strong")?.textContent || "",
        time: preciseRowTime(row),
      }))
      .filter(
        (anchor) =>
          Number.isInteger(anchor.cueIndex) &&
          anchor.text &&
          Number.isFinite(anchor.time),
      );
  }

  function packAnchorEnvelope(source, anchors) {
    if (!anchors.length) return source;
    const evidence = anchors.map((anchor) => ({
      lineIndex: anchor.cueIndex,
      text: anchor.text,
      time: anchor.time,
    }));
    return `${ANCHOR_ENVELOPE_PREFIX}${encodeURIComponent(JSON.stringify(evidence))}${ANCHOR_ENVELOPE_SUFFIX}\n${source}`;
  }

  function restoreHumanAnchors() {
    if (!pendingHumanAnchors.length || restoringAnchors) return;
    const currentRows = rows();
    if (!currentRows.length) return;

    restoringAnchors = true;
    try {
      let restored = 0;
      for (const anchor of pendingHumanAnchors) {
        const indexedRow = Number.isInteger(anchor.cueIndex)
          ? currentRows.find(
              (candidate) =>
                Number(candidate.dataset.cueIndex) === anchor.cueIndex &&
                candidate.querySelector(".cue-copy strong")?.textContent === anchor.text,
            )
          : null;
        const row =
          indexedRow ||
          currentRows.find(
            (candidate) =>
              candidate.querySelector(".cue-copy strong")?.textContent === anchor.text,
          );
        const input = row?.querySelector(".cue-time");
        if (!input) continue;
        input.value = String(anchor.time);
        input.dispatchEvent(new Event("change", { bubbles: true }));
        restored += 1;
      }
      if (restored === pendingHumanAnchors.length) {
        pendingHumanAnchors = [];
      }
    } finally {
      restoringAnchors = false;
    }
  }

  timingPill &&
    new MutationObserver(refreshMainLyricTruth).observe(timingPill, {
      childList: true,
      characterData: true,
      subtree: true,
    });

  cueList &&
    new MutationObserver(restoreHumanAnchors).observe(cueList, {
      childList: true,
      subtree: true,
    });

  if (relisten) {
    relisten.title =
      "Re-listen around what you have already anchored. Your human timing edits will be kept.";
  }

  relisten?.addEventListener(
    "click",
    () => {
      pendingHumanAnchors = collectHumanAnchors();
      const originalLyrics = lyricsInput.value;
      if (pendingHumanAnchors.length) {
        lyricsInput.value = packAnchorEnvelope(originalLyrics, pendingHumanAnchors);
      }

      // Re-listening refreshes machine evidence, but human timing evidence is
      // durable. Suppress the legacy destructive warning for every re-listen;
      // anchors ride only inside this transient Listener request and the
      // visible lyric source is restored immediately afterward.
      const originalConfirm = window.confirm;
      window.confirm = () => true;
      queueMicrotask(() => {
        window.confirm = originalConfirm;
        lyricsInput.value = originalLyrics;
      });
    },
    true,
  );

  refreshMainLyricTruth();
})();
