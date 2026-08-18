(() => {
  const api = window.fullMeasure;
  if (!api?.getYouTubeStatus) return;

  const resultCard = document.getElementById("resultCard");
  const resultName = document.getElementById("resultName");
  const titleInput = document.getElementById("titleInput");
  const youtubePublishCard = document.getElementById("youtubePublishCard");
  const youtubeClientSetup = document.getElementById("youtubeClientSetup");
  const youtubeClientId = document.getElementById("youtubeClientId");
  const youtubeSaveClientId = document.getElementById("youtubeSaveClientId");
  const youtubePublishButton = document.getElementById("youtubePublishButton");
  const youtubeCancelButton = document.getElementById("youtubeCancelButton");
  const youtubeProgress = document.getElementById("youtubeProgress");
  const youtubeProgressFill = document.getElementById("youtubeProgressFill");
  const youtubeProgressText = document.getElementById("youtubeProgressText");
  const youtubeStatusText = document.getElementById("youtubeStatusText");
  const youtubeStudioButton = document.getElementById("youtubeStudioButton");

  if (
    !resultCard ||
    !youtubePublishCard ||
    !youtubeClientSetup ||
    !youtubeClientId ||
    !youtubeSaveClientId ||
    !youtubePublishButton ||
    !youtubeCancelButton ||
    !youtubeProgress ||
    !youtubeProgressFill ||
    !youtubeProgressText ||
    !youtubeStatusText ||
    !youtubeStudioButton
  ) {
    return;
  }

  const state = {
    youtube: {
      configured: false,
      connected: false,
      publishing: false,
      videoId: null,
    },
  };

  function renderedToastIsVisible() {
    return !resultCard.classList.contains("is-hidden");
  }

  function uploadTitle() {
    const explicit = String(titleInput?.value || "").trim();
    if (explicit) return explicit.slice(0, 100);
    const rendered = String(resultName?.textContent || "")
      .trim()
      .replace(/\.mp4$/i, "");
    return (rendered || "Haunted Toaster video").slice(0, 100);
  }

  function setStatus(message, tone = "normal") {
    youtubeStatusText.textContent = message;
    youtubeStatusText.dataset.tone = tone;
  }

  function setProgress(ratio) {
    const bounded = Math.max(0, Math.min(1, Number(ratio) || 0));
    const percent = Math.round(bounded * 100);
    youtubeProgressFill.style.width = `${percent}%`;
    youtubeProgressText.textContent = `${percent}% uploaded`;
  }

  function applyStatus(status = {}) {
    state.youtube.configured = status.configured === true;
    state.youtube.connected = status.connected === true;
    state.youtube.publishing = status.publishing === true;

    const canPublish = status.canPublish === true && renderedToastIsVisible();
    youtubePublishCard.classList.toggle("is-hidden", !canPublish);
    if (canPublish) youtubePublishCard.classList.remove("is-hidden");

    youtubeClientSetup.classList.toggle("is-hidden", state.youtube.configured);
    youtubePublishButton.disabled = !state.youtube.configured || state.youtube.publishing;
    youtubePublishButton.textContent = state.youtube.connected
      ? "Upload privately"
      : "Connect + upload privately";
    youtubeCancelButton.classList.toggle("is-hidden", !state.youtube.publishing);

    if (!state.youtube.videoId && !state.youtube.publishing) {
      youtubeProgress.classList.add("is-hidden");
      setProgress(0);
      youtubeStudioButton.classList.add("is-hidden");
    }
  }

  async function refreshStatus() {
    try {
      const status = await api.getYouTubeStatus();
      applyStatus(status);
    } catch (error) {
      youtubePublishCard.classList.toggle("is-hidden", !renderedToastIsVisible());
      setStatus(error?.message || "YouTube status is unavailable.", "error");
    }
  }

  youtubeSaveClientId.addEventListener("click", async () => {
    youtubeSaveClientId.disabled = true;
    try {
      const status = await api.configureYouTube(youtubeClientId.value);
      youtubeClientId.value = "";
      applyStatus(status);
      setStatus(
        "Client ID saved. The first upload will open Google in your browser to connect YouTube.",
        "success",
      );
    } catch (error) {
      setStatus(error?.message || "Could not save the YouTube client ID.", "error");
    } finally {
      youtubeSaveClientId.disabled = false;
    }
  });

  youtubePublishButton.addEventListener("click", async () => {
    if (state.youtube.publishing) return;
    state.youtube.publishing = true;
    state.youtube.videoId = null;
    youtubePublishButton.disabled = true;
    youtubeCancelButton.classList.remove("is-hidden");
    youtubeStudioButton.classList.add("is-hidden");
    youtubeProgress.classList.remove("is-hidden");
    setProgress(0);
    setStatus(
      state.youtube.connected
        ? "Starting private YouTube upload…"
        : "Opening Google to connect YouTube…",
    );

    try {
      const result = await api.publishToYouTube({
        title: uploadTitle(),
        description: "",
      });
      state.youtube.videoId = result.videoId;
      state.youtube.connected = true;
      setProgress(1);
      youtubeStudioButton.classList.remove("is-hidden");
      setStatus(
        "Uploaded privately. Open YouTube Studio to choose Public or Unlisted when you are ready.",
        "success",
      );
    } catch (error) {
      const message = error?.message || "YouTube upload failed.";
      setStatus(
        /cancel/i.test(message) ? "YouTube upload cancelled." : message,
        /cancel/i.test(message) ? "normal" : "error",
      );
    } finally {
      state.youtube.publishing = false;
      youtubePublishButton.disabled = !state.youtube.configured;
      youtubeCancelButton.classList.add("is-hidden");
    }
  });

  youtubeCancelButton.addEventListener("click", async () => {
    youtubeCancelButton.disabled = true;
    try {
      await api.cancelYouTubePublish();
      setStatus("Cancelling YouTube upload…");
    } finally {
      youtubeCancelButton.disabled = false;
    }
  });

  youtubeStudioButton.addEventListener("click", async () => {
    if (!state.youtube.videoId) return;
    youtubeStudioButton.disabled = true;
    try {
      await api.openYouTubeStudio(state.youtube.videoId);
    } catch (error) {
      setStatus(error?.message || "Could not open YouTube Studio.", "error");
    } finally {
      youtubeStudioButton.disabled = false;
    }
  });

  api.onYouTubeProgress((progress) => {
    if (!state.youtube.publishing) return;
    setProgress(progress?.ratio);
    const uploaded = Number(progress?.uploadedBytes) || 0;
    const total = Number(progress?.sizeBytes) || 0;
    if (uploaded > 0 && total > 0) {
      const uploadedMb = (uploaded / 1_048_576).toFixed(1);
      const totalMb = (total / 1_048_576).toFixed(1);
      youtubeProgressText.textContent = `${uploadedMb} / ${totalMb} MB`;
    }
  });

  const resultObserver = new MutationObserver(() => {
    if (!renderedToastIsVisible()) {
      youtubePublishCard.classList.add("is-hidden");
      state.youtube.videoId = null;
      return;
    }
    refreshStatus();
  });
  resultObserver.observe(resultCard, {
    attributes: true,
    attributeFilter: ["class"],
  });

  refreshStatus();
})();
