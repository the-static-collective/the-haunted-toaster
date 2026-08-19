const { createHash } = require("node:crypto");

const MOVE_DECK_POLICY = "candidate-move-deck/v1";

function sha256(value) {
  return createHash("sha256").update(String(value), "utf8").digest("hex");
}

function assertNonEmptyString(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${label} is required.`);
  }
  return value.trim();
}

function normalizeLocks(locks) {
  if (locks === undefined || locks === null) return [];
  if (!Array.isArray(locks)) throw new TypeError("Move-deck locks must be an array.");
  return [...new Set(locks.map((lock) => assertNonEmptyString(lock, "Move-deck lock")))].sort();
}

function normalizeCandidates(candidates) {
  if (!Array.isArray(candidates) || candidates.length < 2) {
    throw new TypeError("Move deck requires the current candidate family.");
  }
  const normalized = candidates.map((candidate) => {
    const index = Number(candidate?.index);
    if (!Number.isInteger(index) || index < 0) {
      throw new TypeError("Every move-deck candidate requires a non-negative integer index.");
    }
    const lane = candidate?.toastmoodLane
      ? {
          id: String(candidate.toastmoodLane.id || ""),
          name: String(candidate.toastmoodLane.name || candidate.toastmoodLane.id || ""),
        }
      : null;
    return {
      index,
      scoreAddress: assertNonEmptyString(candidate?.scoreAddress, "Candidate score address"),
      signature: String(candidate?.signature || `candidate-${index + 1}`),
      toastmoodLane: lane,
    };
  }).sort((left, right) => left.index - right.index);

  if (new Set(normalized.map((candidate) => candidate.index)).size !== normalized.length) {
    throw new TypeError("Move-deck candidate indexes must be unique.");
  }
  return normalized;
}

function canonicalContext(context = {}) {
  const familyHash = assertNonEmptyString(context.familyHash, "Current family hash");
  const candidates = normalizeCandidates(context.candidates);
  const selectedSupplied =
    context.selectedIndex !== undefined &&
    context.selectedIndex !== null &&
    context.selectedIndex !== "";
  if (!selectedSupplied) {
    throw new TypeError("Choose a current candidate before dealing moves.");
  }
  const selectedIndex = Number(context.selectedIndex);
  const selected = candidates.find((candidate) => candidate.index === selectedIndex);
  if (!Number.isInteger(selectedIndex) || !selected) {
    throw new TypeError("Choose a current candidate before dealing moves.");
  }
  const dealIndex = context.dealIndex === undefined ? 0 : Number(context.dealIndex);
  if (!Number.isInteger(dealIndex) || dealIndex < 0) {
    throw new TypeError("Move-deck dealIndex must be a non-negative integer.");
  }
  return {
    policy: MOVE_DECK_POLICY,
    familyHash,
    selectedIndex,
    selected,
    locks: normalizeLocks(context.locks),
    dealIndex,
    candidates,
  };
}

function contextJson(context) {
  return JSON.stringify({
    policy: context.policy,
    familyHash: context.familyHash,
    selectedIndex: context.selectedIndex,
    selectedScoreAddress: context.selected.scoreAddress,
    selectedToastmoodLane: context.selected.toastmoodLane
      ? {
          id: context.selected.toastmoodLane.id,
          name: context.selected.toastmoodLane.name,
        }
      : null,
    locks: context.locks,
    dealIndex: context.dealIndex,
    candidates: context.candidates.map((candidate) => ({
      index: candidate.index,
      scoreAddress: candidate.scoreAddress,
      toastmoodLaneId: candidate.toastmoodLane?.id || null,
    })),
  });
}

function proposalAddress(dealAddress, slot, proposal) {
  return `candidate-move:sha256:${sha256(JSON.stringify({
    policy: MOVE_DECK_POLICY,
    dealAddress,
    slot,
    kind: proposal.kind,
    action: proposal.action,
    parentIndex: proposal.parentIndex ?? null,
    parentIndexes: proposal.parentIndexes || null,
  }))}`;
}

function partnerOrder(context) {
  const key = `${context.familyHash}|${context.selected.scoreAddress}|${context.locks.join(",")}`;
  return context.candidates
    .filter((candidate) => candidate.index !== context.selectedIndex)
    .map((candidate) => ({
      candidate,
      rank: sha256(`${key}|cross-partner|${candidate.scoreAddress}`),
    }))
    .sort((left, right) => left.rank.localeCompare(right.rank) || left.candidate.index - right.candidate.index)
    .map((entry) => entry.candidate);
}

function crossProposal(selected, partner) {
  const partnerLane = partner.toastmoodLane?.name ? ` · ${partner.toastmoodLane.name}` : "";
  return {
    kind: "cross",
    action: "cross",
    label: `CROSS · #${selected.index + 1} × #${partner.index + 1}`,
    detail: `${partner.signature}${partnerLane}`,
    parentIndexes: [selected.index, partner.index],
  };
}

function dealCandidateMoves(input = {}) {
  const context = canonicalContext(input);
  const dealAddress = `candidate-move-deal:sha256:${sha256(contextJson(context))}`;
  const laneName = context.selected.toastmoodLane?.name || `Candidate ${context.selectedIndex + 1}`;
  const partners = partnerOrder(context);
  const partnerOffset = (context.dealIndex * 2) % partners.length;
  const firstPartner = partners[partnerOffset];
  const secondPartner = partners[(partnerOffset + 1) % partners.length];

  const proposals = [
    {
      kind: "expand",
      action: "mutate",
      label: `EXPAND · ${laneName}`,
      detail: "Go deeper under this creature's inherited Toastmood pressure.",
      parentIndex: context.selectedIndex,
    },
    {
      kind: "mutate",
      action: "mutate",
      label: "MUTATE · unlocked axes",
      detail: "Grow another deterministic six from this creature.",
      parentIndex: context.selectedIndex,
    },
    {
      kind: "converge",
      action: "mutate",
      label: "CONVERGE · underexplored",
      detail: "Push this creature toward one lawful frontier.",
      parentIndex: context.selectedIndex,
    },
    {
      kind: "stomp",
      action: "stomp",
      label: "STOMP · stranger six",
      detail: "Ride the existing rails farther from the parent.",
      parentIndex: context.selectedIndex,
    },
    crossProposal(context.selected, firstPartner),
    crossProposal(context.selected, secondPartner),
  ].map((proposal, slot) => ({
    ...proposal,
    address: proposalAddress(dealAddress, slot, proposal),
  }));

  return {
    policy: MOVE_DECK_POLICY,
    dealAddress,
    dealIndex: context.dealIndex,
    proposals,
  };
}

module.exports = {
  MOVE_DECK_POLICY,
  dealCandidateMoves,
};
