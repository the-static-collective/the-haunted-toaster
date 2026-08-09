const fs = require("node:fs/promises");
const path = require("node:path");
const legacy = require("./render-legacy.cjs");
const {
  assOverride,
  resolveHauntedTypography,
  typographyEvidence,
} = require("./haunted-typography.cjs");

const TEXT_OVERLAY_FILENAME = "text-overlay.ass";

function typographyContextForTimeline(scoreAddress, timeline = {}) {
  return Object.freeze({
    scoreIdentity: scoreAddress || null,
    profileIdentity:
      timeline?.rendererProfileHash || timeline?.rendererPolicy || null,
  });
}

function resolveOverlayTypography({
  analysis,
  title = "",
  artist = "",
  lyricTrack,
  lyricGhostPlan,
  scoreIdentity = null,
  profileIdentity = null,
}) {
  if (!analysis?.filename) {
    throw new TypeError("Media analysis is required to resolve overlay typography.");
  }
  const effectiveTitle = title || path.parse(analysis.filename).name;
  return resolveHauntedTypography({
    scoreIdentity,
    profileIdentity,
    title: effectiveTitle,
    artist,
    cues: lyricTrack?.cues || [],
    ghosts: lyricGhostPlan?.apparitions || [],
  });
}

function parseAssDialogue(line) {
  if (!line.startsWith("Dialogue:")) return null;
  const fields = [];
  let start = 0;
  for (let index = 0; index < 9; index += 1) {
    const comma = line.indexOf(",", start);
    if (comma < 0) return null;
    fields.push(line.slice(start, comma));
    start = comma + 1;
  }
  fields.push(line.slice(start));
  return fields;
}

function caseAssText(value, mode) {
  const text = String(value || "");
  if (mode === "preserve" || !mode) return text;
  let uppercase = true;
  let output = "";
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === "\\" && /[Nnh]/.test(text[index + 1] || "")) {
      output += character + text[index + 1];
      index += 1;
      continue;
    }
    if (!/[A-Za-z]/.test(character)) {
      output += character;
      continue;
    }
    if (mode === "upper") {
      output += character.toUpperCase();
      continue;
    }
    if (mode === "lower") {
      output += character.toLowerCase();
      continue;
    }
    if (mode === "alternating") {
      output += uppercase ? character.toUpperCase() : character.toLowerCase();
      uppercase = !uppercase;
      continue;
    }
    output += character;
  }
  return output;
}

function applyTreatmentToEventText(value, treatment) {
  if (!treatment) return value;
  const match = String(value || "").match(/^((?:\{[^}]*\})*)([\s\S]*)$/);
  const existingOverrides = match?.[1] || "";
  const body = match?.[2] || "";
  return `${existingOverrides}${assOverride(treatment)}${caseAssText(
    body,
    treatment.caseMode,
  )}`;
}

function applyTypographyToAss(content, plan) {
  let cueIndex = 0;
  let ghostIndex = 0;
  const lines = String(content || "").split(/\r?\n/);
  return lines
    .map((line) => {
      const fields = parseAssDialogue(line);
      if (!fields) return line;
      const style = fields[3];
      let treatment = null;
      if (style === "Title") treatment = plan.title;
      if (style === "Artist") treatment = plan.artist;
      if (style === "Ghost") {
        treatment = plan.ghosts?.[ghostIndex] || null;
        ghostIndex += 1;
      }
      if (style === "Lyrics") {
        treatment = plan.cues?.[cueIndex] || null;
        cueIndex += 1;
      }
      if (!treatment) return line;
      fields[9] = applyTreatmentToEventText(fields[9], treatment);
      return fields.join(",");
    })
    .join("\n");
}

async function buildHauntedFilterGraph({
  scoreIdentity = null,
  profileIdentity = null,
  ...legacyConfig
}) {
  const baseFilter = await legacy.buildFilterGraph(legacyConfig);
  const typographyPlan = resolveOverlayTypography({
    analysis: legacyConfig.analysis,
    title: legacyConfig.title,
    artist: legacyConfig.artist,
    lyricTrack: baseFilter.lyricTrack,
    lyricGhostPlan: baseFilter.lyricGhostPlan,
    scoreIdentity,
    profileIdentity,
  });
  const overlayPath = path.join(
    legacyConfig.tempDirectory,
    TEXT_OVERLAY_FILENAME,
  );
  const overlay = await fs.readFile(overlayPath, "utf8");
  await fs.writeFile(
    overlayPath,
    applyTypographyToAss(overlay, typographyPlan),
    "utf8",
  );
  return {
    ...baseFilter,
    typographyPlan,
    typographyEvidence: typographyEvidence(typographyPlan),
  };
}

module.exports = {
  TEXT_OVERLAY_FILENAME,
  applyTreatmentToEventText,
  applyTypographyToAss,
  buildHauntedFilterGraph,
  caseAssText,
  parseAssDialogue,
  resolveOverlayTypography,
  typographyContextForTimeline,
};
