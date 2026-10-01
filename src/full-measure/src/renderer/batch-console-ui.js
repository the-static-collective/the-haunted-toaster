(() => {
  const api = window.fullMeasure;
  if (!api?.chooseBatchFolder || !api?.primeBatchGenome) return;

  const $ = (selector) => document.querySelector(selector);
  const launch = $("#batchLaunch");
  const modal = $("#batchConsole");
  const close = $("#batchConsoleClose");
  const backdrop = modal?.querySelector("[data-batch-close]");
  const folderName = $("#batchFolderName");
  const folderMeta = $("#batchFolderMeta");
  const spine = $("#batchTrackList");
  const genomeGrid = $("#batchGenomeGrid");
  const genomeStatus = $("#batchGenomeStatus");
  const genomeButton = $("#batchGenomeButton");
  const startButton = $("#batchStartButton");
  const replaceButton = $("#batchReplaceFolder");
  const futureRole = $("#batchFutureRole");
  const futureFocus = $("#batchFutureFocus");
  const materialSummary = $("#batchMaterialSummary");
  const batchStatus = $("#batchStatus");
  const retrospective = $("#batchRetrospective");

  if (!launch || !modal || !spine || !genomeGrid) return;

  const state = {
    manifest: null,
    prime: null,
    genome: null,
    running: false,
    context: null,
    prepared: null,
    kept: null,
    busy: false,
    awaitingGenome: false,
    retrospective: null,
  };

  function short(value, head = 10, tail = 6) {
    const text = String(value || "");
    return text.length > head + tail + 1
      ? `${text.slice(0, head)}…${text.slice(-tail)}`
      : text;
  }

  function setBusy(next, message = null) {
    state.busy = next;
    genomeButton.disabled = next || !state.manifest || state.running;
    startButton.disabled = next || !state.genome || state.running;
    replaceButton.disabled = next || state.running;
    if (message) batchStatus.textContent = message;
    modal.classList.toggle("is-busy", next);
  }

  function openConsole() {
    modal.classList.remove("is-hidden");
    document.body.classList.add("has-batch-console");
    close.focus();
  }

  function closeConsole(force = false) {
    if (state.busy && !force) return;
    modal.classList.add("is-hidden");
    document.body.classList.remove("has-batch-console");
    launch.focus();
  }

  function updateLaunch() {
    if (!state.manifest) {
      launch.querySelector("strong").textContent = "Toast an album folder";
      launch.querySelector("small").textContent = "FOLDER BATCH · FUTURE REARVIEW";
      return;
    }
    if (state.running) {
      const cursor = Number(state.context?.cursor ?? 0);
      launch.querySelector("strong").textContent = state.context?.complete
        ? "Album toast complete"
        : `Batch ${cursor + 1}/${state.manifest.trackCount} · ${state.context?.context?.temporalContext?.present?.prophecy?.role || "READY"}`;
      launch.querySelector("small").textContent = "FUTURE REARVIEW · ACTIVE";
      return;
    }
    launch.querySelector("strong").textContent = state.genome
      ? "Album genome ready"
      : `${state.manifest.trackCount} tracks · dream the six-up`;
    launch.querySelector("small").textContent = "FOLDER BATCH · READY";
  }

  function trackStatus(index) {
    if (!state.running) return index === 0 ? "seed" : "waiting";
    const cursor = Number(state.context?.cursor ?? 0);
    if (state.context?.complete || index < cursor) return "done";
    if (index === cursor) return "current";
    return "waiting";
  }

  function renderSpine() {
    spine.replaceChildren();
    for (const track of state.manifest?.tracks || []) {
      const li = document.createElement("li");
      const status = trackStatus(track.trackIndex);
      li.className = `batch-track is-${status}`;
      li.innerHTML = `
        <span class="batch-track-index">${String(track.trackIndex + 1).padStart(2, "0")}</span>
        <span class="batch-track-copy">
          <strong>${track.relativePath}</strong>
          <small>${status === "done" ? "RECEIPT" : status === "current" ? "NOW TOASTING" : status === "seed" ? "GENOME SEED" : "UNWRITTEN"}</small>
        </span>
        <span class="batch-track-mark" aria-hidden="true">${status === "done" ? "✓" : status === "current" ? "●" : "○"}</span>
      `;
      spine.append(li);
    }
  }

  function renderGenome() {
    genomeGrid.replaceChildren();
    const candidates = state.genome?.candidates || [];
    if (!candidates.length) {
      const empty = document.createElement("p");
      empty.className = "batch-genome-empty";
      empty.textContent = "No album genome yet. Dream one six-up from the opening track + whole-folder identity.";
      genomeGrid.append(empty);
      genomeStatus.textContent = "UNSEEDED";
      return;
    }
    for (const candidate of candidates) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "batch-genome-cell";
      cell.title = `${candidate.signature || "candidate"} · ${candidate.scoreAddress}`;
      cell.innerHTML = `
        <img src="${candidate.thumbnailDataUrl}" alt="Album genome candidate ${candidate.index + 1}" />
        <b>${candidate.index + 1}</b>
      `;
      cell.addEventListener("click", () => window.candidateSixUp?.open?.());
      genomeGrid.append(cell);
    }
    genomeStatus.textContent = `FAMILY ${short(state.genome.familyHash)}`;
  }

  function renderEvidence() {
    const proposal = state.context?.context?.materialProposal;
    const prophecy = state.context?.context?.temporalContext?.present?.prophecy;
    futureRole.textContent = prophecy?.role || (state.running ? "—" : "AWAITING GENOME");
    futureFocus.textContent = prophecy?.focusApertures?.length
      ? prophecy.focusApertures.join(" × ")
      : "Future horizon appears after TOAST THE RECORD.";

    if (proposal) {
      const imageCount = proposal.availableImageAssetIds?.length || 0;
      const videoCount = proposal.availableVideoSpecimenIds?.length || 0;
      materialSummary.textContent =
        `${imageCount} folder image${imageCount === 1 ? "" : "s"} · ${videoCount} admitted pantry video${videoCount === 1 ? "" : "s"} · proposal only`;
    } else if (state.manifest) {
      materialSummary.textContent =
        `${state.manifest.imageCount} folder images · ${state.manifest.localVideoCount} local video${state.manifest.localVideoCount === 1 ? "" : "s"} not auto-admitted · ${state.manifest.pantryVideoCount} pantry videos`;
    } else {
      materialSummary.textContent = "Choose a folder to reveal the local ecology.";
    }
  }

  function renderRetrospective() {
    retrospective.replaceChildren();
    if (!state.retrospective) {
      retrospective.classList.add("is-hidden");
      return;
    }
    retrospective.classList.remove("is-hidden");
    const invitations = state.retrospective.futureRearviewRetrospective?.revisitInvitations || [];
    const heading = document.createElement("strong");
    heading.textContent = "THE ENDING LOOKS BACK";
    retrospective.append(heading);
    const copy = document.createElement("p");
    copy.textContent = invitations.length
      ? `${invitations.length} earlier track${invitations.length === 1 ? "" : "s"} earned a revisit invitation. Nothing was rewritten automatically.`
      : "The record closed without a bounded revisit invitation. Its archaeology remains intact.";
    retrospective.append(copy);
    for (const invitation of invitations.slice(0, 6)) {
      const row = document.createElement("div");
      row.className = "batch-revisit";
      row.textContent = `${String(invitation.earlierTrackIndex + 1).padStart(2, "0")} ${invitation.earlierTrackId} ← ${invitation.aperture} from track ${invitation.laterTrackIndex + 1}`;
      retrospective.append(row);
    }
  }

  function render() {
    folderName.textContent = state.manifest?.folderName || "No album folder";
    folderMeta.textContent = state.manifest
      ? `${state.manifest.trackCount} tracks · ${state.manifest.imageCount} images · ${state.manifest.pantryVideoCount} pantry`
      : "Choose a folder";
    renderSpine();
    renderGenome();
    renderEvidence();
    renderRetrospective();
    updateLaunch();
    genomeButton.disabled = state.busy || !state.manifest || state.running;
    startButton.disabled = state.busy || !state.genome || state.running;
    startButton.textContent = state.running ? "RECORD IN MOTION" : "TOAST THE RECORD";
  }

  async function chooseFolder() {
    if (state.busy || state.running) return;
    setBusy(true, "Reading the folder as a record…");
    try {
      const manifest = await api.chooseBatchFolder();
      if (!manifest) return;
      state.manifest = manifest;
      state.prime = await api.primeBatchGenome();
      state.genome = null;
      state.context = null;
      state.prepared = null;
      state.kept = null;
      state.retrospective = null;
      batchStatus.textContent = "Folder admitted. The opening track can now dream an album six-up.";
      render();
      openConsole();
    } catch (error) {
      batchStatus.textContent = error?.message || String(error);
      openConsole();
    } finally {
      setBusy(false);
      render();
    }
  }

  async function dreamGenome() {
    if (state.busy || !state.manifest || state.running) return;
    setBusy(true, "Dreaming six visual genomes for the whole record…");
    state.awaitingGenome = true;
    try {
      state.prime = await api.primeBatchGenome();
      const view = await window.candidateSixUp?.generateWithRootSeed?.(
        state.prime.rootSeed,
        { batchPrimed: true },
      );
      const snapshot = window.candidateSixUp?.snapshot?.();
      if (!snapshot || snapshot.scoreAddresses?.length !== 6) {
        throw new Error("The album genome requires one complete six-up family.");
      }
      state.genome = snapshot;
      batchStatus.textContent = "Six-up captured as an album-genome candidate. Inspect any tile or toast the record.";
      window.candidateSixUp?.close?.();
      render();
      openConsole();
      return view;
    } catch (error) {
      batchStatus.textContent = error?.message || String(error);
      openConsole();
    } finally {
      state.awaitingGenome = false;
      setBusy(false);
      render();
    }
  }

  async function activateCurrent(contextResponse = null) {
    const cursor = Number(contextResponse?.cursor ?? state.context?.cursor ?? 0);
    const rootSeed = `batch-track:${state.manifest.manifestSha256}:${cursor}`;
    const prepared = await api.activateBatchTrack({
      baseOptions: { rootSeed, count: 6 },
    });
    state.prepared = prepared;
    state.kept = null;
    await window.fullMeasureUi?.applyBatchPreparedTrack?.(prepared);
    state.context = await api.getBatchContext();
    render();
    closeConsole(true);
    await window.candidateSixUp?.generateWithRootSeed?.(
      prepared.generationOptions.rootSeed,
      { batchPrimed: true },
    );
  }

  async function startRecord() {
    if (state.busy || !state.genome || state.running) return;
    setBusy(true, "Opening Future Rearview across the record…");
    try {
      state.context = await api.startBatch({
        sixUpSeed: {
          familyHash: state.genome.familyHash,
          scoreAddresses: [...state.genome.scoreAddresses],
        },
      });
      state.running = true;
      batchStatus.textContent = "Album genome accepted. Track 01 is crossing into the ordinary Toaster.";
      render();
      await activateCurrent(state.context);
    } catch (error) {
      batchStatus.textContent = error?.message || String(error);
      openConsole();
    } finally {
      setBusy(false);
      render();
    }
  }

  async function acceptRenderedTrack(receiptSha256) {
    if (!state.running || !state.prepared || !receiptSha256 || state.busy) return;
    setBusy(true, "Receipt accepted. Learning the track and re-imagining what remains…");
    try {
      const allowed = new Set(["topology", "motion", "material", "palette", "camera", "temporalDensity"]);
      const observedAxes = (state.kept?.changedAxes || []).filter((axis) => allowed.has(axis));
      state.context = await api.acceptBatchTrack({
        acceptedRenderReceiptSha256: receiptSha256,
        familyHash: state.kept?.familyHash || null,
        selectedScoreAddress: state.kept?.scoreAddress || null,
        observedAxes,
      });
      state.prepared = null;
      state.kept = null;
      render();

      if (state.context.complete) {
        state.retrospective = await api.closeBatch();
        batchStatus.textContent = "The record is toasted. Future became history; archaeology remains intact.";
        render();
        openConsole();
      } else {
        batchStatus.textContent = `Track ${state.context.cursor} receipted. The remainder has been re-dreamed.`;
        render();
        await activateCurrent(state.context);
      }
    } catch (error) {
      batchStatus.textContent = error?.message || String(error);
      openConsole();
    } finally {
      setBusy(false);
      render();
    }
  }

  launch.addEventListener("click", () => {
    if (state.manifest) openConsole();
    else chooseFolder();
  });
  close.addEventListener("click", closeConsole);
  backdrop?.addEventListener("click", closeConsole);
  replaceButton.addEventListener("click", chooseFolder);
  genomeButton.addEventListener("click", dreamGenome);
  startButton.addEventListener("click", startRecord);

  window.addEventListener("candidate-family-rendered", (event) => {
    if (!state.awaitingGenome) return;
    const detail = event.detail;
    if (detail?.familyHash && detail?.scoreAddresses?.length === 6) {
      state.genome = detail;
      render();
    }
  });

  window.addEventListener("candidate-kept", (event) => {
    if (!state.running) return;
    state.kept = event.detail || null;
    batchStatus.textContent = "KEEP recorded for the current track. Render will become the batch receipt.";
    render();
  });

  window.addEventListener("haunted-render-complete", (event) => {
    if (!state.running) return;
    const receiptSha256 = event.detail?.receiptSha256;
    if (!receiptSha256) {
      batchStatus.textContent = "Render finished, but batch cannot advance without an archived receipt hash.";
      openConsole();
      return;
    }
    acceptRenderedTrack(receiptSha256);
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.classList.contains("is-hidden")) closeConsole();
  });

  render();
})();
