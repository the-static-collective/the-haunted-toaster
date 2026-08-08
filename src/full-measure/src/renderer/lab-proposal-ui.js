(() => {
  const api = window.fullMeasure;
  if (!api?.stageLabProposal) return;

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
        <small>TOASTER LAB · PROPOSAL</small>
        <strong>Import Lab Proposal</strong>
      </span>
      <b aria-hidden="true">↗</b>
    `;
    generateButton.insertAdjacentElement("afterend", button);

    const toggle = document.createElement("label");
    toggle.className = "lab-proposal-toggle";
    toggle.innerHTML = `
      <input id="useLabProposal" type="checkbox" disabled />
      <span>
        <small>PROPOSAL INFLUENCE</small>
        <strong>Use Lab Proposal</strong>
      </span>
    `;
    button.insertAdjacentElement("afterend", toggle);

    const checkbox = toggle.querySelector("#useLabProposal");

    button.addEventListener("click", () => input.click());

    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      input.value = "";
      if (!file) return;

      const label = button.querySelector("strong");
      button.disabled = true;
      if (label) label.textContent = "Reading Lab proposal…";

      try {
        if (file.size > 2_000_000) {
          throw new Error("Lab proposal is larger than the 2 MB safety limit.");
        }
        const transfer = JSON.parse(await file.text());
        const staged = await api.stageLabProposal(transfer);
        if (label) label.textContent = `Imported · ${staged.title}`;
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
