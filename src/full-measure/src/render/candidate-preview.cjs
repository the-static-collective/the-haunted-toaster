const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const legacy = require("./render-legacy.cjs");
const { createProceduralPpm } = require("./artwork.cjs");
const { getPreset } = require("./presets.cjs");
const { canonicalStringify } = require("../generation/canonical.cjs");
const {
  buildHauntedFilterGraph,
  typographyContextForTimeline,
} = require("./haunted-typography-render.cjs");
const {
  createForeignMaterialPlan,
  ffmpegInputArgsForForeignMaterial,
} = require("./foreign-material.cjs");
const {
  assertTimelineDuration,
  createTimelineExecution,
} = require("./timeline-execution.cjs");
const { compileTimelineFilterGraph } = require("./timeline-filter.cjs");
const {
  INNER_CADENCE_23976,
  applyTemporalSamplingToGraph,
} = require("./temporal-sampling.cjs");
const { createTimelinePreview } = require("./timeline-preview.cjs");
const { resolveFfmpeg, runProcess } = require("./tooling.cjs");

const PREVIEW_WIDTH = 480;
const PREVIEW_HEIGHT = 270;
const PREVIEW_FPS = 30;
const PREVIEW_SAMPLE_SECONDS = 2;

function previewSampleFor(candidate) {
  if (!candidate?.timeline) {
    throw new TypeError("Candidate preview requires an accepted ResolvedTimeline.");
  }
  const preview = createTimelinePreview(candidate.timeline);
  if (candidate.timelineHash !== preview.timelineHash) {
    throw new Error("Candidate timelineHash does not match its accepted ResolvedTimeline.");
  }
  if (candidate.scoreAddress !== preview.scoreAddress) {
    throw new Error("Candidate scoreAddress does not match its accepted ResolvedTimeline.");
  }
  const durationSeconds = preview.timeline.durationTicks / preview.timeline.timebase;
  const seconds = Math.min(PREVIEW_SAMPLE_SECONDS, Math.max(0, durationSeconds / 2));
  return preview.sampleAtSeconds(seconds);
}

function baseIdentityForScore(score) {
  const field = score?.primitiveField;
  if (!field) return null;
  return Object.freeze({
    topology: score.topology,
    structure: field.structure,
    dynamics: field.dynamics,
  });
}

function semanticSignature(score) {
  return [
    score.topology,
    score.motion.grammar,
    score.palette.logic,
    score.material.texture,
  ].join(" · ");
}

function previewSignature(score) {
  const baseIdentity = baseIdentityForScore(score);
  if (!baseIdentity) return semanticSignature(score);
  return [
    baseIdentity.topology,
    `${baseIdentity.structure} / ${baseIdentity.dynamics}`,
    score.motion.grammar,
    score.palette.logic,
    score.material.texture,
  ].join(" · ");
}

function crossLockProjectionForScore(score = {}) {
  const primitiveField = score.primitiveField || {};
  return Object.freeze({
    topology: canonicalStringify({
      value: score.topology ?? null,
      primitiveStructure: primitiveField.structure ?? null,
    }),
    motion: canonicalStringify({
      value: score.motion ?? null,
      primitiveDynamics: primitiveField.dynamics ?? null,
    }),
    palette: canonicalStringify(score.palette ?? null),
    material: canonicalStringify(score.material ?? null),
    lyric: canonicalStringify(score.lyric ?? null),
    camera: canonicalStringify(score.camera ?? null),
    temporalDensity: canonicalStringify(score.temporalDensity ?? null),
    atmosphere: canonicalStringify(score.atmosphere ?? null),
  });
}

function postWalkAxisRecipeForCandidate(candidate) {
  const admittedRecipeHash = candidate?.timeline?.postWalkAxis?.recipeHash || null;
  const declaredRecipeHash = candidate?.postWalkAxisRecipeHash || null;
  const recipe = candidate?.postWalkAxisRecipe || null;
  if (!admittedRecipeHash && !declaredRecipeHash && !recipe) return null;
  if (
    !admittedRecipeHash ||
    !declaredRecipeHash ||
    !recipe ||
    declaredRecipeHash !== admittedRecipeHash ||
    recipe.recipeHash !== admittedRecipeHash
  ) {
    throw new Error("Stage A recipe witness does not match its accepted candidate timeline.");
  }
  return Object.freeze({
    schema: recipe.schema,
    policyVersion: recipe.policyVersion,
    recipeHash: recipe.recipeHash,
    response: recipe.response,
    scope: recipe.scope,
    consequence: recipe.consequence,
  });
}

function candidatePreviewPlan(candidate, typography = null, foreignMaterial = null) {
  const sample = previewSampleFor(candidate);
  const score = candidate.scoreArtifact.score;
  const postWalkAxisRecipe = postWalkAxisRecipeForCandidate(candidate);
  return Object.freeze({
    index: candidate.index,
    role: candidate.role,
    fixtureLabel: candidate.fixtureLabel,
    fixtureSlot: candidate.fixtureSlot,
    forcedCondition: candidate.forcedCondition,
    forcedWitness: candidate.forcedWitness === true,
    fixturePolicyVersion: candidate.fixtureReceipt?.policyVersion || null,
    scoreAddress: candidate.scoreAddress,
    timelineHash: candidate.timelineHash,
    changedAxes: Object.freeze([...(candidate.changedAxes || [])]),
    signature: previewSignature(score),
    baseIdentity: baseIdentityForScore(score),
    crossLockProjection: crossLockProjectionForScore(score),
    ...(postWalkAxisRecipe ? { postWalkAxisRecipe } : {}),
    sample,
    typography,
    foreignMaterial,
  });
}

