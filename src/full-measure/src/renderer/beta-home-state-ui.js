(() => {
  const api = window.fullMeasure;
  const slateValue = document.querySelector("#slateToastFeel");
  if (!api?.getBuildInfo || !slateValue) return;

  async function applyBetaHomeSlate() {
    try {
      const buildInfo = await api.getBuildInfo();
      const capabilities = Array.isArray(buildInfo?.capabilities) ? buildInfo.capabilities : [];
      if (!capabilities.includes("betaCandidateEcologyV1")) return;
      const row = slateValue.closest("div");
      const label = row?.querySelector("dt");
      if (label) label.textContent = "Creative field";
      slateValue.textContent = "Six-Up field";
    } catch {
      // Capability lookup failure preserves the proven alpha slate.
    }
  }

  void applyBetaHomeSlate();
})();
