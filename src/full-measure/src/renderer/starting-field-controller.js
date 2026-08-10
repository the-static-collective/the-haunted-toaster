(() => {
  const OPEN_FIELD = Object.freeze({ presetId: "openField", presetName: "Open Field" });
  const cards = [...document.querySelectorAll(".garment-card")];
  const status = document.querySelector("[data-starting-field-status]");
  let selection = OPEN_FIELD;

  function ancestorName(card) {
    return card.querySelector(".garment-copy strong")?.textContent || "Ancestral garment";
  }

  function publish() {
    window.dispatchEvent(
      new CustomEvent("starting-field-change", { detail: { ...selection } }),
    );
  }

  function selectOpenField({ announce = true } = {}) {
    selection = OPEN_FIELD;
    for (const card of cards) {
      card.classList.remove("is-selected");
      card.setAttribute("aria-checked", "false");
    }
    if (status) status.textContent = "Default container";
    if (announce) publish();
    return { ...selection };
  }

  function selectAncestor(card) {
    const wasSelected = card.classList.contains("is-selected");
    if (wasSelected) return selectOpenField();

    for (const sibling of cards) {
      const active = sibling === card;
      sibling.classList.toggle("is-selected", active);
      sibling.setAttribute("aria-checked", String(active));
    }
    const presetName = ancestorName(card);
    selection = { presetId: card.dataset.preset, presetName };
    if (status) status.textContent = `${presetName} ancestor`;
    publish();
    return { ...selection };
  }

  for (const card of cards) {
    card.addEventListener("click", () => selectAncestor(card));
  }

  selectOpenField({ announce: false });
  window.startingField = Object.freeze({
    getSelection: () => ({ ...selection }),
    getPresetId: () => selection.presetId,
    selectOpenField,
  });
})();
