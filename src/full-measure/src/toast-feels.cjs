const { deepFreeze } = require("./generation/canonical.cjs");

const TOAST_FEEL_CONTRACT = "toast-feel-v2";
const PRESSURE_AXES = Object.freeze([
  "motion",
  "variance",
  "contrast",
  "imperfection",
  "camera",
  "temporal",
]);
const LATTICE_LAYERS = Object.freeze(["skeleton", "body", "frame", "skin", "weather", "time"]);

function affinity({ skeleton, body, frame, skin, weather, time }) {
  return { skeleton, body, frame, skin, weather, time };
}

const DEFINITIONS = [
  [
    "low-and-slow", "Low & Slow", "Keep some heat in reserve.", "ordinary",
    { motion: -0.55, variance: -0.45, contrast: -0.10, imperfection: -0.25, camera: -0.50, temporal: -0.40 },
    affinity({
      skeleton: { topologies: ["linear", "elastic-spine"] },
      body: { structures: ["scope", "ribs"], dynamics: ["inertial", "wave"] },
      frame: { cameras: ["locked", "drift"] },
      skin: { materials: ["clean", "grain"], palettes: ["garment", "analogous"], nativeColor: ["echo"] },
      weather: { atmospheres: ["none", "dust"] },
      time: { temporalDensity: ["frozen", "section"], recurrence: ["low"], possessionArc: ["restrained"] },
    }),
  ],
  [
    "porch-ghost", "Porch Ghost", "Warm edges. Something still moving outside.", "ordinary",
    { motion: -0.20, variance: 0.10, contrast: -0.15, imperfection: 0.20, camera: -0.15, temporal: 0 },
    affinity({
      skeleton: { topologies: ["circle", "echo-tunnel"] },
      body: { structures: ["ribs", "branches"], dynamics: ["drift", "advect", "wave"] },
      frame: { cameras: ["drift", "locked"] },
      skin: { materials: ["grain", "gate-weave"], palettes: ["analogous", "garment"], nativeColor: ["echo"] },
      weather: { atmospheres: ["smoke", "firefly"] },
      time: { temporalDensity: ["section", "phrase"], recurrence: ["medium"], possessionArc: ["apparition"] },
    }),
  ],
  [
    "wire-heat", "Wire Heat", "Tension before flame.", "ordinary",
    { motion: 0.35, variance: 0.25, contrast: 0.40, imperfection: 0.10, camera: 0.10, temporal: 0.25 },
    affinity({
      skeleton: { topologies: ["split-horizon", "quad-mirror"] },
      body: { structures: ["lattice", "facets"], dynamics: ["seismic", "magnetic", "snap"] },
      frame: { cameras: ["push", "drift"] },
      skin: { materials: ["gate-weave", "photocopy"], palettes: ["split-complement", "duotone"], nativeColor: ["counterpoint"] },
      weather: { atmospheres: ["rain", "dust"] },
      time: { temporalDensity: ["phrase", "transient"], recurrence: ["medium"], possessionArc: ["escalating"] },
    }),
  ],
  [
    "ash-bloom", "Ash Bloom", "Let the residue become the flower.", "ordinary",
    { motion: -0.05, variance: 0.30, contrast: 0.15, imperfection: 0.60, camera: -0.05, temporal: 0.15 },
    affinity({
      skeleton: { topologies: ["cathedral-fan", "spiral"] },
      body: { structures: ["folds", "branches"], dynamics: ["swarm", "advect"] },
      frame: { cameras: ["drift", "orbit"] },
      skin: { materials: ["photocopy", "grain"], palettes: ["analogous", "duotone"], nativeColor: ["echo"] },
      weather: { atmospheres: ["dust", "smoke", "firefly"] },
      time: { temporalDensity: ["section", "phrase"], recurrence: ["medium"], possessionArc: ["scar"] },
    }),
  ],
  [
    "burnt-halo", "Burnt Halo", "Bright center. Scorched perimeter.", "ordinary",
    { motion: 0.05, variance: -0.05, contrast: 0.65, imperfection: 0.25, camera: 0.05, temporal: -0.05 },
    affinity({
      skeleton: { topologies: ["circle", "cathedral-fan"] },
      body: { structures: ["torus", "ribs"], dynamics: ["oscillation", "inertial"] },
      frame: { cameras: ["locked", "push"] },
      skin: { materials: ["grain", "clean"], palettes: ["duotone", "split-complement"], nativeColor: ["counterpoint"] },
      weather: { atmospheres: ["firefly", "smoke"] },
      time: { temporalDensity: ["frozen", "section"], recurrence: ["low"], possessionArc: ["threshold"] },
    }),
  ],
  [
    "risky-hybrid", "Risky Hybrid", "Cross a few wires on purpose.", "ordinary",
    { motion: 0.45, variance: 0.65, contrast: 0.35, imperfection: 0.55, camera: 0.45, temporal: 0.55 },
    affinity({
      skeleton: { topologies: ["echo-tunnel", "split-horizon", "spiral", "cathedral-fan"] },
      body: { structures: ["branches", "voxels", "lattice"], dynamics: ["swarm", "magnetic", "whip"] },
      frame: { cameras: ["orbit", "push"] },
      skin: { materials: ["photocopy", "gate-weave"], palettes: ["split-complement", "duotone"], nativeColor: ["counterpoint", "echo"] },
      weather: { atmospheres: ["smoke", "rain", "dust", "firefly"] },
      time: { temporalDensity: ["phrase", "transient"], recurrence: ["high"], possessionArc: ["apparition", "succession", "scar"] },
    }),
  ],
  ["madd-clown-crazy-slots", "MADD CLOWN CRAZY SLOTS", "Maximum lawful surprise.", "madd-clown", null, null],
];

