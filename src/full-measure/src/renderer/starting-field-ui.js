(() => {
  function installStartingFieldHierarchy() {
    const panel = document.querySelector(".garment-panel");
    const list = panel?.querySelector(".garment-list");
    const openField = list?.querySelector('[data-preset="openField"]');
    if (!panel || !list || !openField) return false;
    if (openField.dataset.startingFieldContainer === "true") return true;

    const heading = panel.querySelector(".panel-heading h2");
    const explanation = panel.querySelector(".panel-heading p");
    if (heading) heading.textContent = "Starting field";
    if (explanation) {
      explanation.textContent =
        "Open by default. Choose an ancestor only when you want one to seed the field.";
    }

    openField.dataset.startingFieldContainer = "true";
    openField.classList.add("starting-field-open", "is-selected");
    openField.setAttribute("aria-pressed", "true");
    openField.removeAttribute("role");
    openField.removeAttribute("aria-checked");

    const copy = openField.querySelector(".garment-copy small");
    if (copy) {
      copy.textContent =
        "Default · broad lawful field · ancestors constrain the beginning, not the possible creature";
    }

    list.insertAdjacentElement("beforebegin", openField);

    const ancestry = document.createElement("div");
    ancestry.className = "shape-heading starting-field-ancestors";
    ancestry.innerHTML = "<span>Ancestors</span><strong>Optional</strong>";
    list.insertAdjacentElement("beforebegin", ancestry);
    list.setAttribute("aria-label", "Ancestral garments");

    const ancestors = [...list.querySelectorAll(".garment-card")];
    for (const ancestor of ancestors) {
      ancestor.classList.remove("is-selected");
      ancestor.setAttribute("aria-checked", "false");
      ancestor.addEventListener("click", () => {
        openField.classList.remove("is-selected");
        openField.setAttribute("aria-pressed", "false");
      });
    }

    openField.addEventListener("click", () => {
      for (const ancestor of ancestors) {
        ancestor.classList.remove("is-selected");
        ancestor.setAttribute("aria-checked", "false");
      }
      openField.classList.add("is-selected");
      openField.setAttribute("aria-pressed", "true");
      const slate = document.querySelector("#slateGarment");
      if (slate) slate.textContent = "Open Field";
    });

    const slate = document.querySelector("#slateGarment");
    if (slate) slate.textContent = "Open Field";
    return true;
  }

  if (installStartingFieldHierarchy()) return;
  const observer = new MutationObserver(() => {
    if (installStartingFieldHierarchy()) observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
