const {
  canonicalStringify,
  deepFreeze,
  hashCanonical,
} = require("./canonical.cjs");
const { EXPRESSIVE_RENDERER_POLICY } = require("./renderer-policy.cjs");

const COLOR_DRIFT_POLICY = "color-drift-v1";
const COLOR_DRIFT_DOMAIN = "HauntedToaster-ColorDrift-v1";

function quantize(value, places = 6) {
  const scale = 10 ** places;
  return Math.round(Number(value) * scale) / scale;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, Number(value)));
}

function sectionDriftStops(timeline, analysis) {
  const sections = Array.isArray(analysis?.sections) ? analysis.sections : [];
  if (sections.length < 2) return [];
  const basePalette = timeline.baseState?.palette || {};
  const baseBleed = clamp(Number(basePalette.bleed) || 0, 0, 1);
  const baseContrast = clamp(Number(basePalette.contrastBias) || 0, -1, 1);
  return sections.slice(1).map((section, index) => {
    const previous = sections[index] || {};
    const previousEnergy = clamp(Number(previous.energy) || 0, 0, 1);
    const energy = clamp(Number(section.energy) || 0, 0, 1);
    const energyDelta = energy - previousEnergy;
    const phase = index % 2 === 0 ? 1 : -1;
    const chromaPressure = quantize((energy - 0.5) * 2);
    const hueOffset = quantize(clamp(
      phase * (8 + Math.abs(energyDelta) * 32) + chromaPressure * 7 + baseContrast * 4,
      -28,
      28,
    ));
    const saturationMultiplier = quantize(clamp(
      1 + chromaPressure * 0.18 + Math.abs(energyDelta) * 0.12 + (baseBleed - 0.5) * 0.08,
      0.72,
      1.32,
    ));
    return Object.freeze({
      atTick: Math.max(0, Math.min(
        timeline.durationTicks,
        Math.round(Number(section.startSeconds) * timeline.timebase),
      )),
      boundary: "section",
      previousSection: String(previous.label || `section-${index}`),
      nextSection: String(section.label || `section-${index + 1}`),
      previousEnergy: quantize(previousEnergy),
      energy: quantize(energy),
      energyDelta: quantize(energyDelta),
      hueOffset,
      saturationMultiplier,
    });
  });
}

function applyColorDrift(timelineInput, { analysis } = {}) {
  if (!timelineInput || typeof timelineInput !== "object") {
    throw new TypeError("ResolvedTimeline is required for color drift resolution.");
  }
  if (timelineInput.colorDrift?.policyVersion === COLOR_DRIFT_POLICY) return timelineInput;
  if (timelineInput.rendererPolicy !== EXPRESSIVE_RENDERER_POLICY) return timelineInput;
  if (!analysis) throw new TypeError("Color drift requires canonical analysis evidence.");

  const stops = sectionDriftStops(timelineInput, analysis);
  if (!stops.length) return timelineInput;
  const planCore = {
    policyVersion: COLOR_DRIFT_POLICY,
    source: "section-energy-v1",
    stopCount: stops.length,
    stops,
  };
  const planSha256 = hashCanonical(planCore, COLOR_DRIFT_DOMAIN);
  const colorDrift = { ...planCore, planSha256 };
  const {
    timelineHash: _timelineHash,
    canonicalJson: _canonicalJson,
    ...baseBody
  } = timelineInput;
  const body = {
    ...structuredClone(baseBody),
    colorDrift,
  };
  const timelineHash = hashCanonical(body, "HauntedToaster-ResolvedTimeline-v1");
  return deepFreeze({
    ...body,
    timelineHash,
    canonicalJson: canonicalStringify(body),
  });
}

function driftAtTick(timeline, tick) {
  const drift = timeline?.colorDrift;
  if (!drift?.stops?.length) return Object.freeze({ hueOffset: 0, saturationMultiplier: 1 });
  const target = Math.max(0, Math.round(Number(tick)));
  let active = { hueOffset: 0, saturationMultiplier: 1 };
  for (const stop of drift.stops) {
    if (stop.atTick > target) break;
    active = stop;
  }
  return Object.freeze({
    hueOffset: Number(active.hueOffset) || 0,
    saturationMultiplier: Number(active.saturationMultiplier) || 1,
  });
}

module.exports = {
  COLOR_DRIFT_POLICY,
  applyColorDrift,
  driftAtTick,
  sectionDriftStops,
};