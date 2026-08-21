const fs = require("node:fs/promises");
const path = require("node:path");
const legacy = require("./render-legacy.cjs");
const {
  assOverride,
  resolveHauntedTypography,
  typographyEvidence,
} = require("./haunted-typography.cjs");
const { applyPrimitiveFieldToGraph } = require("./primitive-field.cjs");
const { applyAtmosphereToGraph } = require("./atmosphere.cjs");
const {
  applyResolutionFieldToAtmosphereGraph,
} = require("./atmosphere-resolution-field.cjs");

const TEXT_OVERLAY_FILENAME = "text-overlay.ass";
const LYRIC_PRIMARY_COLOUR = "&H33FFFFFF";

function typographyContextForTimeline(scoreAddress, timeline = {}) {
  return Object.freeze({
    scoreIdentity: scoreAddress || null,
    profileIdentity:
      timeline?.rendererProfileHash || timeline?.rendererPolicy || null,
    atmosphereTimeline: timeline || null,
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

function integrateLyricAssStyle(line) {
  if (!String(line || "").startsWith("Style: Lyrics,")) return line;
  const fields = String(line).split(",");
  if (fields.length < 23) return line;

  // ASS alpha lives in the high byte: 0x33 is ~20% transparent / 80% visible.
  fields[3] = LYRIC_PRIMARY_COLOUR;
  fields[4] = LYRIC_PRIMARY_COLOUR;
  // BorderStyle=1 keeps outline + shadow while removing the opaque subtitle plate.
  fields[15] = "1";
  return fields.join(",");
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
      const styledLine = integrateLyricAssStyle(line);
      const fields = parseAssDialogue(styledLine);
      if (!fields) return styledLine;
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
      if (!treatment) return styledLine;
      fields[9] = applyTreatmentToEventText(fields[9], treatment);
      return fields.join(",");
    })
    .join("\n");
}

async function buildHauntedFilterGraph({
  scoreIdentity = null,
  profileIdentity = null,
  atmosphereTimeline = null,
  atmosphereResolutionScale = null,
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
  const primitiveField = applyPrimitiveFieldToGraph({
    graph: baseFilter.graph,
    timeline: atmosphereTimeline,
    width: legacyConfig.width,
    height: legacyConfig.height,
  });
  const atmosphere = await applyAtmosphereToGraph({
    graph: primitiveField.graph,
    tempDirectory: legacyConfig.tempDirectory,
    timeline: atmosphereTimeline,
    width: legacyConfig.width,
    height: legacyConfig.height,
  });
  const atmosphereResolution =
    atmosphereResolutionScale == null || !atmosphere.evidence.fileName
      ? null
      : applyResolutionFieldToAtmosphereGraph({
          graph: atmosphere.graph,
          fileName: atmosphere.evidence.fileName,
          width: legacyConfig.width,
          height: legacyConfig.height,
          scale: atmosphereResolutionScale,
        });
  const atmosphereEvidence = atmosphereResolution
    ? Object.freeze({
        ...atmosphere.evidence,
        resolutionField: atmosphereResolution.evidence,
      })
    : atmosphere.evidence;
  return {
    ...baseFilter,
    graph: atmosphereResolution?.graph || atmosphere.graph,
    primitiveFieldEvidence: primitiveField.evidence,
    atmosphereEvidence,
    typographyPlan,
    typographyEvidence: typographyEvidence(typographyPlan),
  };
}

module.exports = {
  LYRIC_PRIMARY_COLOUR,
  TEXT_OVERLAY_FILENAME,
  applyTreatmentToEventText,
  applyTypographyToAss,
  buildHauntedFilterGraph,
  caseAssText,
  integrateLyricAssStyle,
  parseAssDialogue,
  resolveOverlayTypography,
  typographyContextForTimeline,
};
