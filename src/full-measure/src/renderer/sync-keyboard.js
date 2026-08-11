(() => {
  const SCRUB_SECONDS = 0.1;
  const WAVEFORM_SEEK_SECONDS = 5;
  let waveformPointerId = null;

  function editorIsActive() {
    const dialog = document.querySelector("#syncDialog");
    const editor = document.querySelector("#syncEditor");
    return Boolean(
      dialog &&
      editor &&
      !dialog.classList.contains("is-hidden") &&
      !editor.classList.contains("is-hidden")
    );
  }

  function editingControlHasFocus() {
    return ["INPUT", "TEXTAREA", "BUTTON"].includes(
      document.activeElement?.tagName,
    );
  }

  function moveLine(direction) {
    const rows = [...document.querySelectorAll("#cueList .cue-row")];
    if (!rows.length) return;
    const selected = rows.findIndex((row) => row.classList.contains("is-selected"));
    const current = selected >= 0 ? selected : 0;
    const target = Math.max(0, Math.min(rows.length - 1, current + direction));
    rows[target].click();
  }

  function mediaDuration(audio) {
    const duration = Number(audio?.duration);
    return Number.isFinite(duration) && duration > 0 ? duration : 0;
  }

  function formatDuration(seconds) {
    const total = Math.max(0, Math.round(Number(seconds) || 0));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const remainder = total % 60;
    if (hours) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
    }
    return `${minutes}:${String(remainder).padStart(2, "0")}`;
  }

  function updateWaveformTransport() {
    const audio = document.querySelector("#syncAudio");
    const waveform = document.querySelector("#syncWaveform");
    const playhead = document.querySelector("#syncPlayhead");
    const readout = document.querySelector("#syncTimeReadout");
    if (!audio || !waveform || !playhead || !readout) return;

    const duration = mediaDuration(audio);
    const current = duration
      ? Math.max(0, Math.min(duration, Number(audio.currentTime) || 0))
      : 0;
    const ratio = duration ? current / duration : 0;
    const label = `${formatDuration(current)} / ${formatDuration(duration)}`;

    playhead.style.left = `${Math.max(0, Math.min(100, ratio * 100))}%`;
    readout.textContent = label;
    waveform.setAttribute("aria-valuemax", String(duration));
    waveform.setAttribute("aria-valuenow", String(Number(current.toFixed(3))));
    waveform.setAttribute("aria-valuetext", label);
  }

  function seekWaveform(seconds) {
    const audio = document.querySelector("#syncAudio");
    if (!audio) return;
    const duration = mediaDuration(audio);
    if (!duration) {
      updateWaveformTransport();
      return;
    }
    audio.currentTime = Math.max(0, Math.min(duration, Number(seconds) || 0));
    updateWaveformTransport();
  }

  function seekWaveformFromPointer(event) {
    const waveform = document.querySelector("#syncWaveform");
    const audio = document.querySelector("#syncAudio");
    if (!waveform || !audio) return;
    const bounds = waveform.getBoundingClientRect();
    const ratio = (event.clientX - bounds.left) / Math.max(1, bounds.width);
    seekWaveform(Math.max(0, Math.min(1, ratio)) * mediaDuration(audio));
  }

  function scrubPlayhead(direction) {
    const audio = document.querySelector("#syncAudio");
    if (!audio) return;
    const duration = mediaDuration(audio) || Infinity;
    audio.currentTime = Math.max(
      0,
      Math.min(duration, audio.currentTime + direction * SCRUB_SECONDS),
    );
    updateWaveformTransport();
  }

  function installWaveformTransport() {
    const waveform = document.querySelector("#syncWaveform");
    const audio = document.querySelector("#syncAudio");
    if (!waveform || !audio) return;

    waveform.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      waveformPointerId = event.pointerId;
      waveform.setPointerCapture?.(event.pointerId);
      seekWaveformFromPointer(event);
    });

    waveform.addEventListener("pointermove", (event) => {
      if (waveformPointerId === null || event.pointerId !== waveformPointerId) return;
      event.preventDefault();
      seekWaveformFromPointer(event);
    });

    const endScrub = (event) => {
      if (waveformPointerId === null || event.pointerId !== waveformPointerId) return;
      event.preventDefault();
      try {
        waveform.releasePointerCapture?.(event.pointerId);
      } catch {
        // Pointer capture may already have been released by the host.
      }
      waveformPointerId = null;
    };
    waveform.addEventListener("pointerup", endScrub);
    waveform.addEventListener("pointercancel", endScrub);

    waveform.addEventListener("click", updateWaveformTransport);

    waveform.addEventListener("keydown", (event) => {
      let target = null;
      if (event.key === "ArrowLeft") {
        target = (Number(audio.currentTime) || 0) - WAVEFORM_SEEK_SECONDS;
      } else if (event.key === "ArrowRight") {
        target = (Number(audio.currentTime) || 0) + WAVEFORM_SEEK_SECONDS;
      } else if (event.key === "Home") {
        target = 0;
      } else if (event.key === "End") {
        target = mediaDuration(audio);
      } else {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      seekWaveform(target);
    });

    for (const eventName of [
      "loadedmetadata",
      "durationchange",
      "timeupdate",
      "seeked",
      "play",
      "pause",
    ]) {
      audio.addEventListener(eventName, updateWaveformTransport);
    }

    updateWaveformTransport();
  }

  // Chromium's native <audio controls> consumes arrow keys as volume/seek
  // before the ordinary document bubble handler sees them. While the Listener
  // editor owns the room, claim those keys at capture phase and route them to
  // the Listener's navigation/scrub laws instead.
  document.addEventListener("keydown", (event) => {
    if (!editorIsActive()) return;
    const audio = document.querySelector("#syncAudio");
    if (!audio || event.target !== audio) return;

    if (event.code === "ArrowUp" || event.code === "ArrowDown") {
      event.preventDefault();
      event.stopPropagation();
      moveLine(event.code === "ArrowUp" ? -1 : 1);
      return;
    }
    if (event.code === "ArrowLeft" || event.code === "ArrowRight") {
      event.preventDefault();
      event.stopPropagation();
      scrubPlayhead(event.code === "ArrowLeft" ? -1 : 1);
    }
  }, true);

  document.addEventListener("keydown", (event) => {
    if (!editorIsActive() || editingControlHasFocus()) return;

    if (event.code === "ArrowUp" || event.code === "ArrowDown") {
      event.preventDefault();
      moveLine(event.code === "ArrowUp" ? -1 : 1);
      return;
    }

    if (event.code === "ArrowLeft" || event.code === "ArrowRight") {
      event.preventDefault();
      scrubPlayhead(event.code === "ArrowLeft" ? -1 : 1);
    }
  });

  installWaveformTransport();
})();
