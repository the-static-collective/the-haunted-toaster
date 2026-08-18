(function exposeRecentToastsUi(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (!root) return;
  root.RecentToastsUI = api;
  const install = () => {
    if (root.fullMeasure) {
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
  async function applyBetaHomeSlate({ document, api } = {}) {
    const slateValue = document?.querySelector?.("#slateToastFeel");
    if (!slateValue || typeof api?.getBuildInfo !== "function") return false;
    try {
      const buildInfo = await api.getBuildInfo();
      const capabilities = Array.isArray(buildInfo?.capabilities) ? buildInfo.capabilities : [];
      if (!capabilities.includes("betaCandidateEcologyV1")) return false;
      const label = slateValue.closest("div")?.querySelector("dt");
      if (label) label.textContent = "Creative field";
      slateValue.textContent = "Six-Up field";
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
    installRecentToasts,
    normalizeToasts,
    verdictLabel,
  };
});
