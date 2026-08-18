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
  function ensureVideoSourceStyles(document) {
    if (document.querySelector("#videoSourceStyles")) return;
    const style = document.createElement("style");
    style.id = "videoSourceStyles";
    style.textContent = `
      .video-pantry-row {
        align-items: end;
        margin-top: 12px;
      }
      .video-memory-toggle {
        display: flex !important;
        gap: 7px;
        align-items: center;
        justify-content: flex-start !important;
        min-height: 22px;
        margin: 0 2px !important;
        color: var(--muted) !important;
        font-size: 8px !important;
        letter-spacing: 0.3px !important;
        cursor: pointer;
      }
      .video-memory-toggle input[type="checkbox"] {
        flex: 0 0 14px;
        width: 14px;
        height: 14px;
        margin: 0;
        padding: 0;
        border-radius: 3px;
        accent-color: var(--gold);
      }
      .video-folder-field .lyrics-import {
        min-height: 22px;
      }
    `;
    document.head.appendChild(style);
  }

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
    const panel = document?.querySelector?.(".inputs-panel");
    if (!panel || panel.querySelector("#videoSourceBlock")) return false;
    const anchor = panel.querySelector(".field-row");
    if (!anchor || !api) return false;
    ensureVideoSourceStyles(document);

    const block = document.createElement("div");
    block.id = "videoSourceBlock";
    block.className = "video-source-block";
    block.innerHTML = `
      <button class="image-drop" id="videoDrop" type="button">
        <span class="image-icon" aria-hidden="true"></span>
        <span>
          <strong id="videoDropTitle">Add one video</strong>
          <small id="videoDropHint">Optional · MP4 or WebM</small>
        </span>
        <span class="plus-mark" id="videoAction">+</span>
      </button>
      <div class="field-row video-pantry-row">
        <label class="field" for="addVideoToPantry">
          <span>Video memory</span>
          <span class="video-memory-toggle"><input id="addVideoToPantry" type="checkbox" checked /> Add to VSPantry</span>
        </label>
        <div class="field video-folder-field">
          <span>Visual specimens</span>
          <button class="lyrics-import" id="videoFolderImport" type="button">Import video folder</button>
        </div>
      </div>
      <div class="lyrics-status">
        <small id="videoPantryStatus">VSPantry · reading local catalogue…</small>
        <button class="remove-image is-hidden" id="removeVideo" type="button">Clear video</button>
      </div>
    `;
    anchor.before(block);

    const chooseButton = block.querySelector("#videoDrop");
    const title = block.querySelector("#videoDropTitle");
    const hint = block.querySelector("#videoDropHint");
    const addToPantry = block.querySelector("#addVideoToPantry");
    const importFolder = block.querySelector("#videoFolderImport");
    const status = block.querySelector("#videoPantryStatus");
    const remove = block.querySelector("#removeVideo");

    async function refreshPantry() {
      try {
        const catalog = await api.listVideoPantry();
        const count = Array.isArray(catalog?.specimens) ? catalog.specimens.length : 0;
        status.textContent = `VSPantry · ${count} specimen${count === 1 ? "" : "s"}`;
      } catch (error) {
        status.textContent = `VSPantry unavailable · ${String(error?.message || error)}`;
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
          status.textContent = `VSPantry · ${result.pantryCount} specimen${result.pantryCount === 1 ? "" : "s"}`;
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
        status.textContent = `VSPantry · ${result.catalogSize} total · ${result.admitted} admitted · ${result.duplicates} duplicates${refused ? ` · ${refused} refused` : ""}`;
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
