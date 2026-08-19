const CANONICAL_WITNESS_STATES = Object.freeze([
  "empty",
  "song-ready",
  "toast-feel",
  "six-up",
  "listener",
  "rendering",
  "complete",
  "failure",
  "beta-home",
  "beta-history",
]);

function normalizeWitnessState(value) {
  if (value === "starting-field") return "toast-feel";
  return CANONICAL_WITNESS_STATES.includes(value) ? value : "empty";
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { CANONICAL_WITNESS_STATES, normalizeWitnessState };
}

if (typeof window !== "undefined") {
  const wait = (milliseconds = 0) => new Promise((resolve) => setTimeout(resolve, milliseconds));

  async function waitFor(predicate, label) {
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const result = predicate();
      if (result) return result;
      await wait(25);
    }
    throw new Error(`UI witness timed out waiting for ${label}.`);
  }

  async function loadSong() {
    document.querySelector("#audioDrop").click();
    await waitFor(() => !document.querySelector("#songFacts").classList.contains("is-hidden"), "song inspection");
  }

  async function chooseToastFeel() {
    await window.toastFeel.ready;
    document.querySelector('[data-toast-feel-id="wire-heat"]').click();
    await waitFor(() => window.toastFeel.getToastFeelId() === "wire-heat", "Toast Feel selection");
  }

  async function showListener() {
    await loadSong();
    const lyrics = document.querySelector("#lyricsInput");
    lyrics.value = "The house takes attendance\nWire heat in the orchard\nNative color comes home\nOne honest missing phrase";
    lyrics.dispatchEvent(new Event("input", { bubbles: true }));
    await wait(180);
    document.querySelector("#lyricsAutoSync").click();
    await waitFor(() => !document.querySelector("#syncEditor").classList.contains("is-hidden"), "Listener editor");
  }

  async function showSixUp() {
    await loadSong();
    await chooseToastFeel();
    document.querySelector(".candidate-launch").click();
    await waitFor(() => document.querySelectorAll(".candidate-card").length === 6, "six candidates");
  }

  async function showBetaHome({ history = false } = {}) {
    await loadSong();
    await waitFor(
      () => !document.querySelector("#betaSixUpWindow")?.classList.contains("is-hidden"),
      "beta Home Six-Up window",
    );
    document.querySelector("#betaSixUpGenerate")?.click();
    await waitFor(
      () => document.querySelectorAll("#betaSixUpGrid .beta-six-up-cell").length === 6,
      "beta Home six candidates",
    );
    if (history) {
      await waitFor(
        () => document.querySelectorAll("#recentToastsList .recent-toast-row").length === 3,
        "beta Home recent toasts",
      );
    }
  }

  async function showRender(mode) {
    await loadSong();
    await chooseToastFeel();
    window.__uiWitness.setRenderMode(mode);
    document.querySelector("#renderButton").click();
    if (mode === "pending") {
      await waitFor(() => !document.querySelector("#progressCard").classList.contains("is-hidden"), "render progress");
    } else if (mode === "complete") {
      await waitFor(() => !document.querySelector("#resultCard").classList.contains("is-hidden"), "render result");
    } else {
      await waitFor(() => !document.querySelector("#errorCard").classList.contains("is-hidden"), "render refusal");
    }
  }

  async function materialize(state) {
    if (state === "song-ready") await loadSong();
    if (state === "toast-feel") {
      await loadSong();
      await chooseToastFeel();
    }
    if (state === "six-up") await showSixUp();
    if (state === "listener") await showListener();
    if (state === "rendering") await showRender("pending");
    if (state === "complete") await showRender("complete");
    if (state === "failure") await showRender("failure");
    if (state === "beta-home") await showBetaHome();
    if (state === "beta-history") await showBetaHome({ history: true });
  }

  window.addEventListener("load", async () => {
    const requested = new URLSearchParams(window.location.search).get("state") || "empty";
    const state = normalizeWitnessState(requested);
    document.documentElement.dataset.witnessState = state;
    try {
      await materialize(state);
      document.documentElement.dataset.witnessReady = "true";
    } catch (error) {
      document.documentElement.dataset.witnessReady = "false";
      document.documentElement.dataset.witnessError = String(error?.message || error);
      window.__consoleErrors.push(String(error?.message || error));
    }
  });
}