function normalizeDefinition([id, name, invitation, semanticClass, pressure, latticeAffinity]) {
  if (!id || !name || !invitation) throw new TypeError("Toast Feel identity and copy are required.");
  if (!["ordinary", "madd-clown"].includes(semanticClass)) {
    throw new TypeError(`Unknown Toast Feel semantic class: ${semanticClass}.`);
  }
  if (semanticClass === "ordinary") {
    for (const axis of PRESSURE_AXES) {
      const value = pressure?.[axis];
      if (!Number.isFinite(value) || value < -1 || value > 1) {
        throw new TypeError(`Toast Feel ${id} has invalid ${axis} pressure.`);
      }
    }
    if (!latticeAffinity || Object.keys(latticeAffinity).sort().join("|") !== [...LATTICE_LAYERS].sort().join("|")) {
      throw new TypeError(`Toast Feel ${id} must declare all six Mutation Lattice affinity layers.`);
    }
  } else if (pressure !== null || latticeAffinity !== null) {
    throw new TypeError("MADD CLOWN delegates to STOMP and cannot carry ordinary pressure or affinity.");
  }
  return deepFreeze({
    id,
    name,
    invitation,
    iconId: `toast-${id}`,
    contractVersion: TOAST_FEEL_CONTRACT,
    semanticClass,
    pressure: pressure ? { ...pressure } : null,
    affinity: latticeAffinity ? structuredClone(latticeAffinity) : null,
  });
}

const TOAST_FEELS = deepFreeze(DEFINITIONS.map(normalizeDefinition));
const FEELS_BY_ID = new Map(TOAST_FEELS.map((feel) => [feel.id, feel]));

function getToastFeel(id) {
  return FEELS_BY_ID.get(id) || null;
}

function listToastFeels() {
  return structuredClone(TOAST_FEELS);
}

module.exports = {
  LATTICE_LAYERS,
  PRESSURE_AXES,
  TOAST_FEEL_CONTRACT,
  TOAST_FEELS,
  getToastFeel,
  listToastFeels,
};
