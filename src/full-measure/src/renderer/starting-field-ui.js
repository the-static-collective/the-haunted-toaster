(() => {
  function installStartingFieldHierarchy() {
    const panel = document.querySelector(".garment-panel");
    const list = panel?.querySelector(".garment-list");
    if (!panel || !list) return false;
    if (panel.dataset.startingFieldHierarchy === "true") return true;

    const heading = panel.querySelector(".panel-heading h2");
    const explanation = panel.querySelector(".panel-heading p");
    if (heading) heading.textContent = "Starting field";
    if (explanation) {
      explanation.textContent =
        "Open by default. Choose an ancestor only when you want one to seed the field.";
    }

    // Open Field is state, not a fourth garment button. Keep one hidden marker
    // so the existing renderer/candidate selection bridge can resolve the
    // default preset without presenting it as a peer choice.
    const stateMarker = document.createElement("span");
    stateMarker.hidden = true;
    stateMarker.className = "garment-card starting-field-state is-selected";
    stateMarker.dataset.preset = "openField";
    stateMarker.dataset.startingFieldState = "true";
    stateMarker.setAttribute("aria-hidden", "true");
    list.prepend(stateMarker);

    const container = document.createElement("div");
    container.className = "shape-card starting-field-container";
    container.innerHTML = `
      <div class="shape-heading">
        <span>Open Field</span>
        <strong data-starting-field-status>Default container</strong>
      </div>
      <div class="section-legend">
        Broad lawful field. The garments below are optional ancestors that can seed the beginning without becoming the whole ontology.
      </div>
    `;
    list.insertAdjacentElement("beforebegin", container);

    const ancestry = document.createElement("div");
    ancestry.className = "shape-heading starting-field-ancestors";
    ancestry.innerHTML = "<span>Ancestors</span><strong>Optional</strong>";
    list.insertAdjacentElement("beforebegin", ancestry);
    list.setAttribute("aria-label", "Optional ancestral garments");

    const ancestors = [...list.querySelectorAll(".garment-card")].filter(
      (card) => card !== stateMarker,
    );
    const status = container.querySelector("[data-starting-field-status]");
    const slate = document.querySelector("#slateGarment");
    const slateLabel = slate?.closest("div")?.querySelector("dt");
    if (slateLabel) slateLabel.textContent = "Starting field";

    function showOpenField() {
      for (const ancestor of ancestors) {
        ancestor.classList.remove("is-selected");
        ancestor.setAttribute("aria-checked", "false");
        ancestor.dataset.startingFieldSelected = "false";
      }
      stateMarker.classList.add("is-selected");
      if (status) status.textContent = "Default container";
      if (slate) slate.textContent = "Open Field";
    }

    function showAncestor(ancestor) {
      for (const sibling of ancestors) {
        sibling.dataset.startingFieldSelected = String(sibling === ancestor);
      }
      stateMarker.classList.remove("is-selected");
      const name =
        ancestor.querySelector(".garment-copy strong")?.textContent ||
        "Ancestral garment";
      if (status) status.textContent = `${name} ancestor`;
      if (slate) slate.textContent = `Open Field · ${name} ancestor`;
    }

    for (const ancestor of ancestors) {
      ancestor.classList.remove("is-selected");
      ancestor.setAttribute("aria-checked", "false");
      ancestor.dataset.startingFieldSelected = "false";
      ancestor.addEventListener("click", () => {
        const wasSelected = ancestor.dataset.startingFieldSelected === "true";
        if (wasSelected) {
          showOpenField();
        } else {
          showAncestor(ancestor);
        }
      });
    }

    showOpenField();
    panel.dataset.startingFieldHierarchy = "true";
    return true;
  }

  if (installStartingFieldHierarchy()) return;
  const observer = new MutationObserver(() => {
    if (installStartingFieldHierarchy()) observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
