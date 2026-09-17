"use strict";

function normalizeSpecimens(specimens) {
  if (!Array.isArray(specimens)) {
    throw new TypeError("specimens must be an array");
  }
  const seen = new Set();
  return specimens.map((specimen) => {
    if (!specimen || typeof specimen.id !== "string" || !specimen.id) {
      throw new TypeError("specimen id must be a non-empty string");
    }
    if (seen.has(specimen.id)) {
      throw new TypeError(`duplicate specimen id: ${specimen.id}`);
    }
    seen.add(specimen.id);
    if (!Array.isArray(specimen.claims) || !specimen.claims.every((claim) => typeof claim === "string" && claim)) {
      throw new TypeError(`claims for ${specimen.id} must be non-empty strings`);
    }
    return {
      id: specimen.id,
      claims: new Set(specimen.claims),
    };
  });
}

function combinations(items, size) {
  const result = [];
  function walk(start, chosen) {
    if (chosen.length === size) {
      result.push(chosen.slice());
      return;
    }
    const remainingNeeded = size - chosen.length;
    for (let index = start; index <= items.length - remainingNeeded; index += 1) {
      chosen.push(items[index]);
      walk(index + 1, chosen);
      chosen.pop();
    }
  }
  walk(0, []);
  return result;
}

function coveredClaims(group) {
  const covered = new Set();
  for (const specimen of group) {
    for (const claim of specimen.claims) covered.add(claim);
  }
  return covered;
}

function missingClaims(requiredClaims, group) {
  const covered = coveredClaims(group);
  return requiredClaims.filter((claim) => !covered.has(claim));
}

function findMinimumWitnessCovers({ requiredClaims, specimens }) {
  if (!Array.isArray(requiredClaims) || !requiredClaims.every((claim) => typeof claim === "string" && claim)) {
    throw new TypeError("requiredClaims must be an array of non-empty strings");
  }
  const required = [...requiredClaims];
  const normalized = normalizeSpecimens(specimens);
  const uncoverableClaims = missingClaims(required, normalized).sort();

  if (uncoverableClaims.length > 0) {
    return {
      requiredClaims: required,
      minimumSize: null,
      covers: [],
      uncoverableClaims,
      authority: "none",
    };
  }

  for (let size = 0; size <= normalized.length; size += 1) {
    const covers = combinations(normalized, size)
      .filter((group) => missingClaims(required, group).length === 0)
      .map((group) => group.map((specimen) => specimen.id));
    if (covers.length > 0) {
      return {
        requiredClaims: required,
        minimumSize: size,
        covers,
        uncoverableClaims: [],
        authority: "none",
      };
    }
  }

  return {
    requiredClaims: required,
    minimumSize: null,
    covers: [],
    uncoverableClaims: [...required].sort(),
    authority: "none",
  };
}

function claimsLostIfSpecimenFails({ cover, failedSpecimenId, requiredClaims, specimens }) {
  if (!Array.isArray(cover)) {
    throw new TypeError("cover must be an array");
  }
  const normalized = normalizeSpecimens(specimens);
  const byId = new Map(normalized.map((specimen) => [specimen.id, specimen]));
  const survivors = cover
    .filter((id) => id !== failedSpecimenId)
    .map((id) => {
      const specimen = byId.get(id);
      if (!specimen) throw new TypeError(`unknown specimen id: ${id}`);
      return specimen;
    });
  return missingClaims([...requiredClaims], survivors).sort();
}

module.exports = {
  findMinimumWitnessCovers,
  claimsLostIfSpecimenFails,
};
