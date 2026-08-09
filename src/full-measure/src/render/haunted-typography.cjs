const crypto = require("node:crypto");

const TYPOGRAPHY_POLICY_VERSION = "haunted-typography/v1";

const TREATMENTS = Object.freeze([
  Object.freeze({
    id: "condensed-scream",
    familyId: "arial",
    scaleX: 68,
    scaleY: 118,
    spacing: 1.2,
    angle: -2,
    bold: true,
    italic: false,
    outline: 2.4,
    shadow: 3.2,
    blur: 0.2,
    caseMode: "upper",
  }),
  Object.freeze({
    id: "wide-carnival",
    familyId: "arial",
    scaleX: 142,
    scaleY: 92,
    spacing: 2.8,
    angle: 1.5,
    bold: true,
    italic: false,
    outline: 1.6,
    shadow: 2.6,
    blur: 0,
    caseMode: "preserve",
  }),
  Object.freeze({
    id: "heavy-slab",
    familyId: "arial",
    scaleX: 104,
    scaleY: 108,
    spacing: 0.2,
    angle: 0,
    bold: true,
    italic: false,
    outline: 4,
    shadow: 1.2,
    blur: 0,
    caseMode: "upper",
  }),
  Object.freeze({
    id: "needle",
    familyId: "arial",
    scaleX: 54,
    scaleY: 138,
    spacing: 3.4,
    angle: 0,
    bold: false,
    italic: false,
    outline: 0.8,
    shadow: 1.4,
    blur: 0,
    caseMode: "preserve",
  }),
  Object.freeze({
    id: "tilted-ransom",
    familyId: "arial",
    scaleX: 92,
    scaleY: 106,
    spacing: 1.8,
    angle: -7,
    bold: true,
    italic: true,
    outline: 2.2,
    shadow: 4,
    blur: 0.3,
    caseMode: "alternating",
  }),
  Object.freeze({
    id: "ghost-echo",
    familyId: "arial",
    scaleX: 112,
    scaleY: 96,
    spacing: 1.4,
    angle: 0,
    bold: false,
    italic: true,
    outline: 0.6,
    shadow: 6,
    blur: 1.8,
    caseMode: "preserve",
  }),
  Object.freeze({
    id: "inverted-emphasis",
    familyId: "arial",
    scaleX: 98,
    scaleY: 112,
    spacing: 0.8,
    angle: 180,
    bold: true,
    italic: false,
    outline: 2.8,
    shadow: 2,
    blur: 0,
    caseMode: "upper",
  }),
  Object.freeze({
    id: "jittered-spacing",
    familyId: "arial",
    scaleX: 108,
    scaleY: 102,
    spacing: 5.2,
    angle: 3,
    bold: false,
    italic: true,
    outline: 1.4,
    shadow: 3.6,
    blur: 0.4,
    caseMode: "alternating",
  }),
]);

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

function hashValue(value) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");
}

function cleanText(value) {
  return String(value || "")
    .replace(/\0/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function unitFromHash(hash, offset = 0) {
  const start = offset % 56;
  return parseInt(hash.slice(start, start + 8), 16) / 0xffffffff;
}

function treatmentFor(identity) {
  const hash = hashValue(identity);
  const index = Math.floor(unitFromHash(hash, 0) * TREATMENTS.length) % TREATMENTS.length;
  return TREATMENTS[index];
}

function resolveTreatment(role, text, index, context) {
  const identity = {
    policyVersion: TYPOGRAPHY_POLICY_VERSION,
    role,
    text: cleanText(text),
    index,
    scoreIdentity: context.scoreIdentity || null,
    profileIdentity: context.profileIdentity || null,
  };
  const treatment = treatmentFor(identity);
  return Object.freeze({
    role,
    index,
    text: cleanText(text),
    treatmentId: treatment.id,
    familyId: treatment.familyId,
    scaleX: treatment.scaleX,
    scaleY: treatment.scaleY,
    spacing: treatment.spacing,
    angle: treatment.angle,
    bold: treatment.bold,
    italic: treatment.italic,
    outline: treatment.outline,
    shadow: treatment.shadow,
    blur: treatment.blur,
    caseMode: treatment.caseMode,
    identityHash: hashValue(identity),
  });
}

function resolveHauntedTypography({
  scoreIdentity = null,
  profileIdentity = null,
  title = "",
  artist = "",
  cues = [],
  ghosts = [],
} = {}) {
  const context = { scoreIdentity, profileIdentity };
  const normalizedCues = Array.isArray(cues) ? cues : [];
  const normalizedGhosts = Array.isArray(ghosts) ? ghosts : [];
  const titleTreatment = cleanText(title)
    ? resolveTreatment("title", title, 0, context)
    : null;
  const artistTreatment = cleanText(artist)
    ? resolveTreatment("artist", artist, 0, context)
    : null;
  const cueTreatments = normalizedCues.map((cue, index) =>
    resolveTreatment("lyric", cue?.text ?? cue, index, context),
  );
  const ghostTreatments = normalizedGhosts.map((ghost, index) =>
    resolveTreatment("ghost", ghost?.text ?? ghost, index, context),
  );

  const body = {
    policyVersion: TYPOGRAPHY_POLICY_VERSION,
    vocabularyId: `${TYPOGRAPHY_POLICY_VERSION}:morphology-8`,
    scoreIdentity,
    profileIdentity,
    title: titleTreatment,
    artist: artistTreatment,
    cues: cueTreatments,
    ghosts: ghostTreatments,
  };

  return Object.freeze({
    ...body,
    hash: hashValue(body),
  });
}

function typographyEvidence(plan) {
  if (!plan) return null;
  const specimens = [
    plan.title,
    plan.artist,
    ...(plan.cues || []),
    ...(plan.ghosts || []),
  ].filter(Boolean);
  const specimenIds = [...new Set(specimens.map((item) => item.treatmentId))].sort();
  return Object.freeze({
    policyVersion: plan.policyVersion,
    vocabularyId: plan.vocabularyId,
    specimenIds: Object.freeze(specimenIds),
    planSha256: plan.hash,
  });
}

function applyCaseMode(text, mode) {
  const value = cleanText(text);
  if (mode === "upper") return value.toUpperCase();
  if (mode === "lower") return value.toLowerCase();
  if (mode === "alternating") {
    let uppercase = true;
    return [...value]
      .map((character) => {
        if (!/[A-Za-z]/.test(character)) return character;
        const next = uppercase ? character.toUpperCase() : character.toLowerCase();
        uppercase = !uppercase;
        return next;
      })
      .join("");
  }
  return value;
}

function assOverride(treatment, extra = "") {
  if (!treatment) return extra ? `{${extra}}` : "";
  const tags = [
    `\\fscx${treatment.scaleX}`,
    `\\fscy${treatment.scaleY}`,
    `\\fsp${treatment.spacing}`,
    `\\frz${treatment.angle}`,
    `\\b${treatment.bold ? 1 : 0}`,
    `\\i${treatment.italic ? 1 : 0}`,
    `\\bord${treatment.outline}`,
    `\\shad${treatment.shadow}`,
    `\\blur${treatment.blur}`,
  ];
  if (extra) tags.push(extra);
  return `{${tags.join("")}}`;
}

module.exports = {
  TYPOGRAPHY_POLICY_VERSION,
  TREATMENTS,
  applyCaseMode,
  assOverride,
  hashValue,
  resolveHauntedTypography,
  typographyEvidence,
};
