(function exposeVideoSourceUi(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (!root) return;
  root.VideoSourceUI = api;
  const install = () => {
    if (root.fullMeasure) {
      api.installVideoSourceControls({ document: root.document, api: root.fullMeasure });
    }
  };
  if (root.document?.readyState === "loading") {
    root.document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})(typeof window !== "undefined" ? window : null, () => {
  function formatVideoHint(binding) {
    const probe = binding?.probe || {};
    const duration = Number(probe.durationSeconds);
    const dimensions = Number(probe.width) > 0 && Number(probe.height) > 0
      ? `${probe.width}×${probe.height}`
      : null;
    return [
      Number.isFinite(duration) ? `${duration.toFixed(duration < 10 ? 1 : 0)}s` : null,
      dimensions,
      binding?.persisted ? "in VSPantry" : "session only",
    ].filter(Boolean).join(" · ");
  }

  function installVideoSourceControls({ document, api } = {}) {
    const sourceMount = document?.querySelector?.("#videoSourceMount");
    const pantryWindow = document?.querySelector?.("#videoPantryWindow");
    const status = pantryWindow?.querySelector?.("#videoPantryStatus");
    const importFolder = pantryWindow?.querySelector?.("#videoFolderImport");
    if (!sourceMount || !pantryWindow || !status || !importFolder || !api) return false;
    if (sourceMount.querySelector("#videoDrop")) return false;

    sourceMount.innerHTML = `
      <div class="video-source-shell">
        <button class="image-drop video-drop" id="videoDrop" type="button">
          <span class="image-icon video-icon" aria-hidden="true"></span>
          <span>
            <strong id="videoDropTitle">Add one video</strong>
            <small id="videoDropHint">Optional · MP4 or WebM</small>
          </span>
          <span class="plus-mark" id="videoAction">+</span>
        </button>
        <div class="video-source-meta">
          <label class="video-pantry-toggle" for="addVideoToPantry">
            <input id="addVideoToPantry" type="checkbox" checked />
            <span class="video-pantry-track" aria-hidden="true"><i></i></span>
            <span>Add to VSPantry</span>
          </label>
          <button class="remove-image is-hidden" id="removeVideo" type="button">Clear video</button>
        </div>
      </div>
    `;

    const chooseButton = sourceMount.querySelector("#videoDrop");
    const title = sourceMount.querySelector("#videoDropTitle");
    const hint = sourceMount.querySelector("#videoDropHint");
    const addToPantry = sourceMount.querySelector("#addVideoToPantry");
    const remove = sourceMount.querySelector("#removeVideo");

    async function refreshPantry() {
      try {
        const catalog = await api.listVideoPantry();
        const count = Array.isArray(catalog?.specimens) ? catalog.specimens.length : 0;
        status.textContent = `${count} specimen${count === 1 ? "" : "s"}`;
        pantryWindow.dataset.pantryState = count ? "populated" : "empty";
      } catch (error) {
        status.textContent = `Unavailable · ${String(error?.message || error)}`;
        pantryWindow.dataset.pantryState = "unavailable";
      }
    }

    chooseButton.addEventListener("click", async () => {
      try {
        const result = await api.chooseVideo({ addToPantry: addToPantry.checked });
        if (!result?.binding) return;
        title.textContent = result.binding.filename || "Video selected";
        hint.textContent = formatVideoHint(result.binding) || "Video selected";
        remove.classList.remove("is-hidden");
        if (Number.isInteger(result.pantryCount)) {
          status.textContent = `${result.pantryCount} specimen${result.pantryCount === 1 ? "" : "s"}`;
          pantryWindow.dataset.pantryState = result.pantryCount ? "populated" : "empty";
        } else if (!result.binding.persisted) {
          status.textContent = "Current video is session only · VSPantry unchanged";
        }
      } catch (error) {
        status.textContent = `Video refused · ${String(error?.message || error)}`;
      }
    });

    importFolder.addEventListener("click", async () => {
      try {
        const result = await api.chooseVideoFolder();
        if (!result) return;
        const refused = Array.isArray(result.refused) ? result.refused.length : 0;
        status.textContent = `${result.catalogSize} total · ${result.admitted} admitted · ${result.duplicates} duplicates${refused ? ` · ${refused} refused` : ""}`;
        pantryWindow.dataset.pantryState = result.catalogSize ? "populated" : "empty";
      } catch (error) {
        status.textContent = `Folder import refused · ${String(error?.message || error)}`;
      }
    });

    remove.addEventListener("click", async () => {
      await api.clearVideo();
      title.textContent = "Add one video";
      hint.textContent = "Optional · MP4 or WebM";
      remove.classList.add("is-hidden");
    });

    void refreshPantry();
    return true;
  }

  return {
    formatVideoHint,
    installVideoSourceControls,
  };
});
