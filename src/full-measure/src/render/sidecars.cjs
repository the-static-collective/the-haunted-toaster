const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const {
  addressVisualScore,
  canonicalStringify,
} = require("../generation/index.cjs");
const { serializeSrt, serializeWebVtt } = require("./subtitles.cjs");

function sidecarPathsFor(outputPath) {
  const parsed = path.parse(outputPath);
  const stem = path.join(parsed.dir, parsed.name);
  return Object.freeze({
    scorePath: `${stem}.score.json`,
    timelinePath: `${stem}.timeline.json`,
  });
}

function subtitlePathsFor(outputPath, language = "en") {
  const parsed = path.parse(outputPath);
  const stem = path.join(parsed.dir, parsed.name);
  const safeLanguage = String(language || "en").replace(/[^a-z0-9-]/gi, "").toLowerCase() || "en";
  return Object.freeze({
    srtPath: `${stem}.${safeLanguage}.srt`,
    vttPath: `${stem}.${safeLanguage}.vtt`,
  });
}

function sha256Text(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function assertScoreTimelineBinding(score, timeline) {
  if (!score || typeof score !== "object") {
    throw new TypeError("Accepted VisualScore is required for score-driven sidecars.");
  }
  if (!timeline || typeof timeline !== "object") {
    throw new TypeError("ResolvedTimeline is required for score-driven sidecars.");
  }
  const scoreAddress = addressVisualScore(score);
  if (scoreAddress !== timeline.scoreAddress) {
    throw new Error(
      `Accepted VisualScore address ${scoreAddress} does not match ResolvedTimeline scoreAddress ${timeline.scoreAddress}.`,
    );
  }
  return scoreAddress;
}

async function writeCanonicalExecutionSidecars({ outputPath, score, timeline }) {
  const scoreAddress = assertScoreTimelineBinding(score, timeline);
  const paths = sidecarPathsFor(outputPath);
  await fs.writeFile(paths.scorePath, `${canonicalStringify(score)}\n`, "utf8");
  try {
    await fs.writeFile(paths.timelinePath, `${canonicalStringify(timeline)}\n`, "utf8");
  } catch (error) {
    await fs.rm(paths.scorePath, { force: true });
    throw error;
  }
  return Object.freeze({
    ...paths,
    scoreAddress,
    timelineHash: timeline.timelineHash || null,
  });
}

async function writeSubtitleSidecars({ outputPath, cues, mediaDuration, language = "en" }) {
  const paths = subtitlePathsFor(outputPath, language);
  const srt = serializeSrt(cues, mediaDuration);
  const vtt = serializeWebVtt(cues, mediaDuration);

  await fs.writeFile(paths.srtPath, srt, "utf8");
  try {
    await fs.writeFile(paths.vttPath, vtt, "utf8");
  } catch (error) {
    await fs.rm(paths.srtPath, { force: true });
    throw error;
  }

  return Object.freeze({
    ...paths,
    cueCount: Array.isArray(cues) ? cues.length : 0,
    srtSha256: sha256Text(srt),
    vttSha256: sha256Text(vtt),
  });
}

async function removeCanonicalExecutionSidecars(outputPath) {
  const paths = sidecarPathsFor(outputPath);
  await Promise.all([
    fs.rm(paths.scorePath, { force: true }),
    fs.rm(paths.timelinePath, { force: true }),
  ]);
}

async function removeSubtitleSidecars(outputPath, language = "en") {
  const paths = subtitlePathsFor(outputPath, language);
  await Promise.all([
    fs.rm(paths.srtPath, { force: true }),
    fs.rm(paths.vttPath, { force: true }),
  ]);
}

module.exports = {
  assertScoreTimelineBinding,
  removeCanonicalExecutionSidecars,
  removeSubtitleSidecars,
  sidecarPathsFor,
  subtitlePathsFor,
  writeCanonicalExecutionSidecars,
  writeSubtitleSidecars,
};
