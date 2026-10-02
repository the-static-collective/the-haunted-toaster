const {
  deepFreeze,
  hashCanonical,
  quantizeNumber,
} = require("./canonical.cjs");

const LISTENING_EYE_SCHEMA = "haunted-toaster/listening-eye/v0";
const LISTENING_EYE_POLICY = "listening-eye-influence-only-v0";
const LISTENING_EYE_DOMAIN = "HauntedToaster-ListeningEye-v0";

const LENSES = Object.freeze([
  Object.freeze({
    id: "landscape",
    name: "Landscape",
    motifs: ["horizon", "road", "relief", "landmark"],
    sectionRole: "terrain mass and elevation",
    phraseRole: "path curvature and local contour",
    transientRole: "ridge break, flash, or impact scar",
    historyRole: "erosion, wake, and remembered route",
    albumRole: "recurring places mature across tracks",
  }),
  Object.freeze({
    id: "architecture",
    name: "Architecture",
    motifs: ["gate", "chamber", "rib", "aperture"],
    sectionRole: "room scale and structural load",
    phraseRole: "opening, corridor, and repeated bay",
    transientRole: "door strike, fracture, or light cut",
    historyRole: "rooms retain traces of prior occupation",
    albumRole: "shared structures become more legible across tracks",
  }),
  Object.freeze({
    id: "organism",
    name: "Organism",
    motifs: ["branch", "membrane", "pulse", "scar"],
    sectionRole: "body state and metabolic pressure",
    phraseRole: "breath, branching, and gesture",
    transientRole: "twitch, rupture, or bloom",
    historyRole: "growth rings and scar tissue preserve prior motion",
    albumRole: "the same body can age, molt, heal, or mutate across tracks",
  }),
  Object.freeze({
    id: "sigil",
    name: "Sigil / Type",
    motifs: ["stroke", "glyph", "echo", "break"],
    sectionRole: "overall inscription density",
    phraseRole: "stroke group, word-shape, or repeated mark",
    transientRole: "puncture, slash, spark, or typographic break",
    historyRole: "marks ghost, overwrite, and accumulate",
    albumRole: "symbols recur before their meaning becomes explicit",
  }),
  Object.freeze({
    id: "weather",
    name: "Weather / Particles",
    motifs: ["dust", "spark", "mist", "rain"],
    sectionRole: "atmospheric pressure and visibility",
    phraseRole: "gust, drift, cloud band, or local current",
    transientRole: "spark burst, droplet strike, or particulate shock",
    historyRole: "weather leaves residue and trails",
    albumRole: "climate becomes a continuity layer across otherwise different scenes",
  }),
  Object.freeze({
    id: "dimensional-space",
    name: "Dimensional Space",
    motifs: ["depth", "fold", "parallax", "void"],
    sectionRole: "depth regime and world scale",
    phraseRole: "camera translation, fold, or parallax shift",
    transientRole: "plane snap, cut, or dimensional puncture",
    historyRole: "earlier states remain as nested or offset spaces",
    albumRole: "later tracks may reveal that earlier spaces were parts of one larger geometry",
  }),
]);

function clamp01(value) {
  return quantizeNumber(Math.min(1, Math.max(0, Number(value) || 0)));
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length;
}

function hashUnit(value) {
  const digest = hashCanonical(value, `${LISTENING_EYE_DOMAIN}-Seed`);
  return Number.parseInt(digest.slice(0, 8), 16) / 0xffffffff;
}

function normalizeAlbumContext(input = {}) {
  const trackCount = Math.max(1, Math.trunc(Number(input.trackCount) || 1));
  const trackIndex = Math.min(trackCount, Math.max(1, Math.trunc(Number(input.trackIndex) || 1)));
  const trackPosition = trackCount === 1 ? 0.5 : (trackIndex - 1) / (trackCount - 1);
  return deepFreeze({
    albumId: input.albumId ? String(input.albumId) : null,
    albumSeed: input.albumSeed ? String(input.albumSeed) : null,
    trackIndex,
    trackCount,
    trackPosition: quantizeNumber(trackPosition),
    foreshadowPressure: quantizeNumber(1 - trackPosition),
    arrivalPressure: quantizeNumber(trackPosition),
  });
}

function normalizeAnalysis(analysis) {
  const durationSeconds = Number(analysis?.durationSeconds);
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new TypeError("Listening Eye requires analysis.durationSeconds > 0.");
  }
  const sections = Array.isArray(analysis.sections) ? analysis.sections : [];
  if (!sections.length) throw new TypeError("Listening Eye requires at least one analysis section.");
  const normalizedSections = sections.map((section, index) => ({
    startSeconds: quantizeNumber(Number(section.startSeconds) || 0),
    endSeconds: quantizeNumber(Number(section.endSeconds) || durationSeconds),
    energy: clamp01(section.energy),
    label: String(section.label || `section-${index + 1}`),
  }));
  const phrases = (Array.isArray(analysis.phrases) ? analysis.phrases : []).map((event) => ({
    atSeconds: quantizeNumber(Number(event.atSeconds) || 0),
    energy: clamp01(event.energy),
  }));
  const transients = (Array.isArray(analysis.transients) ? analysis.transients : []).map((event) => ({
    atSeconds: quantizeNumber(Number(event.atSeconds) || 0),
    energy: clamp01(event.energy),
  }));
  return deepFreeze({
    schema: analysis.schema ? String(analysis.schema) : null,
    durationSeconds: quantizeNumber(durationSeconds),
    sections: normalizedSections,
    phrases,
    transients,
  });
}

