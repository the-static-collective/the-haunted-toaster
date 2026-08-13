const { deepFreeze } = require("./generation/canonical.cjs");

const TOAST_FEEL_CONTRACT = "toast-feel-v1";
const PRESSURE_AXES = Object.freeze([
  "motion",
  "variance",
  "contrast",
  "imperfection",
  "camera",
  "temporal",
]);

const DEFINITIONS = [
  ["low-and-slow", "Low & Slow", "Keep some heat in reserve.", "ordinary", { motion: -0.55, variance: -0.45, contrast: -0.10, imperfection: -0.25, camera: -0.50, temporal: -0.40 }],
  ["porch-ghost", "Porch Ghost", "Warm edges. Something still moving outside.", "ordinary", { motion: -0.20, variance: 0.10, contrast: -0.15, imperfection: 0.20, camera: -0.15, temporal: 0 }],
  ["wire-heat", "Wire Heat", "Tension before flame.", "ordinary", { motion: 0.35, variance: 0.25, contrast: 0.40, imperfection: 0.10, camera: 0.10, temporal: 0.25 }],
  ["ash-bloom", "Ash Bloom", "Let the residue become the flower.", "ordinary", { motion: -0.05, variance: 0.30, contrast: 0.15, imperfection: 0.60, camera: -0.05, temporal: 0.15 }],
  ["burnt-halo", "Burnt Halo", "Bright center. Scorched perimeter.", "ordinary", { motion: 0.05, variance: -0.05, contrast: 0.65, imperfection: 0.25, camera: 0.05, temporal: -0.05 }],
  ["risky-hybrid", "Risky Hybrid", "Cross a few wires on purpose.", "ordinary", { motion: 0.45, variance: 0.65, contrast: 0.35, imperfection: 0.55, camera: 0.45, temporal: 0.55 }],
  ["madd-clown-crazy-slots", "MADD CLOWN CRAZY SLOTS", "Maximum lawful surprise.", "madd-clown", null],
];

function normalizeDefinition([id, name, invitation, semanticClass, pressure]) {
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
  } else if (pressure !== null) {
    throw new TypeError("MADD CLOWN delegates to STOMP and cannot carry ordinary pressure.");
  }
  return deepFreeze({
    id,
    name,
    invitation,
    iconId: `toast-${id}`,
    contractVersion: TOAST_FEEL_CONTRACT,
    semanticClass,
    pressure: pressure ? { ...pressure } : null,
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
  PRESSURE_AXES,
  TOAST_FEEL_CONTRACT,
  TOAST_FEELS,
  getToastFeel,
  listToastFeels,
};
