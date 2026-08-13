const CANONICAL_WITNESS_STATES = Object.freeze([
  "empty",
  "song-ready",
  "toast-feel",
  "six-up",
  "listener",
  "rendering",
  "complete",
  "failure",
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
    document.querySelector(".candidate-launch").click();
    await waitFor(() => document.querySelectorAll(".candidate-card").length === 6, "six candidates");
  }

  async function showRender(mode) {
    await loadSong();
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
      await window.toastFeel.ready;
      document.querySelector('[data-toast-feel-id="wire-heat"]').click();
    }
    if (state === "six-up") await showSixUp();
    if (state === "listener") await showListener();
    if (state === "rendering") await showRender("pending");
    if (state === "complete") await showRender("complete");
    if (state === "failure") await showRender("failure");
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
