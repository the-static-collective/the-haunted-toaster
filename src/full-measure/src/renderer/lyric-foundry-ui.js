(() => {
  const api = window.fullMeasure;
  if (!api) return;

  const lyricsInput = document.querySelector("#lyricsInput");
  const timingPill = document.querySelector("#timingPill");
  const countLabel = document.querySelector("#lyricsCountLabel");
  const statusText = document.querySelector("#lyricsStatusText");
  const listenCloser = document.querySelector("#lyricsAutoSync");
  const syncAccept = document.querySelector("#syncAccept");
  const syncEditorClose = document.querySelector("#syncEditorClose");
  const syncSaveNote = document.querySelector("#syncSaveNote");
  const cueList = document.querySelector("#cueList");
  const relisten = document.querySelector("#relisten");

  let pendingHumanAnchors = [];
  let restoringAnchors = false;
  let acceptingPartial = false;

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
      timingPill.textContent = `Listened · ${placed} placed · ${unresolved} unresolved`;
      if (countLabel) countLabel.textContent = "admitted timed cues";
      if (statusText) {
        statusText.textContent = "Create uses only admitted timing. Unresolved phrases remain unresolved.";
      }
    } else if (timingPill.textContent === "Approximate") {
      const count = phraseCount();
      timingPill.textContent = `Prepared · ${count} phrase${count === 1 ? "" : "s"}`;
      if (countLabel) countLabel.textContent = "timing unresolved";
      if (statusText) {
        statusText.textContent = "The Toaster can create with this as-is. Timing uncertainty will not be invented.";
      }
    } else if (timingPill.textContent === "No lyrics" && statusText) {
      statusText.textContent = "Lyrics are optional.";
    }

    if (listenCloser) {
      listenCloser.textContent = "Listen Closer";
      listenCloser.title = "Optional · help the Toaster place lyrics more precisely";
    }
  }

  function rows() {
    return [...(cueList?.querySelectorAll(".cue-row") || [])];
  }

  function collectHumanAnchors() {
    return rows()
      .filter((row) => row.dataset.status === "human")
      .map((row) => ({
        text: row.querySelector(".cue-copy strong")?.textContent || "",
        time: parseDisplayedTime(row.querySelector(".cue-time")?.value),
      }))
      .filter((anchor) => anchor.text && Number.isFinite(anchor.time));
  }

  function collectPlacedCues() {
    return rows()
      .map((row, lineIndex) => ({
        lineIndex,
        text: row.querySelector(".cue-copy strong")?.textContent || "",
        start: parseDisplayedTime(row.querySelector(".cue-time")?.value),
        status: row.dataset.status || "unmatched",
      }))
      .filter((cue) => cue.text && Number.isFinite(cue.start));
  }

  function unresolvedCount() {
    return rows().filter(
      (row) => !Number.isFinite(parseDisplayedTime(row.querySelector(".cue-time")?.value)),
    ).length;
  }

  function refreshAcceptLaw() {
    if (!syncAccept) return;
    syncAccept.disabled = false;
    syncAccept.textContent = "Use what we know";
  }

  async function acceptPartialListening(event) {
    const acceptButton = event.target?.closest?.("#syncAccept");
    if (acceptButton !== syncAccept) return;

    const missing = unresolvedCount();
    if (!missing) return;

    // Intercept before the legacy target listener sees the click. The base
    // renderer still rejects any alignment with an unplaced cue; Foundry law
    // admits useful partial timing instead.
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    if (acceptingPartial) return;
    acceptingPartial = true;

    const placed = collectPlacedCues();
    const title = document.querySelector("#titleInput")?.value?.trim() || "";
    const artist = document.querySelector("#artistInput")?.value?.trim() || "";
    const humanCount = placed.filter((cue) => cue.status === "human").length;

    try {
      lyricsInput.dataset.lyricFoundryMode = "listened-partial";
      lyricsInput.dataset.lyricFoundryPlacedCount = String(placed.length);
      lyricsInput.dataset.lyricFoundryUnresolvedCount = String(missing);
      lyricsInput.dataset.lyricFoundryHumanAnchorCount = String(humanCount);

      if (placed.length) {
        const lrc = await api.formatLrc({
          cues: placed,
          title,
          artist,
          note: `${placed.length} admitted placements · ${missing} unresolved · ${humanCount} human anchors`,
        });
        lyricsInput.value = lrc;
        lyricsInput.dispatchEvent(new Event("input", { bubbles: true }));
      }

      if (syncSaveNote) {
        syncSaveNote.textContent = `${placed.length} placed · ${missing} unresolved. Only admitted timing will render.`;
      }
      refreshMainLyricTruth();
      syncEditorClose?.click();
    } catch (error) {
      if (syncSaveNote) {
        syncSaveNote.textContent = `Could not admit the reviewed timing: ${error?.message || error}`;
      }
    } finally {
      acceptingPartial = false;
      refreshAcceptLaw();
    }
  }

  function restoreHumanAnchors() {
    if (!pendingHumanAnchors.length || restoringAnchors) return;
    const currentRows = rows();
    if (!currentRows.length) return;

    restoringAnchors = true;
    try {
      let restored = 0;
      for (const anchor of pendingHumanAnchors) {
        const row = currentRows.find(
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
      refreshAcceptLaw();
    }
  }

  timingPill &&
    new MutationObserver(refreshMainLyricTruth).observe(timingPill, {
      childList: true,
      characterData: true,
      subtree: true,
    });

  cueList &&
    new MutationObserver(() => {
      refreshAcceptLaw();
      restoreHumanAnchors();
    }).observe(cueList, { childList: true, subtree: true });

  document.addEventListener("click", acceptPartialListening, true);

  relisten?.addEventListener(
    "click",
    () => {
      pendingHumanAnchors = collectHumanAnchors();
      if (!pendingHumanAnchors.length) return;

      // The renderer's old confirmation claims re-listening discards edits.
      // #62 changes that law: explicit human anchors survive the fresh pass.
      const originalConfirm = window.confirm;
      window.confirm = () => true;
      queueMicrotask(() => {
        window.confirm = originalConfirm;
      });
    },
    true,
  );

  refreshMainLyricTruth();
  refreshAcceptLaw();
})();
