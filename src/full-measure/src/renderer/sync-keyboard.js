(() => {
  const SCRUB_SECONDS = 0.1;

  function loadLyricFoundry() {
    if (document.querySelector('script[data-lyric-foundry="active"]')) return;
    const script = document.createElement("script");
    script.src = "./lyric-foundry-ui.js";
    script.dataset.lyricFoundry = "active";
    document.body.append(script);
  }

  function loadStartingFieldHierarchy() {
    if (document.querySelector('script[data-starting-field="active"]')) return;
    const script = document.createElement("script");
    script.src = "./starting-field-ui.js";
    script.dataset.startingField = "active";
    document.body.append(script);
  }

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

  function scrubPlayhead(direction) {
    const audio = document.querySelector("#syncAudio");
    if (!audio) return;
    const duration = Number.isFinite(audio.duration) ? audio.duration : Infinity;
    audio.currentTime = Math.max(
      0,
      Math.min(duration, audio.currentTime + direction * SCRUB_SECONDS),
    );
  }

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

  loadStartingFieldHierarchy();
  loadLyricFoundry();
})();