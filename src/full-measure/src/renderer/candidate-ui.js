(() => {
  function loadMoveDeck(boot) {
    if (window.candidateMoveDeck?.dealCandidateMoves) {
      boot();
      return;
    }
    const existing = document.querySelector('script[data-candidate-move-deck="v1"]');
    if (existing) {
      existing.addEventListener("load", boot, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "./candidate-move-deck.js";
    script.dataset.candidateMoveDeck = "v1";
    script.addEventListener("load", boot, { once: true });
    document.head.append(script);
  }

  function boot() {
    const api = window.fullMeasure;
    const moveDeck = window.candidateMoveDeck;
    if (!api?.generateCandidates || !moveDeck?.dealCandidateMoves) return;

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
    let moveDealIndex = 0;

    const garmentPanel = document.querySelector(".garment-panel");
    const shapeCard = document.querySelector("#timeline")?.closest(".shape-card");
    const renderButton = document.querySelector("#renderButton");
    const audioTitle = document.querySelector("#audioDropTitle");
    const songFacts = document.querySelector("#songFacts");
    if (!garmentPanel || !shapeCard || !renderButton || !audioTitle || !songFacts) return;

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
            <p>Pick a creature, then pick one of six lawful ways forward.</p>
          </div>
          <button class="candidate-close" type="button" data-candidate-close aria-label="Close candidate chooser">×</button>
        </header>
        <div class="candidate-toolbar">
          <div class="candidate-status" id="candidateStatus">Generate six to begin.</div>
          <button class="candidate-regenerate" id="candidateRegenerate" type="button">Generate six</button>
        </div>
        <div class="candidate-grid" id="candidateGrid"></div>
        <section class="candidate-move-panel" aria-labelledby="candidateMoveTitle">
          <div class="candidate-move-heading">
            <span>
              <small>NEXT MOVE · SIX-UP</small>
              <strong id="candidateMoveTitle">Pick what happens next</strong>
            </span>
            <button class="candidate-move-redeal" id="candidateMoveRedeal" type="button" disabled>↻ Deal six more</button>
          </div>
          <div class="candidate-move-grid" id="candidateMoveGrid" aria-live="polite">
            <p class="candidate-move-empty">Choose a creature above to deal moves.</p>
          </div>
        </section>
        <footer class="candidate-actions">
          <div class="candidate-locks" id="candidateLocks">
            <span>Lock before choosing a move</span>
            <div class="candidate-lock-list"></div>
          </div>
          <div class="candidate-action-buttons">
            <button class="candidate-use" id="candidateUse" type="button" disabled>Use selected timeline</button>
          </div>
        </footer>
      </section>
    `;
    document.body.append(modal);

    const grid = modal.querySelector("#candidateGrid");
    const moveGrid = modal.querySelector("#candidateMoveGrid");
    const status = modal.querySelector("#candidateStatus");
    const regenerate = modal.querySelector("#candidateRegenerate");
    const redeal = modal.querySelector("#candidateMoveRedeal");
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

    function currentCandidateToastFeelId() {
      return window.toastFeel?.getCandidateToastFeelId?.() ?? null;
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
      return `local-six-up:openField:${currentCandidateToastFeelId() || "unselected"}:${song}:${kind}:${sequence}`;
    }

    function configFor(kind) {
      return {
        rootSeed: nextRootSeed(kind),
        presetId: "openField",
        toastFeelId: currentCandidateToastFeelId(),
        title: document.querySelector("#titleInput")?.value || "",
        artist: document.querySelector("#artistInput")?.value || "",
        lyrics: document.querySelector("#lyricsInput")?.value || "",
      };
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

    function moveDeckContext() {
      return {
        familyHash: family?.familyHash,
        selectedIndex,
        dealIndex: moveDealIndex,
        locks: selectedLocks(),
        candidates: (family?.candidates || []).map((candidate) => ({
          index: candidate.index,
          scoreAddress: candidate.scoreAddress,
          signature: candidate.signature,
          toastmoodLane: candidate.toastmoodLane || null,
        })),
      };
    }

    function moveStatus(kind) {
      if (kind === "expand") return "EXPAND: going deeper under this creature's inherited Toastmood pressure…";
      if (kind === "converge") return "CONVERGE: pushing this creature toward one lawful underexplored frontier…";
      if (kind === "stomp") return "STOMP: riding the rails for six stranger descendants…";
      if (kind === "cross") return "CROSS: composing six deterministic two-parent descendants…";
      return "MUTATE: changing unlocked axes and compiling exact descendants…";
    }

    function setBusy(nextBusy, message) {
      busy = nextBusy;
      regenerate.disabled = nextBusy;
      redeal.disabled = nextBusy || selectedIndex === null;
      use.disabled = nextBusy || selectedIndex === null;
      launch.disabled = nextBusy;
      for (const button of moveGrid.querySelectorAll(".candidate-move-card")) button.disabled = nextBusy;
      for (const input of lockList.querySelectorAll("input")) input.disabled = nextBusy;
      if (message) status.textContent = message;
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

    function renderMoveEmpty(copy = "Choose a creature above to deal moves.") {
      moveGrid.replaceChildren();
      const empty = document.createElement("p");
      empty.className = "candidate-move-empty";
      empty.textContent = copy;
      moveGrid.append(empty);
      redeal.disabled = true;
    }

    function clearUi({ notifyMain = true } = {}) {
      family = null;
      selectedIndex = null;
      acceptedSelection = null;
      moveDealIndex = 0;
      grid.replaceChildren();
      renderMoveEmpty();
      status.textContent = "Generate six to begin.";
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

    function renderMoveDeck() {
      if (!family || selectedIndex === null) {
        renderMoveEmpty();
        return;
      }
      const deal = moveDeck.dealCandidateMoves(moveDeckContext());
      moveGrid.replaceChildren();
      for (const proposal of deal.proposals) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "candidate-move-card";
        button.dataset.moveKind = proposal.kind;
        button.dataset.moveAddress = proposal.address;
        button.innerHTML = `
          <small>${proposal.kind.toUpperCase()}</small>
          <strong>${proposal.label}</strong>
          <span>${proposal.detail}</span>
          <code>${shortAddress(proposal.address)}</code>
        `;
        button.addEventListener("click", () => executeMove(proposal));
        moveGrid.append(button);
      }
      redeal.disabled = busy;
      redeal.dataset.dealAddress = deal.dealAddress;
      redeal.title = `Move deal ${deal.dealIndex + 1} · proposals only`;
    }

    function chooseCard(index) {
      selectedIndex = index;
      acceptedSelection = null;
      moveDealIndex = 0;
      for (const card of grid.querySelectorAll(".candidate-card")) {
        const active = Number(card.dataset.index) === index;
        card.classList.toggle("is-selected", active);
        card.setAttribute("aria-pressed", active ? "true" : "false");
      }
      use.disabled = busy;
      renderMoveDeck();
      const candidate = family?.candidates?.find((item) => item.index === index);
      if (candidate) status.textContent = `Candidate ${index + 1} selected · six lawful moves dealt.`;
      updateRenderLabel();
    }

    function renderFamily(view) {
      family = view;
      selectedIndex = null;
      acceptedSelection = null;
      moveDealIndex = 0;
      grid.replaceChildren();
      renderMoveEmpty();
      updateRenderLabel();

      for (const candidate of view.candidates || []) {
        const card = document.createElement("button");
        card.type = "button";
        card.className = "candidate-card";
        card.dataset.index = String(candidate.index);
        card.setAttribute("aria-pressed", "false");
        const changed = candidate.changedAxes?.length ? candidate.changedAxes.join(" · ") : "baseline";
        const lane = candidate.toastmoodLane?.name ? ` · ${candidate.toastmoodLane.name}` : "";
        card.innerHTML = `
          <span class="candidate-image-wrap">
            <img src="${candidate.thumbnailDataUrl}" alt="Candidate ${candidate.index + 1} exact timeline preview" />
            <b>${candidate.index + 1}</b>
          </span>
          <span class="candidate-copy">
            <small>${roleLabel(candidate.role)}${lane}</small>
            <strong>${candidate.signature}</strong>
            <em>${changed}</em>
            <code>${shortAddress(candidate.scoreAddress)}</code>
          </span>
        `;
        card.addEventListener("click", () => chooseCard(candidate.index));
        grid.append(card);
      }

      const shortfall = view.shortfall ? ` · ${view.producedCount}/${view.requestedCount} materially distinct` : "";
      const frontier = frontierSummary(view);
      status.textContent = frontier
        ? `CONVERGE · underexplored ${frontier} · choose one.`
        : view.cross?.policy
          ? `CROSS · ${view.producedCount} exact two-parent descendants ready. Choose one.`
          : view.toastmoodField?.policy
            ? `Field · ${view.producedCount} distinct Toastmood lanes ready${shortfall}. Choose one.`
            : `${view.producedCount} exact previews ready${shortfall}. Choose one.`;
      use.disabled = true;
    }

    async function generateSix() {
      if (busy) return;
      if (!songIsReady()) {
        openModal();
        status.textContent = "Choose and inspect a song before generating.";
        return;
      }
      openModal();
      const pressure = currentCandidateToastFeelId();
      setBusy(
        true,
        pressure
          ? `Compiling six exact previews with ${currentToastFeelId()} pressure…`
          : "Compiling six exact previews across the Toastmood field…",
      );
      try {
        renderFamily(await api.generateCandidates(configFor("generate")));
      } catch (error) {
        status.textContent = error?.message || String(error);
      } finally {
        setBusy(false);
      }
    }

    async function executeMove(proposal) {
      if (busy || !family || selectedIndex === null || !proposal) return;
      const locks = selectedLocks();
      setBusy(true, moveStatus(proposal.kind));
      try {
        if (proposal.kind === "cross") {
          if (!Array.isArray(proposal.parentIndexes) || proposal.parentIndexes.length !== 2) {
            throw new TypeError("CROSS proposal requires exactly two current parents.");
          }
          renderFamily(await api.crossCandidates({
            ...configFor("cross"),
            familyHash: family.familyHash,
            parentIndexes: [...proposal.parentIndexes],
            locks,
          }));
        } else if (proposal.kind === "stomp") {
          renderFamily(await api.stompCandidates({
            ...configFor("stomp"),
            familyHash: family.familyHash,
            parentIndex: proposal.parentIndex ?? selectedIndex,
            locks,
          }));
        } else {
          const converge = proposal.kind === "converge";
          const kind = proposal.kind === "expand" ? "expand" : converge ? "converge" : "mutate";
          renderFamily(await api.mutateCandidates({
            ...configFor(kind),
            familyHash: family.familyHash,
            parentIndex: proposal.parentIndex ?? selectedIndex,
            locks,
            converge,
          }));
        }
      } catch (error) {
        status.textContent = error?.message || String(error);
      } finally {
        setBusy(false);
      }
    }

    function redealMoves() {
      if (busy || !family || selectedIndex === null) return;
      moveDealIndex += 1;
      renderMoveDeck();
      status.textContent = `Move deal ${moveDealIndex + 1} · candidate family unchanged.`;
    }

    function bindElectedFieldFeel(selection) {
      if (!selection?.toastFeel || currentCandidateToastFeelId()) return;
      const evidence = {
        id: selection.toastFeel.id,
        name: selection.toastFeel.name,
        contractVersion: selection.toastFeel.contractVersion,
        semanticClass: selection.toastFeel.semanticClass,
        source: "candidate-lane",
      };
      window.dispatchEvent(new CustomEvent("candidate-toast-feel-binding", { detail: evidence }));
      window.dispatchEvent(new CustomEvent("toast-feel-change", {
        detail: { ...evidence, name: `Field · ${evidence.name}` },
      }));
    }

    async function useSelected() {
      if (busy || !family || selectedIndex === null) return;
      setBusy(true, "Binding the exact winner to production render…");
      try {
        acceptedSelection = await api.selectCandidate({ familyHash: family.familyHash, index: selectedIndex });
        const candidate = family.candidates.find((item) => item.index === selectedIndex);
        launch.querySelector("strong").textContent = `Chosen · ${shortAddress(candidate?.scoreAddress)}`;
        bindElectedFieldFeel(acceptedSelection);
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

    launch.addEventListener("click", () => {
      openModal();
      if (!family && songIsReady()) generateSix();
    });
    regenerate.addEventListener("click", generateSix);
    redeal.addEventListener("click", redealMoves);
    use.addEventListener("click", useSelected);
    for (const input of lockList.querySelectorAll("input")) {
      input.addEventListener("change", () => {
        if (!family || selectedIndex === null || busy) return;
        moveDealIndex = 0;
        renderMoveDeck();
        status.textContent = "Locks changed · move deck re-addressed. Candidate family unchanged.";
      });
    }
    for (const close of modal.querySelectorAll("[data-candidate-close]")) close.addEventListener("click", closeModal);
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !modal.classList.contains("is-hidden")) closeModal();
    });

    window.addEventListener("toast-feel-change", (event) => {
      if (event.detail?.source === "candidate-lane") return;
      clearUi();
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
  }

  loadMoveDeck(boot);
})();
