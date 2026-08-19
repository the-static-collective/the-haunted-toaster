(function exposeRecentToastsUi(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (!root) return;
  root.RecentToastsUI = api;
  const install = () => {
    if (root.fullMeasure) {
      void api.installBetaHomeProjection({ document: root.document, api: root.fullMeasure });
      void api.applyBetaHomeSlate({ document: root.document, api: root.fullMeasure });
      void api.installRecentToasts({ document: root.document, api: root.fullMeasure });
    }
  };
  if (root.document?.readyState === "loading") {
    root.document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})(typeof window !== "undefined" ? window : null, () => {
  async function installBetaHomeProjection({ document, api } = {}) {
    const homeWindow = document?.querySelector?.("#betaSixUpWindow");
    const homeGrid = document?.querySelector?.("#betaSixUpGrid");
    const homeGenerate = document?.querySelector?.("#betaSixUpGenerate");
    const homeState = document?.querySelector?.("#betaSixUpState");
    const toastFeelChoices = document?.querySelector?.("#toastFeelChoices");
    const garmentHeading = document?.querySelector?.("#garmentHeading");
    const garmentSubheading = document?.querySelector?.("#garmentSubheading");
    const candidateGrid = document?.querySelector?.("#candidateGrid");
    const candidateModal = document?.querySelector?.(".candidate-modal");
    const candidateLaunch = document?.querySelector?.(".candidate-launch");
    const songFacts = document?.querySelector?.("#songFacts");
    if (
      !homeWindow || !homeGrid || !homeGenerate || !toastFeelChoices ||
      !candidateGrid || !candidateModal || !candidateLaunch ||
      typeof api?.getBuildInfo !== "function"
    ) return false;
    if (homeWindow.dataset.betaHomeProjectionInstalled === "true") return false;

    let buildInfo;
    try {
      buildInfo = await api.getBuildInfo();
    } catch {
      return false;
    }
    const capabilities = Array.isArray(buildInfo?.capabilities) ? buildInfo.capabilities : [];
    if (!capabilities.includes("betaCandidateEcologyV1")) return false;

    const view = document.defaultView;
    const Observer = view?.MutationObserver;
    let homeInitiatedGeneration = false;
    let closeTimer = null;

    const songIsReady = () => !songFacts?.classList.contains("is-hidden");
    const setIdleState = () => {
      if (!homeState) return;
      homeState.textContent = songIsReady() ? "Ready for six" : "Waiting for source";
    };

    function selectedCandidateIndex() {
      const selected = candidateGrid.querySelector(".candidate-card.is-selected");
      return selected ? Number(selected.dataset.index) : null;
    }

    function openFocusedSixUp() {
      candidateLaunch.click();
    }

    function scheduleHomeClose() {
      if (!homeInitiatedGeneration || closeTimer) return;
      const tryClose = () => {
        closeTimer = null;
        if (!homeInitiatedGeneration) return;
        const hasFamily = candidateGrid.querySelectorAll(".candidate-card").length > 0;
        const busy = candidateModal.classList.contains("is-busy");
        if (!hasFamily || busy) {
          closeTimer = view?.setTimeout?.(tryClose, 0) || null;
          return;
        }
        const close = candidateModal.querySelector(".candidate-close");
        close?.click();
        homeInitiatedGeneration = false;
      };
      closeTimer = view?.setTimeout?.(tryClose, 0) || null;
    }

    function syncHomeFamily() {
      const cards = [...candidateGrid.querySelectorAll(".candidate-card")];
      if (!cards.length) {
        homeGrid.replaceChildren();
        setIdleState();
        return;
      }

      const selectedIndex = selectedCandidateIndex();
      homeGrid.replaceChildren();
      for (const sourceCard of cards) {
        const index = Number(sourceCard.dataset.index);
        const candidate = document.createElement("button");
        candidate.type = "button";
        candidate.className = "beta-six-up-cell";
        candidate.dataset.index = String(index);
        const active = selectedIndex === index;
        candidate.classList.toggle("is-selected", active);
        candidate.setAttribute("aria-pressed", active ? "true" : "false");
        const sourceImage = sourceCard.querySelector("img");
        const sourceSignature = sourceCard.querySelector(".candidate-copy strong")?.textContent || `Candidate ${index + 1}`;
        candidate.setAttribute("aria-label", `Candidate ${index + 1}: ${sourceSignature}`);
        candidate.title = sourceSignature;
        candidate.innerHTML = `
          <img src="${sourceImage?.getAttribute("src") || ""}" alt="" />
          <b>${index + 1}</b>
        `;
        candidate.addEventListener("click", () => {
          const current = [...candidateGrid.querySelectorAll(".candidate-card")]
            .find((item) => Number(item.dataset.index) === index);
          current?.click();
          openFocusedSixUp();
        });
        homeGrid.append(candidate);
      }
      if (homeState) homeState.textContent = `${cards.length} visions ready`;
      scheduleHomeClose();
    }

    toastFeelChoices.classList.add("is-hidden");
    homeWindow.classList.remove("is-hidden");
    candidateLaunch.classList.add("is-hidden");
    if (garmentHeading) garmentHeading.textContent = "Six-Up";
    if (garmentSubheading) {
      garmentSubheading.textContent = "Six creatures first. Choose one, choose two, or keep playing.";
    }
    setIdleState();

    homeGenerate.addEventListener("click", () => {
      if (!songIsReady()) {
        if (homeState) homeState.textContent = "Choose a song first";
        return;
      }
      homeInitiatedGeneration = true;
      if (homeState) homeState.textContent = "Compiling six exact previews…";
      candidateLaunch.click();
      scheduleHomeClose();
    });

    if (Observer) {
      const gridObserver = new Observer(syncHomeFamily);
      gridObserver.observe(candidateGrid, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "aria-pressed"],
      });
      const modalObserver = new Observer(() => {
        homeGenerate.disabled = candidateModal.classList.contains("is-busy");
        scheduleHomeClose();
      });
      modalObserver.observe(candidateModal, { attributes: true, attributeFilter: ["class"] });
    }

    syncHomeFamily();
    homeWindow.dataset.betaHomeProjectionInstalled = "true";
    return true;
  }

  async function applyBetaHomeSlate({ document, api } = {}) {
    const slateValue = document?.querySelector?.("#slateToastFeel");
    if (!slateValue || typeof api?.getBuildInfo !== "function") return false;
    try {
      const buildInfo = await api.getBuildInfo();
      const capabilities = Array.isArray(buildInfo?.capabilities) ? buildInfo.capabilities : [];
      if (!capabilities.includes("betaCandidateEcologyV1")) return false;

      const container = slateValue.closest("div");
      const label = container?.querySelector("dt");
      const syncSlate = () => {
        if (label && label.textContent !== "Creative field") label.textContent = "Creative field";
        if (slateValue.textContent !== "Six-Up field") slateValue.textContent = "Six-Up field";
      };
      syncSlate();

      const SlateObserver = document?.defaultView?.MutationObserver;
      if (container && SlateObserver && container.dataset.betaHomeSlateObserved !== "true") {
        container.dataset.betaHomeSlateObserved = "true";
        new SlateObserver(syncSlate).observe(container, {
          childList: true,
          characterData: true,
          subtree: true,
        });
      }
      return true;
    } catch {
      return false;
    }
  }

  function normalizeToasts(value) {
    const records = Array.isArray(value) ? value : value?.toasts;
    return Array.isArray(records) ? records.slice(0, 3) : [];
  }

  function verdictLabel(toast) {
    const parts = [];
    if (Number.isInteger(toast?.rating) && toast.rating >= 1 && toast.rating <= 5) {
      parts.push(`${toast.rating}/5`);
    }
    if (typeof toast?.disposition === "string" && toast.disposition.trim()) {
      parts.push(toast.disposition.trim().toUpperCase());
    }
    return parts.join(" · ") || "Unrated";
  }

  function availabilityLabel(toast) {
    if (toast?.mediaAvailable === false) return "Media missing · receipt history kept";
    if (toast?.receiptAvailable === false) return "Receipt unavailable";
    if (toast?.receiptAvailable === true) return "Receipt available";
    return "Witnessed toast";
  }

  function buildRow(document, toast, api) {
    const canOpen = typeof api.openPastToast === "function" && toast?.id != null;
    const row = document.createElement(canOpen ? "button" : "div");
    if (canOpen) row.type = "button";
    row.className = "recent-toast-row";
    if (toast?.id != null) row.dataset.toastId = String(toast.id);
    row.innerHTML = `
      <span class="recent-toast-copy">
        <strong></strong>
        <small></small>
      </span>
      <span class="recent-toast-meta">
        <span></span>
      </span>
    `;
    row.querySelector("strong").textContent = String(toast?.title || "Untitled toast");
    row.querySelector("small").textContent = availabilityLabel(toast);
    row.querySelector(".recent-toast-meta span").textContent = verdictLabel(toast);
    if (canOpen) {
      row.setAttribute("aria-label", `Open past toast ${String(toast?.title || toast.id)}`);
      row.addEventListener("click", () => {
        Promise.resolve(api.openPastToast(toast.id)).catch(() => {});
      });
    }
    return row;
  }

  async function installRecentToasts({ document, api } = {}) {
    const window = document?.querySelector?.("#recentToastsWindow");
    const list = window?.querySelector?.("#recentToastsList");
    const openAll = window?.querySelector?.("#pastToastsOpen");
    if (!window || !list || !openAll || typeof api?.listPastToasts !== "function") {
      window?.classList?.add("is-hidden");
      return false;
    }
    if (window.dataset.recentToastsInstalled === "true") return false;

    let toasts;
    try {
      toasts = normalizeToasts(await api.listPastToasts({ limit: 3 }));
    } catch {
      window.classList.add("is-hidden");
      return false;
    }

    list.replaceChildren();
    list.classList.add("recent-toast-list");
    if (!toasts.length) {
      const empty = document.createElement("p");
      empty.className = "recent-toast-empty";
      empty.textContent = "No witnessed toasts yet.";
      list.append(empty);
    } else {
      for (const toast of toasts) list.append(buildRow(document, toast, api));
    }

    if (typeof api.openPastToasts === "function") {
      openAll.classList.remove("is-hidden");
      openAll.addEventListener("click", () => {
        Promise.resolve(api.openPastToasts()).catch(() => {});
      });
    } else {
      openAll.classList.add("is-hidden");
    }

    window.dataset.recentToastsInstalled = "true";
    window.classList.remove("is-hidden");
    return true;
  }

  return {
    applyBetaHomeSlate,
    availabilityLabel,
    installBetaHomeProjection,
    installRecentToasts,
    normalizeToasts,
    verdictLabel,
  };
});
