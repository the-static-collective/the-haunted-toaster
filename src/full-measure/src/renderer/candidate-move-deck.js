(() => {
  const MOVE_DECK_POLICY = "candidate-move-deck/v1";
  const SHA256_K = Object.freeze([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);

  function rotr(value, bits) {
    return (value >>> bits) | (value << (32 - bits));
  }

  function sha256(value) {
    const bytes = new TextEncoder().encode(String(value));
    const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
    const message = new Uint8Array(paddedLength);
    message.set(bytes);
    message[bytes.length] = 0x80;
    const bitLength = bytes.length * 8;
    const high = Math.floor(bitLength / 0x100000000);
    const low = bitLength >>> 0;
    const view = new DataView(message.buffer);
    view.setUint32(paddedLength - 8, high, false);
    view.setUint32(paddedLength - 4, low, false);

    const hash = new Uint32Array([
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
      0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
    ]);
    const words = new Uint32Array(64);

    for (let offset = 0; offset < message.length; offset += 64) {
      for (let index = 0; index < 16; index += 1) {
        words[index] = view.getUint32(offset + index * 4, false);
      }
      for (let index = 16; index < 64; index += 1) {
        const left = words[index - 15];
        const right = words[index - 2];
        const s0 = rotr(left, 7) ^ rotr(left, 18) ^ (left >>> 3);
        const s1 = rotr(right, 17) ^ rotr(right, 19) ^ (right >>> 10);
        words[index] = (words[index - 16] + s0 + words[index - 7] + s1) >>> 0;
      }

      let a = hash[0];
      let b = hash[1];
      let c = hash[2];
      let d = hash[3];
      let e = hash[4];
      let f = hash[5];
      let g = hash[6];
      let h = hash[7];

      for (let index = 0; index < 64; index += 1) {
        const sum1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0;
        const choice = ((e & f) ^ (~e & g)) >>> 0;
        const temp1 = (h + sum1 + choice + SHA256_K[index] + words[index]) >>> 0;
        const sum0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0;
        const majority = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
        const temp2 = (sum0 + majority) >>> 0;
        h = g;
        g = f;
        f = e;
        e = (d + temp1) >>> 0;
        d = c;
        c = b;
        b = a;
        a = (temp1 + temp2) >>> 0;
      }

      hash[0] = (hash[0] + a) >>> 0;
      hash[1] = (hash[1] + b) >>> 0;
      hash[2] = (hash[2] + c) >>> 0;
      hash[3] = (hash[3] + d) >>> 0;
      hash[4] = (hash[4] + e) >>> 0;
      hash[5] = (hash[5] + f) >>> 0;
      hash[6] = (hash[6] + g) >>> 0;
      hash[7] = (hash[7] + h) >>> 0;
    }

    return [...hash].map((part) => part.toString(16).padStart(8, "0")).join("");
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

  const api = Object.freeze({
    MOVE_DECK_POLICY,
    dealCandidateMoves,
  });

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof globalThis !== "undefined") globalThis.candidateMoveDeck = api;
})();