async function renderCandidateFamilyPreviews(config, family, hooks = {}) {
  if (!family?.candidates?.length) {
    throw new TypeError("CandidateFamily with at least one candidate is required.");
  }
  const audioPath = path.resolve(config.audioPath);
  const imagePath = config.imagePath ? path.resolve(config.imagePath) : null;
  const analysis = config.analysis;
  if (!analysis?.audio || !Number.isFinite(Number(analysis.duration))) {
    throw new TypeError("Media analysis is required for candidate previews.");
  }

  const preset = getPreset(config.presetId);
  const width = Number(config.width) || PREVIEW_WIDTH;
  const height = Number(config.height) || PREVIEW_HEIGHT;
  const fps = Number(config.fps) || PREVIEW_FPS;
  const title = legacy.cleanText(config.title, 160);
  const artist = legacy.cleanText(config.artist, 160);
  const lyrics = legacy.cleanText(config.lyrics, 250_000);
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "haunted-toaster-six-up-"));

  try {
    const proceduralPath = path.join(tempDirectory, "garment.ppm");
    await createProceduralPpm(proceduralPath, preset);

    const previews = [];
    for (const candidate of family.candidates) {
      hooks.onCandidate?.({
        index: candidate.index,
        count: family.candidates.length,
        role: candidate.role,
      });
      const typographyContext = typographyContextForTimeline(
        candidate.scoreAddress,
        candidate.timeline,
      );
      const foreignMaterialPlan = createForeignMaterialPlan({
        videoBinding: config.video || null,
        timeline: candidate.timeline,
        analysisDurationSeconds: Number(analysis.duration),
      });
      const foreignMaterialInputIndex = foreignMaterialPlan
        ? imagePath
          ? 3
          : 2
        : null;
      const baseFilter = await buildHauntedFilterGraph({
        tempDirectory,
        analysis,
        preset,
        title,
        artist,
        lyrics,
        hasImage: Boolean(imagePath),
        width,
        height,
        fps,
        atmosphereResolutionScale:
          candidate.timeline?.renderConfig?.atmosphereResolutionScale ?? null,
      foreignMaterialPlan,
      foreignMaterialInputIndex,
        ...typographyContext,
      });
      const plan = candidatePreviewPlan(
        candidate,
        baseFilter.typographyEvidence,
      baseFilter.foreignMaterialEvidence,
      );
      const execution = createTimelineExecution(candidate.timeline);
      assertTimelineDuration(execution.timeline, analysis.duration);
      const compiled = compileTimelineFilterGraph(baseFilter.graph, execution);
      const temporalSampling = applyTemporalSamplingToGraph(
        compiled.graph,
        INNER_CADENCE_23976,
        `${fps}/1`,
      );
      const filterPath = path.join(tempDirectory, `candidate-${candidate.index}.ffgraph`);
      const outputPath = path.join(tempDirectory, `candidate-${candidate.index}.png`);
      await fs.writeFile(filterPath, `${temporalSampling.graph}\n`, "utf8");

      const args = [
        "-y",
        "-hide_banner",
        "-nostdin",
        "-i",
        audioPath,
        "-loop",
        "1",
        "-framerate",
        String(fps),
        "-i",
        proceduralPath,
      ];
      if (imagePath) {
        args.push(
          "-loop",
          "1",
          "-framerate",
          String(fps),
          "-i",
          imagePath,
        );
      }
      args.push(...ffmpegInputArgsForForeignMaterial(foreignMaterialPlan));
      args.push(
        "-filter_complex_script",
        filterPath,
        "-map",
        "[vout]",
        "-ss",
        String(plan.sample.seconds),
        "-frames:v",
        "1",
        "-an",
        outputPath,
      );
      await runProcess(resolveFfmpeg(), args, {
        cwd: tempDirectory,
        signal: hooks.signal,
        collectStdout: false,
        collectStderr: true,
      });
      const bytes = await fs.readFile(outputPath);
      previews.push(Object.freeze({
        ...plan,
        temporalSampling: temporalSampling.policy,
        thumbnailDataUrl: `data:image/png;base64,${bytes.toString("base64")}`,
      }));
    }

    return Object.freeze({
      familyHash: family.familyHash,
      rootSeed: family.rootSeed,
      parentScoreRef: family.parentScoreRef,
      locks: Object.freeze([...(family.locks || [])]),
      producedCount: family.producedCount,
      requestedCount: family.requestedCount,
      shortfall: family.shortfall ? structuredClone(family.shortfall) : null,
      candidates: Object.freeze(previews),
    });
  } finally {
    await fs.rm(tempDirectory, { recursive: true, force: true });
  }
}

module.exports = {
  PREVIEW_FPS,
  PREVIEW_HEIGHT,
  PREVIEW_SAMPLE_SECONDS,
  PREVIEW_WIDTH,
  baseIdentityForScore,
  candidatePreviewPlan,
  crossLockProjectionForScore,
  postWalkAxisRecipeForCandidate,
  previewSampleFor,
  previewSignature,
  renderCandidateFamilyPreviews,
  semanticSignature,
};
