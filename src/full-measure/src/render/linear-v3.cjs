const STRUCTURES = Object.freeze([
  "scope",
  "ribs",
  "lattice",
  "facets",
  "torus",
  "folds",
  "voxels",
  "branches",
]);

function quantize(value, places = 6) {
  const scale = 10 ** places;
  return Math.round(Number(value) * scale) / scale;
}

function ffmpegNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new TypeError("Linear v3 renderer value must be finite.");
  }
  return String(quantize(number));
}

function evenDimension(value) {
  return Math.max(2, Math.ceil(Number(value) / 2) * 2);
}

function railFilter(context, width, height) {
  return [
    "aformat=channel_layouts=stereo",
    `showwaves=s=${evenDimension(width)}x${evenDimension(height)}:mode=cline:rate=${ffmpegNumber(context.fps)}:colors=0xFFFFFF:scale=sqrt`,
    "format=rgba",
    "colorkey=black:0.08:0.0",
    `colorchannelmixer=aa=${ffmpegNumber(context.opacity)}`,
  ].join(",");
}

function overlayLayers(labels, output) {
  if (!Array.isArray(labels) || labels.length < 2) {
    throw new TypeError("Linear v3 requires at least two anatomy layers.");
  }
  const filters = [];
  let current = labels[0];
  for (let index = 1; index < labels.length; index += 1) {
    const next = index === labels.length - 1 ? output : `linearComposite${index}`;
    filters.push(`[${current}][${labels[index]}]overlay=0:0:shortest=1[${next}]`);
    current = next;
  }
  return filters;
}

function finishFilter(context) {
  if (!context.response) return "null";
  const { extent, travelX, travelY, phase } = context.response.expressions;
  const factor = `1+0.22*(${extent})+0.14*pow((${extent}),6)`;
  return [
    `rotate='(${phase})*0.045':ow=iw:oh=ih:c=black@0`,
    `scale=w='iw*(${factor})':h='ih*(${factor})':eval=frame`,
    `crop=${context.width}:${context.height}:x='(iw-ow)/2+(${travelX})*(iw-ow)*0.18':y='(ih-oh)/2+(${travelY})*(ih-oh)*0.18'`,
  ].join(",");
}

