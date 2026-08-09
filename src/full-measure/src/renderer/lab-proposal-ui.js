(() => {
  const api = window.fullMeasure;
  const stageCreativeImport = api?.stageCreativeImport || api?.stageLabProposal;
  if (!stageCreativeImport) return;

  function install() {
    const generateButton = document.querySelector(".candidate-launch:not(.lab-proposal-import)");
    if (!generateButton || document.querySelector(".lab-proposal-import")) return Boolean(generateButton);

    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.hidden = true;
    document.body.append(input);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "candidate-launch lab-proposal-import";
    button.innerHTML = `
      <span>
        <small>CREATIVE OBJECT · JSON</small>
        <strong>Bring a Score</strong>
      </span>
      <b aria-hidden="true">↗</b>
    `;
    generateButton.insertAdjacentElement("afterend", button);

    const toggle = document.createElement("label");
    toggle.className = "lab-proposal-toggle";
    toggle.innerHTML = `
      <input id="useCreativeImport" type="checkbox" disabled />
      <span>
        <small>IMPORTED INFLUENCE</small>
        <strong>Use imported score</strong>
      </span>
    `;
    button.insertAdjacentElement("afterend", toggle);

    const checkbox = toggle.querySelector("#useCreativeImport");

    button.addEventListener("click", () => input.click());

    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      input.value = "";
      if (!file) return;

      const label = button.querySelector("strong");
      button.disabled = true;
      if (label) label.textContent = "Reading creative object…";

      try {
        if (file.size > 2_000_000) {
          throw new Error("Creative object is larger than the 2 MB safety limit.");
        }
        const transfer = JSON.parse(await file.text());
        const staged = await stageCreativeImport(transfer);
        const adapter = staged.adapterId ? ` · ${staged.sourceProducer} adapter` : "";
        if (label) label.textContent = `Ready · ${staged.title}${adapter}`;
        checkbox.disabled = false;
        checkbox.checked = true;
      } catch (error) {
        if (label) label.textContent = `Import refused · ${error?.message || String(error)}`;
        checkbox.checked = false;
        checkbox.disabled = true;
      } finally {
        button.disabled = false;
      }
    });

    return true;
  }

  if (install()) return;
  const observer = new MutationObserver(() => {
    if (install()) observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
