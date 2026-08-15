const {
  DYNAMICS_COMPILERS,
  PRIMITIVE_FIELD_POLICY,
  STRUCTURE_COMPILERS,
} = require("../generation/primitive-field-generation.cjs");

const WAVE_CONSUMER_SEAM = "[spectral][waveFull]overlay=0:0:shortest=1[stage0]";

function evenDimension(value) {
  return Math.max(2, Math.ceil(Number(value) / 2) * 2);
}

function dimension(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 2) {
    throw new TypeError(`${label} must be a finite frame dimension.`);
  }
  return evenDimension(number);
}

function compilerEvidence(timeline) {
  const accepted = timeline?.primitiveField || null;
  const state = timeline?.baseState?.primitiveField || null;
  if (!accepted && !state) return null;
  if (!accepted || !state) {
    throw new Error("Primitive field timeline evidence and base state must travel together.");
  }
  if (
    accepted.policyVersion !== PRIMITIVE_FIELD_POLICY ||
    accepted.structure !== state.structure ||
    accepted.dynamics !== state.dynamics
  ) {
    throw new Error("Primitive field timeline evidence does not match accepted base state.");
  }
  const structureCompiler = STRUCTURE_COMPILERS[state.structure];
  const dynamicsCompiler = DYNAMICS_COMPILERS[state.dynamics];
  if (!structureCompiler || !dynamicsCompiler) {
    throw new TypeError("Primitive field contains an unsupported structure or dynamics value.");
  }
  if (
    accepted.structureCompiler !== structureCompiler ||
    accepted.dynamicsCompiler !== dynamicsCompiler
  ) {
    throw new Error("Primitive field compiler identity does not match the accepted primitive.");
  }
  return Object.freeze({
    policyVersion: accepted.policyVersion,
    structure: Object.freeze({
      value: state.structure,
      compiler: structureCompiler,
    }),
    dynamics: Object.freeze({
      value: state.dynamics,
      compiler: dynamicsCompiler,
    }),
  });
}

function structureProgram(kind, width, height) {
  const x = Math.max(2, Math.round(width * 0.035));
  const y = Math.max(2, Math.round(height * 0.055));
  if (kind === "scope") {
    return "[waveFull]null[primitiveStructure]";
  }
  if (kind === "ribs") {
    return [
      "[waveFull]split=3[primitiveRib0][primitiveRib1][primitiveRib2]",
      `[primitiveRib0][primitiveRib1]overlay=x=0:y=${y}:shortest=1[primitiveRib01]`,
      `[primitiveRib01][primitiveRib2]overlay=x=0:y=-${y}:shortest=1[primitiveStructure]`,
    ].join(";\n");
  }
  if (kind === "lattice") {
    return [
      "[waveFull]split=2[primitiveLattice0][primitiveLattice1]",
      "[primitiveLattice1]rotate='PI/2':ow=iw:oh=ih:c=black@0[primitiveLatticeCross]",
      "[primitiveLattice0][primitiveLatticeCross]overlay=0:0:shortest=1[primitiveStructure]",
    ].join(";\n");
  }
  if (kind === "facets") {
    return [
      "[waveFull]split=3[primitiveFacet0][primitiveFacet1][primitiveFacet2]",
      "[primitiveFacet1]rotate='0.14':ow=iw:oh=ih:c=black@0[primitiveFacetPlus]",
      "[primitiveFacet2]rotate='-0.14':ow=iw:oh=ih:c=black@0[primitiveFacetMinus]",
      "[primitiveFacet0][primitiveFacetPlus]overlay=0:0:shortest=1[primitiveFacet01]",
      "[primitiveFacet01][primitiveFacetMinus]overlay=0:0:shortest=1[primitiveStructure]",
    ].join(";\n");
  }
  if (kind === "torus") {
    const innerWidth = evenDimension(width * 0.72);
    const innerHeight = evenDimension(height * 0.72);
    const padX = Math.floor((width - innerWidth) / 2);
    const padY = Math.floor((height - innerHeight) / 2);
    return [
      "[waveFull]split=2[primitiveTorusOuter][primitiveTorusInner]",
      `[primitiveTorusInner]scale=${innerWidth}:${innerHeight},pad=${width}:${height}:${padX}:${padY}:color=black@0[primitiveTorusInset]`,
      "[primitiveTorusOuter][primitiveTorusInset]overlay=0:0:shortest=1[primitiveStructure]",
    ].join(";\n");
  }
  if (kind === "folds") {
    return [
      "[waveFull]split=2[primitiveFold0][primitiveFold1]",
      "[primitiveFold1]hflip[primitiveFoldMirror]",
      `[primitiveFold0][primitiveFoldMirror]overlay=x=${x}:y=0:shortest=1[primitiveStructure]`,
    ].join(";\n");
  }
  if (kind === "voxels") {
    const voxelWidth = Math.max(16, evenDimension(width / 20));
    const voxelHeight = Math.max(16, evenDimension(height / 20));
    return `[waveFull]scale=${voxelWidth}:${voxelHeight}:flags=neighbor,scale=${width}:${height}:flags=neighbor[primitiveStructure]`;
  }
  if (kind === "branches") {
    return [
      "[waveFull]split=4[primitiveBranch0][primitiveBranch1][primitiveBranch2][primitiveBranch3]",
      `[primitiveBranch0][primitiveBranch1]overlay=x=${x}:y=${y}:shortest=1[primitiveBranch01]`,
      `[primitiveBranch01][primitiveBranch2]overlay=x=-${x}:y=${y}:shortest=1[primitiveBranch012]`,
      `[primitiveBranch012][primitiveBranch3]overlay=x=0:y=-${y}:shortest=1[primitiveStructure]`,
    ].join(";\n");
  }
  throw new TypeError(`Unsupported primitive structure: ${String(kind)}.`);
}

