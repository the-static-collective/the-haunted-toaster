(() => {
  const api = window.fullMeasure;
  const documentRoot = document;
  const host = documentRoot.querySelector("#toastFeelChoices");
  let feelings = [];
  let selection = null;
  let explicitSelection = null;
  let disabled = false;

  function publicEvidence(feel) {
    return {
      id: feel.id,
      name: feel.name,
      contractVersion: feel.contractVersion,
      semanticClass: feel.semanticClass,
    };
  }

  function publish() {
    if (!selection) return;
    window.dispatchEvent(new CustomEvent("toast-feel-change", {
      detail: publicEvidence(selection),
    }));
  }

  function select(feel, { announce = true, focus = false, explicit = true } = {}) {
    selection = feel;
    if (explicit) explicitSelection = feel;
    for (const button of host.querySelectorAll(".toast-feel")) {
      const active = button.dataset.toastFeelId === feel.id;
      button.classList.toggle("is-selected", active);
      button.setAttribute("aria-checked", String(active));
      button.tabIndex = active ? 0 : -1;
      if (active && focus) button.focus();
    }
    if (announce) publish();
    return publicEvidence(feel);
  }

  function iconMarkup(feel, index) {
    const heat = 22 + index * 8;
    return `
      <svg class="toast-feel-icon" viewBox="0 0 72 58" aria-hidden="true" focusable="false">
        <path d="M13 49h46l-3-30c-.6-6-5.7-11-12-11H28c-6.3 0-11.4 5-12 11l-3 30Z" />
        <path class="toast-feel-crust" d="M22 39 20 21c-.3-3.5 2.5-6.5 6-6.5h20c3.5 0 6.3 3 6 6.5l-2 18c-.3 3-2.9 5.5-6 5.5H28c-3.1 0-5.7-2.5-6-5.5Z" />
        <path class="toast-feel-scorch" d="M${heat} 21c6-5 14-2 18 4-3 5-9 8-16 6-3-3-4-7-2-10Z" />
        <circle cx="22" cy="51" r="2" /><circle cx="50" cy="51" r="2" />
      </svg>`;
  }

  function createButton(feel, index) {
    const button = documentRoot.createElement("button");
    button.type = "button";
    button.className = `toast-feel${feel.semanticClass === "madd-clown" ? " toast-feel--madd-clown" : ""}`;
    button.dataset.toastFeelId = feel.id;
    button.dataset.iconId = feel.iconId;
    button.setAttribute("role", "radio");
    button.setAttribute("aria-checked", "false");
    button.tabIndex = -1;
    button.innerHTML = `
      <span class="toast-feel-art">${iconMarkup(feel, index)}</span>
      <span class="toast-feel-copy"><strong></strong><small></small></span>
      <span class="toast-feel-mark" aria-hidden="true"></span>`;
    button.querySelector("strong").textContent = feel.name;
    button.querySelector("small").textContent = feel.invitation;
    button.addEventListener("click", () => select(feel));
    button.addEventListener("keydown", (event) => {
      const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"];
      if (!keys.includes(event.key)) return;
      event.preventDefault();
      const current = feelings.findIndex(({ id }) => id === selection?.id);
      let next = current;
      if (["ArrowRight", "ArrowDown"].includes(event.key)) next = (current + 1) % feelings.length;
      if (["ArrowLeft", "ArrowUp"].includes(event.key)) next = (current - 1 + feelings.length) % feelings.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = feelings.length - 1;
      select(feelings[next], { focus: true });
    });
    return button;
  }

  function setDisabled(nextDisabled) {
    disabled = Boolean(nextDisabled);
    for (const button of host?.querySelectorAll(".toast-feel") || []) {
      button.disabled = disabled;
    }
  }

  async function initialize() {
    if (!host || !api?.getToastFeels) throw new Error("Toast Feel manifest bridge is unavailable.");
    const manifest = await api.getToastFeels();
    if (!Array.isArray(manifest) || manifest.length !== 7) {
      throw new Error("Toast Feel manifest must contain exactly seven entries.");
    }
    feelings = manifest.map((feel) => ({ ...feel }));
    host.replaceChildren(...feelings.map(createButton));
    host.setAttribute("aria-busy", "false");
    setDisabled(disabled);
    return select(feelings[0], { explicit: false });
  }

  const ready = initialize().catch((error) => {
    if (host) {
      host.setAttribute("aria-busy", "false");
      host.textContent = "Toast Feel selector refused to load.";
    }
    console.error(error);
    throw error;
  });

  window.toastFeel = Object.freeze({
    getSelection: () => selection ? publicEvidence(selection) : null,
    getToastFeelId: () => selection?.id || null,
    getCandidateToastFeelId: () => explicitSelection?.id || null,
    ready,
    setDisabled,
  });
})();
