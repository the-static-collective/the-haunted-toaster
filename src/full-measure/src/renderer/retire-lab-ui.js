(() => {
  const style = document.createElement("style");
  style.dataset.retiredLabUi = "true";
  style.textContent = `
    .lab-proposal-import,
    .lab-proposal-toggle {
      display: none !important;
    }
  `;
  document.head.append(style);

  function retireVisibleLabAffordances() {
    const visible = [
      ...document.querySelectorAll(".lab-proposal-import, .lab-proposal-toggle"),
    ];
    for (const node of visible) node.remove();
    return visible.length > 0;
  }

  retireVisibleLabAffordances();
  const observer = new MutationObserver(() => retireVisibleLabAffordances());
  observer.observe(document.body, { childList: true, subtree: true });
})();
