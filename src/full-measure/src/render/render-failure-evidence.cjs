const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const { canonicalStringify } = require("../generation/index.cjs");
const { compactTopologyEventEvidence } = require("./receipt.cjs");
const { promoteTopologyResponseEvidence } = require("./visual-compiler-evidence.cjs");

const RENDER_FAILURE_EVIDENCE_SCHEMA = "full-measure.render-failure.v1";

function portableBasename(value) {
  return String(value || "").split(/[\\/]/).filter(Boolean).pop() || "";
}

function looksAbsolutePath(value) {
  if (typeof value !== "string" || !value) return false;
  return path.isAbsolute(value) || /^[A-Za-z]:[\\/]/.test(value) || /^\\\\/.test(value);
}

function sanitizeFfmpegArg(value) {
  return looksAbsolutePath(value) ? portableBasename(value) : value;
}

function sanitizeMediaEvidence(media) {
  if (!media || typeof media !== "object") return null;
  const { path: ignoredPath, filename, ...rest } = media;
  return { filename: portableBasename(filename || ignoredPath), ...rest };
}

function compactBuildInfo(buildInfo) {
  if (!buildInfo || typeof buildInfo !== "object") return null;
  return {
    version: buildInfo.version || null,
    commit: buildInfo.commit || null,
    dirty: Boolean(buildInfo.dirty),
    builtAt: buildInfo.builtAt || null,
    sourceMode: Boolean(buildInfo.sourceMode),
  };
}

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function canonicalArtifactText(value) {
  return `${canonicalStringify(value)}\n`;
}

async function removeRenderFailureBundle(outputPath) {
  if (!outputPath) return;
  await fs.rm(`${outputPath}.render-failure`, { recursive: true, force: true });
}

async function writeRenderFailureBundle({
  outputPath,
  error,
  filterPath,
  ffmpegArgs,
  visualScore,
  resolvedTimeline,
  buildInfo,
  sourceAudio,
  sourceImage,
  visualCompiler,
  jobId,
  startedAt,
  lastProgress,
}) {
  if (!error?.processFailure) {
    throw new TypeError("Structured process failure evidence is required.");
  }
  if (!outputPath || !filterPath) {
    throw new TypeError("Output and filter graph paths are required.");
  }

  const directory = `${outputPath}.render-failure`;
  const graph = await fs.readFile(filterPath, "utf8");
  const graphSha256 = crypto.createHash("sha256").update(graph, "utf8").digest("hex");
  const processFailure = error.processFailure;
  const timeline = resolvedTimeline || {};
  const topologyEvents = compactTopologyEventEvidence(timeline);

  const failure = {
    schema: RENDER_FAILURE_EVIDENCE_SCHEMA,
    jobId: jobId || null,
    createdAt: new Date().toISOString(),
    startedAt: startedAt instanceof Date ? startedAt.toISOString() : startedAt || null,
    build: compactBuildInfo(buildInfo),
    process: {
      binary: portableBasename(processFailure.binary),
      code: processFailure.code ?? null,
      signal: processFailure.signal || null,
    },
    progress: lastProgress || null,
    source: {
      audio: sanitizeMediaEvidence(sourceAudio),
      image: sanitizeMediaEvidence(sourceImage),
    },
    canonicalExecution: {
      scoreAddress: timeline.scoreAddress || null,
      timelineHash: timeline.timelineHash || null,
      analysisHash: timeline.analysisHash || null,
      constraintsHash: timeline.constraintsHash || null,
      rendererProfileHash: timeline.rendererProfileHash || null,
      rendererPolicy: timeline.rendererPolicy || null,
      ...(topologyEvents ? { topologyEvents } : {}),
    },
    render: {
      graphSha256,
      visualCompiler: promoteTopologyResponseEvidence(visualCompiler || null),
    },
  };

  const argsEvidence = {
    binary: portableBasename(processFailure.binary),
    args: Array.isArray(ffmpegArgs) ? ffmpegArgs.map(sanitizeFfmpegArg) : [],
  };

  await fs.rm(directory, { recursive: true, force: true });
  await fs.mkdir(directory, { recursive: true });

  await Promise.all([
    fs.writeFile(path.join(directory, "failure.json"), jsonText(failure), "utf8"),
    fs.writeFile(path.join(directory, "render.ffgraph"), graph, "utf8"),
    fs.writeFile(path.join(directory, "visual-score.json"), canonicalArtifactText(visualScore), "utf8"),
    fs.writeFile(path.join(directory, "resolved-timeline.json"), canonicalArtifactText(resolvedTimeline), "utf8"),
    fs.writeFile(path.join(directory, "ffmpeg-args.json"), jsonText(argsEvidence), "utf8"),
    fs.writeFile(path.join(directory, "ffmpeg.stderr.log"), processFailure.stderr || "", "utf8"),
  ]);

  return Object.freeze({
    directory,
    failurePath: path.join(directory, "failure.json"),
  });
}

module.exports = {
  RENDER_FAILURE_EVIDENCE_SCHEMA,
  removeRenderFailureBundle,
  sanitizeFfmpegArg,
  writeRenderFailureBundle,
};