function expandedCrop(width, height, scale, x, y) {
  const expandedWidth = evenDimension(width * scale);
  const expandedHeight = evenDimension(height * scale);
  return `scale=${expandedWidth}:${expandedHeight},crop=${width}:${height}:x='${x}':y='${y}'`;
}

function dynamicsProgram(kind, width, height) {
  if (kind === "inertial") {
    return "[primitiveStructure]null[primitiveField]";
  }
  if (kind === "wave") {
    return `[primitiveStructure]${expandedCrop(
      width,
      height,
      1.07,
      "(iw-ow)/2+sin(t*1.31)*(iw-ow)*0.44",
      "(ih-oh)/2+sin(t*0.73)*(ih-oh)*0.38",
    )}[primitiveField]`;
  }
  if (kind === "orbital-decay") {
    return "[primitiveStructure]rotate='0.16*sin(t*0.61)/(1+0.02*t)':ow=iw:oh=ih:c=black@0[primitiveField]";
  }
  if (kind === "snap") {
    return `[primitiveStructure]${expandedCrop(
      width,
      height,
      1.09,
      "(iw-ow)/2+sin(t*7.1)*(iw-ow)*0.34+sin(t*15.7)*(iw-ow)*0.13",
      "(ih-oh)/2+cos(t*6.3)*(ih-oh)*0.31+sin(t*12.9)*(ih-oh)*0.14",
    )}[primitiveField]`;
  }
  if (kind === "oscillation") {
    return "[primitiveStructure]rotate='0.11*sin(t*1.17)':ow=iw:oh=ih:c=black@0[primitiveField]";
  }
  if (kind === "seismic") {
    return `[primitiveStructure]${expandedCrop(
      width,
      height,
      1.1,
      "(iw-ow)/2+sin(t*18.3)*(iw-ow)*0.29+sin(t*31.7)*(iw-ow)*0.09",
      "(ih-oh)/2+cos(t*16.1)*(ih-oh)*0.26+sin(t*27.5)*(ih-oh)*0.11",
    )}[primitiveField]`;
  }
  if (kind === "magnetic") {
    const minimumScale = 0.94 - 0.06;
    const cropSafety = 1.01;
    const expansion = cropSafety / minimumScale;
    const expandedWidth = evenDimension(width * expansion);
    const expandedHeight = evenDimension(height * expansion);
    return `[primitiveStructure]scale=w='${expandedWidth}*(0.94+0.06*sin(t*0.83))':h='${expandedHeight}*(0.94+0.06*sin(t*0.83))':eval=frame,crop=${width}:${height}:x='(iw-ow)/2+sin(t*0.41)*(iw-ow)*0.42':y='(ih-oh)/2+cos(t*0.47)*(ih-oh)*0.42'[primitiveField]`;
  }
  if (kind === "swarm") {
    return `[primitiveStructure]${expandedCrop(
      width,
      height,
      1.11,
      "(iw-ow)/2+(sin(t*2.3)+sin(t*5.7))*0.2*(iw-ow)",
      "(ih-oh)/2+(cos(t*2.9)+sin(t*6.1))*0.2*(ih-ow)",
    )}[primitiveField]`;
  }
  if (kind === "whip") {
    return `[primitiveStructure]${expandedCrop(
      width,
      height,
      1.1,
      "(iw-ow)/2+sin(t*0.92)*sin(t*0.92)*(iw-ow)*0.46",
      "(ih-oh)/2+sin(t*1.84)*(ih-oh)*0.16",
    )}[primitiveField]`;
  }
  if (kind === "advect") {
    return `[primitiveStructure]${expandedCrop(
      width,
      height,
      1.12,
      "mod(t*23,iw-ow)",
      "(ih-oh)/2+sin(t*0.37)*(ih-oh)*0.22",
    )}[primitiveField]`;
  }
  throw new TypeError(`Unsupported primitive dynamics: ${String(kind)}.`);
}

function applyPrimitiveFieldToGraph({ graph, timeline, width, height }) {
  const evidence = compilerEvidence(timeline);
  if (!evidence) return Object.freeze({ graph, evidence: null });
  if (!String(graph || "").includes(WAVE_CONSUMER_SEAM)) {
    throw new Error("Production filter graph is missing the canonical wave consumer seam.");
  }
  const frameWidth = dimension(width, "Primitive field width");
  const frameHeight = dimension(height, "Primitive field height");
  const program = [
    structureProgram(evidence.structure.value, frameWidth, frameHeight),
    dynamicsProgram(evidence.dynamics.value, frameWidth, frameHeight),
    "[spectral][primitiveField]overlay=0:0:shortest=1[stage0]",
  ].join(";\n");
  return Object.freeze({
    graph: String(graph).replace(WAVE_CONSUMER_SEAM, program),
    evidence,
  });
}

module.exports = {
  WAVE_CONSUMER_SEAM,
  applyPrimitiveFieldToGraph,
  compilerEvidence,
  dynamicsProgram,
  structureProgram,
};
