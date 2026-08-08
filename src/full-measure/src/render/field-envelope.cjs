function quantize(value, places = 6) {
  const scale = 10 ** places;
  return Math.round(Number(value) * scale) / scale;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, Number(value) || 0));
}

function assertFrameDimension(value, name) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw new TypeError(`${name} must be a positive integer.`);
  }
  return number;
}

function resolveFieldEnvelope(state, frame = {}) {
  const width = assertFrameDimension(frame.width, "frame.width");
  const height = assertFrameDimension(frame.height, "frame.height");
  const topology = state?.topology;

  if (topology === "linear") {
    return Object.freeze({
      policy: "legacy-linear",
      topology,
      frame: Object.freeze({ width, height }),
      envelope: Object.freeze({ x: 0, y: 0, width, height }),
      safeExpansion: Object.freeze({ pixels: 0, rotationPixels: 0, displacementPixels: 0 }),
      working: Object.freeze({ width, height, stageWidth: width, stageHeight: height, stageX: 0, stageY: 0, cropX: 0, cropY: 0 }),
    });
  }

  if (topology !== "circle" && topology !== "mirrored-ring") {
    throw new TypeError(`Unsupported field-envelope topology: ${String(topology)}.`);
  }

  // Keep the non-linear field a bounded square object while allowing it to reach
  // the full physical frame height. On a 16:9 frame this deliberately preserves
  // left/right exposure instead of introducing global full bleed.
  const envelopeSize = Math.min(width, height);
  const envelopeX = Math.floor((width - envelopeSize) / 2);
  const envelopeY = Math.floor((height - envelopeSize) / 2);

  const motion = state?.motion || {};
  const material = state?.material || {};
  const camera = state?.camera || {};

  // A square rotating through 45 degrees needs this much headroom per side to
  // avoid exposing its source boundary. Add a small deterministic displacement
  // budget for the recorded motion/material/camera state. This is internal
  // effect headroom, not visible overscan authority.
  const rotationPixels = Math.ceil(((Math.SQRT2 - 1) * envelopeSize) / 2);
  const displacementRatio =
    0.01 +
    clamp(motion.amplitude, 0, 1) * 0.01 +
    clamp(motion.variance, 0, 1) * 0.01 +
    clamp(material.imperfection, 0, 1) * 0.015 +
    clamp(camera.variance, 0, 1) * 0.025;
  const displacementPixels = Math.ceil(envelopeSize * displacementRatio);
  const expansionPixels = rotationPixels + displacementPixels;

  const workingWidth = envelopeSize + expansionPixels * 2;
  const workingHeight = envelopeSize + expansionPixels * 2;
  const stageWidth = Math.max(width, workingWidth);
  const stageHeight = Math.max(height, workingHeight);
  const stageX = Math.floor((stageWidth - workingWidth) / 2);
  const stageY = Math.floor((stageHeight - workingHeight) / 2);
  const cropX = Math.floor((stageWidth - width) / 2);
  const cropY = Math.floor((stageHeight - height) / 2);

  return Object.freeze({
    policy: "bounded-full-height-v1",
    topology,
    frame: Object.freeze({ width, height }),
    envelope: Object.freeze({
      x: envelopeX,
      y: envelopeY,
      width: envelopeSize,
      height: envelopeSize,
    }),
    safeExpansion: Object.freeze({
      pixels: expansionPixels,
      rotationPixels,
      displacementPixels,
      displacementRatio: quantize(displacementRatio),
    }),
    working: Object.freeze({
      width: workingWidth,
      height: workingHeight,
      stageWidth,
      stageHeight,
      stageX,
      stageY,
      cropX,
      cropY,
    }),
  });
}

module.exports = {
  resolveFieldEnvelope,
};
