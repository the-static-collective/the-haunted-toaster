const INTERNAL_DRAMA_BIAS = 0.55;
const SILENCE_KNEE = 0.08;
const CAMERA_SURRENDER_FLOOR = 0.35;
const CAMERA_SURRENDER_SPAN = 0.45;

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, Number(value)));
}

function quantize(value, places = 6) {
  const scale = 10 ** places;
  return Math.round(Number(value) * scale) / scale;
}

function smoothstep01(value) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function effectiveInternalEnergy(value) {
  const raw = clamp(Number(value) || 0, 0, 1);
  if (raw <= 0) return 0;

  const lifted = raw + INTERNAL_DRAMA_BIAS * (Math.sqrt(raw) - raw);
  const silenceGate = smoothstep01(raw / SILENCE_KNEE);
  return quantize(clamp(lifted * silenceGate, 0, 1));
}

function cameraSurrender(value) {
  const variance = clamp(Number(value) || 0, 0, 1);
  return quantize(CAMERA_SURRENDER_FLOOR + variance * CAMERA_SURRENDER_SPAN);
}

module.exports = {
  CAMERA_SURRENDER_FLOOR,
  CAMERA_SURRENDER_SPAN,
  INTERNAL_DRAMA_BIAS,
  SILENCE_KNEE,
  cameraSurrender,
  effectiveInternalEnergy,
};