function compileLinearV3(context) {
  const width = context.width;
  const height = context.height;
  const structure = context.baseState?.primitiveField?.structure || "scope";
  if (!STRUCTURES.includes(structure)) {
    throw new TypeError(`Unsupported Linear v3 primitive structure: ${String(structure)}.`);
  }

  const railHeight = evenDimension(Math.max(18, Math.min(72, height * 0.12)));
  const centeredY = Math.max(0, Math.floor((height - railHeight) / 2));
  const rail = railFilter(context, width, railHeight);
  const finish = (body) => `[${body}]${finishFilter(context)}[waveFull]`;

  if (structure === "scope") {
    const yA = Math.max(0, Math.floor(height * 0.33 - railHeight / 2));
    const yB = Math.max(0, Math.floor(height * 0.67 - railHeight / 2));
    return {
      replacement: [
        `[waveAudio]${rail}[linearSeed]`,
        "[linearSeed]split=2[linear_scope_a][linear_scope_b]",
        `[linear_scope_a]pad=${width}:${height}:0:${yA}:color=black@0[linearRailA]`,
        `[linear_scope_b]pad=${width}:${height}:0:${yB}:color=black@0[linearRailB]`,
        ...overlayLayers(["linearRailA", "linearRailB"], "linear_scope_body"),
        finish("linear_scope_body"),
      ].join(";\n"),
    };
  }

  if (structure === "ribs") {
    const ys = [0.2, 0.4, 0.6, 0.8].map((ratio) =>
      Math.max(0, Math.min(height - railHeight, Math.floor(height * ratio - railHeight / 2))));
    return {
      replacement: [
        `[waveAudio]${rail}[linearSeed]`,
        "[linearSeed]split=4[linear_ribs_0][linear_ribs_1][linear_ribs_2][linear_ribs_3]",
        ...ys.map((y, index) =>
          `[linear_ribs_${index}]pad=${width}:${height}:0:${y}:color=black@0[linearRib${index}]`),
        ...overlayLayers(["linearRib0", "linearRib1", "linearRib2", "linearRib3"], "linear_ribs_body"),
        finish("linear_ribs_body"),
      ].join(";\n"),
    };
  }

  if (structure === "lattice") {
    const vertical = railFilter(context, height, railHeight);
    const xA = Math.max(0, Math.floor(width * 0.34 - railHeight / 2));
    const xB = Math.max(0, Math.floor(width * 0.66 - railHeight / 2));
    const yA = Math.max(0, Math.floor(height * 0.34 - railHeight / 2));
    const yB = Math.max(0, Math.floor(height * 0.66 - railHeight / 2));
    return {
      replacement: [
        "[waveAudio]asplit=2[linearLatticeHAudio][linearLatticeVAudio]",
        `[linearLatticeHAudio]${rail}[linearLatticeHSeed]`,
        "[linearLatticeHSeed]split=2[linear_lattice_h0][linear_lattice_h1]",
        `[linear_lattice_h0]pad=${width}:${height}:0:${yA}:color=black@0[linearLatticeH0]`,
        `[linear_lattice_h1]pad=${width}:${height}:0:${yB}:color=black@0[linearLatticeH1]`,
        `[linearLatticeVAudio]${vertical},transpose=clock[linearLatticeVSeed]`,
        "[linearLatticeVSeed]split=2[linear_lattice_v0][linear_lattice_v1]",
        `[linear_lattice_v0]pad=${width}:${height}:${xA}:0:color=black@0[linearLatticeV0]`,
        `[linear_lattice_v1]pad=${width}:${height}:${xB}:0:color=black@0[linearLatticeV1]`,
        ...overlayLayers(
          ["linearLatticeH0", "linearLatticeH1", "linearLatticeV0", "linearLatticeV1"],
          "linear_lattice_body",
        ),
        finish("linear_lattice_body"),
      ].join(";\n"),
    };
  }

  if (structure === "facets") {
    return {
      replacement: [
        `[waveAudio]${rail}[linearSeed]`,
        "[linearSeed]split=3[linear_facets_0][linear_facets_1][linear_facets_2]",
        `[linear_facets_0]pad=${width}:${height}:0:${centeredY}:color=black@0,rotate='-0.22':ow=iw:oh=ih:c=black@0[linearFacet0]`,
        `[linear_facets_1]pad=${width}:${height}:0:${centeredY}:color=black@0[linearFacet1]`,
        `[linear_facets_2]pad=${width}:${height}:0:${centeredY}:color=black@0,rotate='0.22':ow=iw:oh=ih:c=black@0[linearFacet2]`,
        ...overlayLayers(["linearFacet0", "linearFacet1", "linearFacet2"], "linear_facets_body"),
        finish("linear_facets_body"),
      ].join(";\n"),
    };
  }

  if (structure === "folds") {
    const yA = Math.max(0, Math.floor(height * 0.42 - railHeight / 2));
    const yB = Math.max(0, Math.floor(height * 0.58 - railHeight / 2));
    return {
      replacement: [
        `[waveAudio]${rail}[linearSeed]`,
        "[linearSeed]split=4[linear_folds_0][linear_folds_1][linear_folds_2][linear_folds_3]",
        `[linear_folds_0]pad=${width}:${height}:0:${yA}:color=black@0,rotate='-0.16':ow=iw:oh=ih:c=black@0[linearFold0]`,
        `[linear_folds_1]hflip,pad=${width}:${height}:0:${yA}:color=black@0,rotate='0.16':ow=iw:oh=ih:c=black@0[linearFold1]`,
        `[linear_folds_2]pad=${width}:${height}:0:${yB}:color=black@0,rotate='0.16':ow=iw:oh=ih:c=black@0[linearFold2]`,
        `[linear_folds_3]hflip,pad=${width}:${height}:0:${yB}:color=black@0,rotate='-0.16':ow=iw:oh=ih:c=black@0[linearFold3]`,
        ...overlayLayers(["linearFold0", "linearFold1", "linearFold2", "linearFold3"], "linear_folds_body"),
        finish("linear_folds_body"),
      ].join(";\n"),
    };
  }

  if (structure === "torus") {
    const innerWidth = evenDimension(width * 0.72);
    const innerX = Math.floor((width - innerWidth) / 2);
    const ys = [0.29, 0.71, 0.44, 0.56].map((ratio) =>
      Math.max(0, Math.floor(height * ratio - railHeight / 2)));
    return {
      replacement: [
        `[waveAudio]${rail}[linearSeed]`,
        "[linearSeed]split=4[linear_torus_0][linear_torus_1][linear_torus_2][linear_torus_3]",
        `[linear_torus_0]pad=${width}:${height}:0:${ys[0]}:color=black@0[linearReturnOuterA]`,
        `[linear_torus_1]hflip,pad=${width}:${height}:0:${ys[1]}:color=black@0[linearReturnOuterB]`,
        `[linear_torus_2]scale=${innerWidth}:${railHeight},pad=${width}:${height}:${innerX}:${ys[2]}:color=black@0[linearReturnInnerA]`,
        `[linear_torus_3]hflip,scale=${innerWidth}:${railHeight},pad=${width}:${height}:${innerX}:${ys[3]}:color=black@0[linearReturnInnerB]`,
        ...overlayLayers(
          ["linearReturnOuterA", "linearReturnOuterB", "linearReturnInnerA", "linearReturnInnerB"],
          "linear_torus_body",
        ),
        finish("linear_torus_body"),
      ].join(";\n"),
    };
  }

  if (structure === "voxels") {
    const pixelWidth = Math.max(24, evenDimension(width / 18));
    const pixelHeight = Math.max(8, evenDimension(railHeight / 4));
    const yA = Math.max(0, Math.floor(height * 0.37 - railHeight / 2));
    const yB = Math.max(0, Math.floor(height * 0.63 - railHeight / 2));
    return {
      replacement: [
        `[waveAudio]${rail}[linearSeed]`,
        "[linearSeed]split=2[linear_voxels_0][linear_voxels_1]",
        `[linear_voxels_0]scale=${pixelWidth}:${pixelHeight}:flags=neighbor,scale=${width}:${railHeight}:flags=neighbor,pad=${width}:${height}:0:${yA}:color=black@0[linearVoxel0]`,
        `[linear_voxels_1]scale=${pixelWidth}:${pixelHeight}:flags=neighbor,scale=${width}:${railHeight}:flags=neighbor,pad=${width}:${height}:0:${yB}:color=black@0[linearVoxel1]`,
        ...overlayLayers(["linearVoxel0", "linearVoxel1"], "linear_voxels_body"),
        finish("linear_voxels_body"),
      ].join(";\n"),
    };
  }

  if (structure === "branches") {
    return {
      replacement: [
        `[waveAudio]${rail}[linearSeed]`,
        "[linearSeed]split=4[linear_branches_0][linear_branches_1][linear_branches_2][linear_branches_3]",
        `[linear_branches_0]pad=${width}:${height}:0:${centeredY}:color=black@0[linearBranchTrunk]`,
        `[linear_branches_1]pad=${width}:${height}:0:${centeredY}:color=black@0,rotate='0.28':ow=iw:oh=ih:c=black@0[linearBranchUp]`,
        `[linear_branches_2]pad=${width}:${height}:0:${centeredY}:color=black@0,rotate='-0.28':ow=iw:oh=ih:c=black@0[linearBranchDown]`,
        `[linear_branches_3]hflip,pad=${width}:${height}:0:${centeredY}:color=black@0,rotate='0.48':ow=iw:oh=ih:c=black@0,colorchannelmixer=aa=0.55[linearBranchBud]`,
        ...overlayLayers(
          ["linearBranchTrunk", "linearBranchUp", "linearBranchDown", "linearBranchBud"],
          "linear_branches_body",
        ),
        finish("linear_branches_body"),
      ].join(";\n"),
    };
  }

  throw new TypeError(`Unsupported Linear v3 primitive structure: ${String(structure)}.`);
}

module.exports = {
  LINEAR_V3_STRUCTURES: STRUCTURES,
  compileLinearV3,
};
