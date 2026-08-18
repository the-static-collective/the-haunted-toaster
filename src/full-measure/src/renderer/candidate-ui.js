(() => {
  const api = window.fullMeasure;
  if (!api?.generateCandidates) return;

  const LOCKABLE_AXES = [
    ["topology", "Topology"],
    ["motion", "Motion"],
    ["palette", "Palette"],
    ["material", "Material"],
    ["lyric", "Lyric"],
    ["camera", "Camera"],
    ["temporalDensity", "Density"],
    ["atmosphere", "Atmosphere"],
  ];

  let family = null;
  let selectedIndex = null;
  let sequence = 0;
  let busy = false;
  let acceptedSelection = null;
  let betaHomeEnabled = false;

  const garmentPanel = document.querySelector(".garment-panel");
  const shapeCard = document.querySelector("#timeline")?.closest(".shape-card");
  const renderButton = document.querySelector("#renderButton");
  const audioTitle = document.querySelector("#audioDropTitle");
  const songFacts = document.querySelector("#songFacts");
  if (!garmentPanel || !shapeCard || !renderButton || !audioTitle || !songFacts) return;

  const betaSixUpWindow = document.querySelector("#betaSixUpWindow");
  const betaSixUpGrid = document.querySelector("#betaSixUpGrid");
  const betaSixUpGenerate = document.querySelector("#betaSixUpGenerate");
  const betaSixUpState = document.querySelector("#betaSixUpState");
  const toastFeelChoices = document.querySelector("#toastFeelChoices");
  const garmentHeading = document.querySelector("#garmentHeading");
  const garmentSubheading = document.querySelector("#garmentSubheading");

  const launch = document.createElement("button");
  launch.type = "button";
  launch.className = "candidate-launch";
  launch.innerHTML = `
    <span>
      <small>VISUALSCORE · SIX-UP</small>
      <strong>Generate six visions</strong>
    </span>
    <b aria-hidden="true">✦</b>
  `;
  shapeCard.insertAdjacentElement("afterend", launch);

  const modal = document.createElement("div");
  modal.className = "candidate-modal is-hidden";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "candidateTitle");
  modal.innerHTML = `
    <div class="candidate-backdrop" data-candidate-close></div>
    <section class="candidate-surface">
      <header class="candidate-header">
        <div>
          <span>HAUNTED TOASTER · EXACT TIMELINES</span>
          <h2 id="candidateTitle">Choose what the song looks like</h2>
          <p>Every frame below is sampled from the exact accepted timeline that can be rendered.</p>
        </div>
        <button class="candidate-close" type="button" data-candidate-close aria-label="Close candidate chooser">×</button>
      </header>
      <div class="candidate-toolbar">
        <div class="candidate-status" id="candidateStatus">Generate six to begin.</div>
        <button class="candidate-regenerate" id="candidateRegenerate" type="button">Generate six</button>
      </div>
      <div class="candidate-grid" id="candidateGrid"></div>
      <footer class="candidate-actions">
        <div class="candidate-locks" id="candidateLocks">
          <span>Lock before mutating</span>
          <div class="candidate-lock-list"></div>
        </div>
        <div class="candidate-action-buttons">
          <button class="candidate-mutate" id="candidateMutate" type="button" disabled>Mutate six descendants</button>
          <button class="candidate-mutate" id="candidateConverge" type="button" disabled title="Push the selected creature into underexplored lawful territory">CONVERGE · push this creature</button>
          <span class="candidate-stomp-control">
            <button class="candidate-mutate candidate-stomp" id="candidateStomp" type="button" disabled>STOMP</button>
            <small id="candidateStompHelp">Bored? Floor the next six.</small>
          </span>
          <button class="candidate-use" id="candidateUse" type="button" disabled>Use selected timeline</button>
        </div>
      </footer>
    </section>
  `;
  document.body.append(modal);

  const grid = modal.querySelector("#candidateGrid");
  const status = modal.querySelector("#candidateStatus");
  const regenerate = modal.querySelector("#candidateRegenerate");
  const mutate = modal.querySelector("#candidateMutate");
  const converge = modal.querySelector("#candidateConverge");
  const stomp = modal.querySelector("#candidateStomp");
  const use = modal.querySelector("#candidateUse");
  const lockList = modal.querySelector(".candidate-lock-list");

  for (const [axis, label] of LOCKABLE_AXES) {
    const item = document.createElement("label");
    item.className = "candidate-lock";
    item.innerHTML = `<input type="checkbox" value="${axis}" /><span>${label}</span>`;
    lockList.append(item);
  }

  const originalRenderSmall = renderButton.querySelector(".button-label small")?.textContent || "SONG IN → MP4 OUT";
  const originalRenderStrong = renderButton.querySelector(".button-label strong")?.textContent || "Make full video";

  function currentToastFeelId() {
    return window.toastFeel?.getToastFeelId();
  }

  function shortAddress(address) {
    const value = String(address || "");
    return value.length > 20 ? `${value.slice(0, 12)}…${value.slice(-6)}` : value;
  }

  function roleLabel(role) {
    return String(role || "candidate")
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function songIsReady() {
    return !songFacts.classList.contains("is-hidden");
  }

  function nextRootSeed(kind) {
    sequence += 1;
    const song = audioTitle.textContent.trim().replace(/\s+/g, "-").slice(0, 80) || "song";
    const pressureDomain = betaHomeEnabled ? "toastmood-field" : (currentToastFeelId() || "unselected");
    return `local-six-up:openField:${pressureDomain}:${song}:${kind}:${sequence}`;
  }

  function configFor(kind) {
    const config = {
      rootSeed: nextRootSeed(kind),
      presetId: "openField",
      title: document.querySelector("#titleInput")?.value || "",
      artist: document.querySelector("#artistInput")?.value || "",
      lyrics: document.querySelector("#lyricsInput")?.value || "",
    };
    if (!betaHomeEnabled) config.toastFeelId = currentToastFeelId();
    return config;
  }

  function selectedLocks() {
    return [...lockList.querySelectorAll("input:checked")].map((input) => input.value);
  }

  function frontierSummary(view) {
    const frontier = (view.candidates || []).find((candidate) => candidate.role === "converge-frontier");
    const target = frontier?.frontierEvidence?.selectedFrontierTarget;
    if (!target) return null;
    return [target.topology, target.motionGrammar, target.materialTexture]
      .filter(Boolean)
      .join(" × ");
  }

  function setBusy(nextBusy, message) {
    busy = nextBusy;
    regenerate.disabled = nextBusy;
    mutate.disabled = nextBusy || selectedIndex === null;
    converge.disabled = nextBusy || !family;
    stomp.disabled = nextBusy || selectedIndex === null;
    use.disabled = nextBusy || selectedIndex === null;
    launch.disabled = nextBusy;
    if (betaSixUpGenerate) betaSixUpGenerate.disabled = nextBusy;
    if (message) {
      status.textContent = message;
      if (betaHomeEnabled && betaSixUpState) betaSixUpState.textContent = message;
    }
    modal.classList.toggle("is-busy", nextBusy);
  }

  function updateRenderLabel() {
    const small = renderButton.querySelector(".button-label small");
    const strong = renderButton.querySelector(".button-label strong");
    if (!small || !strong) return;
    if (acceptedSelection) {
      small.textContent = "CHOSEN TIMELINE → MP4";
      strong.textContent = "Render chosen vision";
    } else {
      small.textContent = originalRenderSmall;
      strong.textContent = originalRenderStrong;
    }
  }

  function clearHomeFamily() {
    if (!betaSixUpGrid) return;
    betaSixUpGrid.replaceChildren();
    if (betaSixUpState) betaSixUpState.textContent = songIsReady() ? "Ready for six" : "Waiting for source";
  }

  function clearUi({ notifyMain = true } = {}) {
    family = null;
    selectedIndex = null;
    acceptedSelection = null;
    grid.replaceChildren();
    clearHomeFamily();
    status.textContent = "Generate six to begin.";
    mutate.disabled = true;
    converge.disabled = true;
    stomp.disabled = true;
    use.disabled = true;
    launch.querySelector("strong").textContent = "Generate six visions";
    for (const input of lockList.querySelectorAll("input")) input.checked = false;
    updateRenderLabel();
    if (notifyMain) api.clearCandidates().catch(() => {});
  }

  function openModal() {
    if (!songIsReady()) status.textContent = "Choose a song first.";
    modal.classList.remove("is-hidden");
    document.body.classList.add("has-candidate-modal");
  }

  function closeModal(force = false) {
    if (busy && !force) return;
    modal.classList.add("is-hidden");
    document.body.classList.remove("has-candidate-modal");
  }

  function chooseCard(index) {
    selectedIndex = index;
    acceptedSelection = null;
    for (const card of grid.querySelectorAll(".candidate-card")) {
      const active = Number(card.dataset.index) === index;
      card.classList.toggle("is-selected", active);
      card.setAttribute("aria-pressed", active ? "true" : "false");
    }
    for (const card of betaSixUpGrid?.querySelectorAll(".beta-six-up-cell") || []) {
      const active = Number(card.dataset.index) === index;
      card.classList.toggle("is-selected", active);
      card.setAttribute("aria-pressed", active ? "true" : "false");
    }
    mutate.disabled = busy;
    converge.disabled = busy;
    stomp.disabled = busy;
    use.disabled = busy;
    const candidate = family?.candidates?.find((item) => item.index === index);
    if (candidate) status.textContent = `Candidate ${index + 1} selected · ${candidate.signature}`;
    updateRenderLabel();
  }

  function renderHomeFamily(view) {
    if (!betaHomeEnabled || !betaSixUpGrid) return;
    betaSixUpGrid.replaceChildren();
    for (const candidate of view.candidates || []) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "beta-six-up-cell";
      card.dataset.index = String(candidate.index);
      card.setAttribute("aria-pressed", "false");
      card.setAttribute("aria-label", `Candidate ${candidate.index + 1}: ${candidate.signature}`);
      card.title = candidate.signature;
      card.innerHTML = `
        <img src="${candidate.thumbnailDataUrl}" alt="" />
        <b>${candidate.index + 1}</b>
      `;
      card.addEventListener("click", () => {
        chooseCard(candidate.index);
        openModal();
      });
      betaSixUpGrid.append(card);
    }
    if (betaSixUpState) {
      const shortfall = view.shortfall ? ` · ${view.producedCount}/${view.requestedCount} distinct` : "";
      betaSixUpState.textContent = `${view.producedCount} visions ready${shortfall}`;
    }
  }

  function renderFamily(view) {
    family = view;
    selectedIndex = null;
    acceptedSelection = null;
    grid.replaceChildren();
    updateRenderLabel();

    for (const candidate of view.candidates || []) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "candidate-card";
      card.dataset.index = String(candidate.index);
      card.setAttribute("aria-pressed", "false");
      const changed = candidate.changedAxes?.length ? candidate.changedAxes.join(" · ") : "baseline";
      card.innerHTML = `
        <span class="candidate-image-wrap">
          <img src="${candidate.thumbnailDataUrl}" alt="Candidate ${candidate.index + 1} exact timeline preview" />
          <b>${candidate.index + 1}</b>
        </span>
        <span class="candidate-copy">
          <small>${roleLabel(candidate.role)}</small>
          <strong>${candidate.signature}</strong>
          <em>${changed}</em>
          <code>${shortAddress(candidate.scoreAddress)}</code>
        </span>
      `;
      card.addEventListener("click", () => chooseCard(candidate.index));
      grid.append(card);
    }

    renderHomeFamily(view);
    const shortfall = view.shortfall ? ` · ${view.producedCount}/${view.requestedCount} materially distinct` : "";
    const frontier = frontierSummary(view);
    status.textContent = frontier
      ? `CONVERGE · underexplored ${frontier} · choose one.`
      : `${view.producedCount} exact previews ready${shortfall}. Choose one.`;
    mutate.disabled = true;
    converge.disabled = !(view.candidates || []).length;
    stomp.disabled = true;
    use.disabled = true;
  }

  async function generateSix({ focus = true } = {}) {
    if (busy) return;
    if (!songIsReady()) {
      if (focus) openModal();
      status.textContent = "Choose and inspect a song before generating.";
      if (betaHomeEnabled && betaSixUpState) betaSixUpState.textContent = "Choose a song first";
      return;
    }
    if (focus) openModal();
    setBusy(true, "Compiling six exact timeline previews…");
    try {
      renderFamily(await api.generateCandidates(configFor("generate")));
    } catch (error) {
      const message = error?.message || String(error);
      status.textContent = message;
      if (betaHomeEnabled && betaSixUpState) betaSixUpState.textContent = message;
    } finally {
      setBusy(false);
    }
  }

  async function mutateSix(useConverge = false) {
    if (busy || !family) return;
    if (selectedIndex === null) {
      if (useConverge) {
        status.textContent = "Choose the creature to push into new territory.";
      }
      return;
    }
    setBusy(
      true,
      useConverge
        ? "CONVERGE: pushing this creature toward one lawful underexplored frontier…"
        : "Mutating unlocked axes and compiling exact descendants…",
    );
    try {
      renderFamily(await api.mutateCandidates({
        ...configFor(useConverge ? "converge" : "mutate"),
        familyHash: family.familyHash,
        parentIndex: selectedIndex,
        locks: selectedLocks(),
        converge: useConverge,
      }));
    } catch (error) {
      status.textContent = error?.message || String(error);
    } finally {
      setBusy(false);
    }
  }

  async function stompSix() {
    if (busy || !family || selectedIndex === null) return;
    setBusy(true, "STOMP: riding the rails for six stranger descendants…");
    try {
      renderFamily(await api.stompCandidates({
        ...configFor("stomp"),
        familyHash: family.familyHash,
        parentIndex: selectedIndex,
        locks: selectedLocks(),
      }));
    } catch (error) {
      status.textContent = error?.message || String(error);
    } finally {
      setBusy(false);
    }
  }

  async function useSelected() {
    if (busy || !family || selectedIndex === null) return;
    setBusy(true, "Binding the exact winner to production render…");
    try {
      acceptedSelection = await api.selectCandidate({ familyHash: family.familyHash, index: selectedIndex });
      const candidate = family.candidates.find((item) => item.index === selectedIndex);
      launch.querySelector("strong").textContent = `Chosen · ${shortAddress(candidate?.scoreAddress)}`;
      updateRenderLabel();
      status.textContent = "Exact winner bound. Production render will consume this accepted timeline.";
      closeModal(true);
      document.querySelector(".render-panel")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (error) {
      status.textContent = error?.message || String(error);
    } finally {
      setBusy(false);
    }
  }

  async function configureHomeMode() {
    if (!api.getBuildInfo || !betaSixUpWindow || !betaSixUpGrid || !betaSixUpGenerate || !toastFeelChoices) return;
    try {
      const buildInfo = await api.getBuildInfo();
      const capabilities = Array.isArray(buildInfo?.capabilities) ? buildInfo.capabilities : [];
      if (!capabilities.includes("betaCandidateEcologyV1")) return;
      betaHomeEnabled = true;
      toastFeelChoices.classList.add("is-hidden");
      betaSixUpWindow.classList.remove("is-hidden");
      launch.classList.add("is-hidden");
      if (garmentHeading) garmentHeading.textContent = "Six-Up";
      if (garmentSubheading) garmentSubheading.textContent = "Six creatures first. Choose one, choose two, or keep playing.";
      if (betaSixUpState) betaSixUpState.textContent = songIsReady() ? "Ready for six" : "Waiting for source";
    } catch {
      // Capability lookup failure preserves the proven alpha surface.
    }
  }

  launch.addEventListener("click", () => {
    openModal();
    if (!family && songIsReady()) generateSix();
  });
  betaSixUpGenerate?.addEventListener("click", () => generateSix({ focus: false }));
  regenerate.addEventListener("click", generateSix);
  mutate.addEventListener("click", () => mutateSix(false));
  converge.addEventListener("click", () => mutateSix(true));
  stomp.addEventListener("click", stompSix);
  use.addEventListener("click", useSelected);
  for (const close of modal.querySelectorAll("[data-candidate-close]")) close.addEventListener("click", closeModal);
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.classList.contains("is-hidden")) closeModal();
  });

  window.addEventListener("toast-feel-change", () => {
    if (!betaHomeEnabled) clearUi();
  });
  document.querySelector("#removeImage")?.addEventListener("click", () => {
    api.clearCandidateImage().catch(() => {});
    clearUi({ notifyMain: false });
  });

  let priorAudioTitle = audioTitle.textContent;
  new MutationObserver(() => {
    const next = audioTitle.textContent;
    if (next !== priorAudioTitle) {
      priorAudioTitle = next;
      clearUi();
    }
  }).observe(audioTitle, { childList: true, characterData: true, subtree: true });

  for (const selector of ["#titleInput", "#artistInput", "#lyricsInput"]) {
    document.querySelector(selector)?.addEventListener("input", () => {
      if (family || acceptedSelection) clearUi();
    });
  }

  void configureHomeMode();
})();