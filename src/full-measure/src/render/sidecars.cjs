const fs = require("node:fs/promises");
const path = require("node:path");
const {
  addressVisualScore,
  canonicalStringify,
} = require("../generation/index.cjs");

function sidecarPathsFor(outputPath) {
  const parsed = path.parse(outputPath);
  const stem = path.join(parsed.dir, parsed.name);
  return Object.freeze({
    scorePath: `${stem}.score.json`,
    timelinePath: `${stem}.timeline.json`,
  });
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

async function removeCanonicalExecutionSidecars(outputPath) {
  const paths = sidecarPathsFor(outputPath);
  await Promise.all([
    fs.rm(paths.scorePath, { force: true }),
    fs.rm(paths.timelinePath, { force: true }),
  ]);
}

module.exports = {
  assertScoreTimelineBinding,
  removeCanonicalExecutionSidecars,
  sidecarPathsFor,
  writeCanonicalExecutionSidecars,
};