function summarizeAnalysis(analysis) {
  const energies = analysis.sections.map((section) => section.energy);
  const minEnergy = Math.min(...energies);
  const maxEnergy = Math.max(...energies);
  const phraseEnergy = analysis.phrases.map((event) => event.energy);
  const transientEnergy = analysis.transients.map((event) => event.energy);
  const eventsPerMinute = ((analysis.phrases.length + analysis.transients.length) / analysis.durationSeconds) * 60;
  const phraseRate = (analysis.phrases.length / analysis.durationSeconds) * 60;
  const transientRate = (analysis.transients.length / analysis.durationSeconds) * 60;
  const openingEnergy = energies[0];
  const closingEnergy = energies[energies.length - 1];
  return deepFreeze({
    meanEnergy: quantizeNumber(mean(energies)),
    minEnergy: quantizeNumber(minEnergy),
    peakEnergy: quantizeNumber(maxEnergy),
    dynamicRange: quantizeNumber(maxEnergy - minEnergy),
    openingEnergy: quantizeNumber(openingEnergy),
    closingEnergy: quantizeNumber(closingEnergy),
    arcDelta: quantizeNumber(closingEnergy - openingEnergy),
    phraseEnergy: quantizeNumber(mean(phraseEnergy)),
    transientEnergy: quantizeNumber(mean(transientEnergy)),
    eventDensity: clamp01(eventsPerMinute / 16),
    phraseDensity: clamp01(phraseRate / 10),
    transientDensity: clamp01(transientRate / 8),
  });
}

function lensPressures(lens, summary, album, rootSeed) {
  const jitter = hashUnit({ lensId: lens.id, rootSeed: String(rootSeed || ""), album });
  const signedJitter = (jitter - 0.5) * 0.18;
  const persistence = clamp01(0.3 + summary.dynamicRange * 0.45 + (1 - summary.eventDensity) * 0.2 + signedJitter);
  const motion = clamp01(summary.meanEnergy * 0.45 + summary.eventDensity * 0.4 + summary.transientDensity * 0.15 + signedJitter);
  const density = clamp01(summary.eventDensity * 0.55 + summary.meanEnergy * 0.3 + summary.phraseDensity * 0.15 - signedJitter / 2);
  const contrast = clamp01(summary.dynamicRange * 0.6 + summary.peakEnergy * 0.3 + summary.transientDensity * 0.1 + signedJitter);
  const memory = clamp01(persistence * 0.55 + album.foreshadowPressure * 0.2 + summary.dynamicRange * 0.25);
  const foreshadow = clamp01(album.foreshadowPressure * 0.7 + summary.dynamicRange * 0.2 + jitter * 0.1);
  const arrival = clamp01(album.arrivalPressure * 0.7 + summary.peakEnergy * 0.2 + (1 - jitter) * 0.1);
  return deepFreeze({
    motion,
    density,
    contrast,
    persistence,
    memory,
    foreshadow,
    arrival,
  });
}

function buildListeningEye({ analysis, rootSeed = "", albumContext = {} } = {}) {
  const normalizedAnalysis = normalizeAnalysis(analysis);
  const album = normalizeAlbumContext(albumContext);
  const summary = summarizeAnalysis(normalizedAnalysis);
  const analysisHash = hashCanonical(normalizedAnalysis, `${LISTENING_EYE_DOMAIN}-Analysis`);
  const lenses = LENSES.map((lens, slotIndex) => deepFreeze({
    slotIndex,
    id: lens.id,
    name: lens.name,
    motifs: [...lens.motifs],
    mapping: {
      section: lens.sectionRole,
      phrase: lens.phraseRole,
      transient: lens.transientRole,
      history: lens.historyRole,
      album: lens.albumRole,
    },
    pressures: lensPressures(lens, summary, album, rootSeed),
  }));
  const core = {
    schema: LISTENING_EYE_SCHEMA,
    policy: LISTENING_EYE_POLICY,
    authority: "influence-only",
    rootSeed: String(rootSeed || ""),
    analysisHash,
    album,
    summary,
    lenses,
  };
  return deepFreeze({
    ...core,
    listeningEyeSha256: hashCanonical(core, LISTENING_EYE_DOMAIN),
  });
}

module.exports = {
  LENSES,
  LISTENING_EYE_DOMAIN,
  LISTENING_EYE_POLICY,
  LISTENING_EYE_SCHEMA,
  buildListeningEye,
  normalizeAlbumContext,
  summarizeAnalysis,
};
