const WITNESS_WINDOW_POLICY = "witness-window-v1";
const FINAL_OUTPUT_LABEL = "vout";
const PRE_WITNESS_LABEL = "preWitnessWindow";
const WITNESS_OUTPUT_LABEL = "witnessWindow";

function positiveDimension(value, label) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0) {
    throw new TypeError(`${label} must be a positive safe integer.`);
  }
  return number;
}

function pixelFormatToken(value) {
  const token = String(value || "").trim();
  if (!/^[A-Za-z0-9_]+$/.test(token)) {
    throw new TypeError("Witness Window pixel format must be a simple FFmpeg pixel-format token.");
  }
  return token;
}

function applyWitnessWindowToGraph(graph, options = {}) {
  const source = String(graph || "");
  const seam = `[${FINAL_OUTPUT_LABEL}]`;
  const matches = source.match(/\[vout\]/g) || [];
  if (matches.length !== 1) {
    throw new Error("Witness Window requires exactly one final video output seam [vout].");
  }

  const width = positiveDimension(options.width, "Witness Window width");
  const height = positiveDimension(options.height, "Witness Window height");
  const pixelFormat = pixelFormatToken(options.pixelFormat);
  const projected = source.replace(seam, `[${PRE_WITNESS_LABEL}]`);
  // Foreign full-range video material must not leak a full-range flag into a
  // yuv420p transport. The historical Witness Window flattened pixel FORMAT
  // without normalizing RANGE; ffprobe then sees yuvj420p and the original
  // renderer correctly rejects its own result. Scale's out_range=tv binds
  // the observable transport to the owner's declared limited-range profile.
  const witnessGraph = `${projected};\n[${PRE_WITNESS_LABEL}]setsar=1,scale=in_range=auto:out_range=tv,format=${pixelFormat}[${WITNESS_OUTPUT_LABEL}]`;
  const evidence = Object.freeze({
    policyVersion: WITNESS_WINDOW_POLICY,
    width,
    height,
    sampleAspectRatio: "1:1",
    pixelFormat,
    alphaPolicy: "flattened-none",
    observableVideoStreams: 1,
  });

  return Object.freeze({
    graph: witnessGraph,
    outputLabel: WITNESS_OUTPUT_LABEL,
    evidence,
  });
}

module.exports = {
  WITNESS_WINDOW_POLICY,
  applyWitnessWindowToGraph,
};
