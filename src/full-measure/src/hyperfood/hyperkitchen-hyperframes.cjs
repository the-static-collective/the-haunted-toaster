"use strict";

// Experimental projection membrane. HyperFood owns organism identity and trace;
// this adapter owns only a frame/time-specific HTML projection of that trace.
const crypto = require("node:crypto");
const {
  HYPERFOOD_SPEC_SCHEMA,
  normalizeHyperFoodSpec,
  evaluateHyperFoodTrace,
  specimenId,
} = require("../hyperfood/index.cjs");
const { canonicalStringify } = require("../generation/canonical.cjs");

const PROJECTION_SCHEMA = "haunted-toaster/hyperkitchen-projection/v1";
const HTML_ADAPTER = "hyperframes-html-trace/v1";
const SHA = /^[a-f0-9]{64}$/;
const MAX_FRAMES = 120;
const MAX_DEPTH = 8;
const FRAME_PARAMETERS = Object.freeze({
  depth: 4, stepMs: 200, staggerMs: 80,
  scalePerDepth: 0.82, rotationPerDepthDeg: 3,
  cropPerDepth: 0.04, pivotX: 0.5, pivotY: 0.5,
  opacityPerDepth: 0.94, entryOrder: "outer-first", exitOrder: "inner-first",
});
const PULSE_PARAMETERS = Object.freeze({
  attackMs: 70, holdMs: 30, decayMs: 180, phaseOffsetMs: 0,
  scaleAmount: 0.08, rotationDeg: 2,
  translateXPx: 3, translateYPx: -2, opacityAmount: 0,
  brightnessAmount: 0.12, blurPx: 0,
});

function hash(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function buildKitchenSpecimen({ sourceSha256, byteLength, durationMs = 1000,
  events = [{ tMs: 0, strength: 1 }, { tMs: 500, strength: 0.75 }],
  fps = 24, width = 320, height = 180, seed = 0,
  frameParameters = FRAME_PARAMETERS, pulseParameters = PULSE_PARAMETERS,
} = {}) {
  if (typeof sourceSha256 !== "string" || !SHA.test(sourceSha256)) {
    throw new TypeError("HyperKitchen requires the independently verified source SHA-256.");
  }
  if (!Number.isSafeInteger(byteLength) || byteLength < 1) {
    throw new TypeError("HyperKitchen requires a positive source byte length.");
  }
  if (fps !== 24 || width !== 320 || height !== 180
    || !Number.isSafeInteger(durationMs) || durationMs < 250 || durationMs > 4000) {
    throw new TypeError("HyperKitchen v1 supports 320x180, 24fps, 250–4000ms only.");
  }
  const graph = {
    nodes: [
      { id: "blender-clip", op: "ASSET", version: "0.1.0",
        outputType: "Surface", assetId: "blender-clip" },
      { id: "frame-eat-frame", op: "FRAME-EAT-FRAME",
        version: "0.1.0", parameters: frameParameters },
      { id: "manual-events", op: "EVENT-GRID", version: "0.1.0", field: "events" },
      { id: "pulse", op: "PULSE", version: "0.1.0", parameters: pulseParameters },
    ],
    edges: [
      { from: "blender-clip.surface", to: "frame-eat-frame.surface" },
      { from: "frame-eat-frame.surface", to: "pulse.surface" },
      { from: "manual-events.events", to: "pulse.events" },
    ],
    output: "pulse.surface",
  };
  const spec = normalizeHyperFoodSpec({
    schema: HYPERFOOD_SPEC_SCHEMA,
    assets: [{ id: "blender-clip", mediaType: "video/mp4",
      sha256: sourceSha256, byteLength }],
    timing: { durationMs, events }, seed,
    target: { width, height, fps, alpha: false }, graph,
  });
  if (spec.graph.lineage.join("|") !== "FRAME-EAT-FRAME@0.1.0|PULSE@0.1.0") {
    throw new Error("HyperKitchen requires the existing FRAME-EAT-FRAME → PULSE graph.");
  }
  return { specimenId: specimenId(spec), spec };
}

function assertKitchenSpec(spec) {
  const normalized = normalizeHyperFoodSpec(spec);
  if (canonicalStringify(normalized) !== canonicalStringify(spec)) {
    throw new TypeError("HyperKitchen refuses a noncanonical or altered HyperFood specimen.");
  }
  const expected = buildKitchenSpecimen({
    sourceSha256: normalized.assets[0]?.sha256,
    byteLength: normalized.assets[0]?.byteLength,
    durationMs: normalized.timing.durationMs,
    events: normalized.timing.events,
    fps: normalized.target.fps, width: normalized.target.width,
    height: normalized.target.height, seed: normalized.seed,
    frameParameters: normalized.graph.nodes.find((x) => x.op === "FRAME-EAT-FRAME")?.parameters,
    pulseParameters: normalized.graph.nodes.find((x) => x.op === "PULSE")?.parameters,
  });
  if (canonicalStringify(expected.spec) !== canonicalStringify(normalized)
    || normalized.assets.length !== 1) {
    throw new TypeError("HyperKitchen v1 requires the exact admitted clip → FRAME-EAT-FRAME → PULSE graph.");
  }
  return normalized;
}

function traceSingle(spec, organismId, parameters, times) {
  return evaluateHyperFoodTrace({
    schema: HYPERFOOD_SPEC_SCHEMA,
    organism: { id: organismId, version: "0.1.0" },
    assets: spec.assets,
    inputs: organismId === "PULSE"
      ? { surface: { asset: "blender-clip" }, events: { timingField: "events" } }
      : { surface: { asset: "blender-clip" } },
    timing: organismId === "PULSE" ? spec.timing : { durationMs: spec.timing.durationMs },
    parameters, seed: spec.seed, target: spec.target,
  }, times);
}

function compileHyperFramesProjection({ spec, sourceSpecimenId, exchangeManifestSha256 = null } = {}) {
  const normalized = assertKitchenSpec(spec);
  const durationMs = normalized.timing.durationMs;
  const fps = normalized.target.fps;
  const totalFrames = Math.ceil(durationMs * fps / 1000);
  if (totalFrames < 1 || totalFrames > MAX_FRAMES) {
    throw new RangeError("HyperKitchen frame budget exceeded.");
  }
  if (exchangeManifestSha256 !== null
    && (typeof exchangeManifestSha256 !== "string" || !SHA.test(exchangeManifestSha256))) {
    throw new TypeError("Exchange manifest identity must be a SHA-256 digest.");
  }
  if (typeof sourceSpecimenId !== "string"
    || sourceSpecimenId !== "sha256:" + normalized.assets[0].sha256
      + ":" + normalized.assets[0].byteLength) {
    throw new TypeError("HyperKitchen source specimen differs from the VSPantry content identity.");
  }
  const frameNode = normalized.graph.nodes.find((x) => x.op === "FRAME-EAT-FRAME");
  const pulseNode = normalized.graph.nodes.find((x) => x.op === "PULSE");
  if (frameNode.parameters.depth > MAX_DEPTH) {
    throw new RangeError("HyperKitchen v1 allows at most eight finite nested frames.");
  }
  const times = Array.from({ length: totalFrames }, (_, i) => Math.round(i * 1000 / fps));
  const frameTrace = traceSingle(normalized, "FRAME-EAT-FRAME", frameNode.parameters, times);
  const pulseTrace = traceSingle(normalized, "PULSE", pulseNode.parameters, times);
  const frames = times.map((tMs, index) => ({
    index, tMs,
    frameEatFrame: frameTrace.states[index],
    pulse: pulseTrace.states[index],
    // Frame source names are explicit. FFmpeg extraction is a distinct, checked
    // materialization step before any HTML or video rendering.
    asset: "assets/frame-" + String(index).padStart(4, "0") + ".png",
  }));
  const traceSha256 = hash(canonicalStringify(frames));
  const core = {
    schema: PROJECTION_SCHEMA,
    adapter: HTML_ADAPTER,
    specimenId: specimenId(normalized),
    sourceSpecimenId,
    sourceSha256: normalized.assets[0].sha256,
    sourceByteLength: normalized.assets[0].byteLength,
    exchangeManifestSha256,
    width: 320, height: 180, fps, durationMs,
    eventSource: "explicit-user-event-grid",
    graphLineage: normalized.graph.lineage,
    frameBudget: totalFrames,
    traceSha256,
    frames,
    authority: "projection-only",
  };
  return Object.freeze({
    ...core,
    projectionId: "hk1_" + hash(canonicalStringify(core)),
  });
}

function renderHyperFramesHtml(model) {
  if (model?.schema !== PROJECTION_SCHEMA || model.adapter !== HTML_ADAPTER) {
    throw new TypeError("HyperFrames HTML requires a compiled HyperKitchen projection.");
  }
  const { projectionId, width, height, durationMs, frames } = model;
  if (!Array.isArray(frames) || frames.length !== model.frameBudget) {
    throw new TypeError("HyperKitchen projection has no canonical frame trace.");
  }
  const data = JSON.stringify({ frames, fps: model.fps, durationMs, projectionId }).replace(/</g, "\\u003c");
  const durationSec = durationMs / 1000;
  return [
    "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\">",
    "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">",
    "<style>*{box-sizing:border-box}html,body{margin:0;background:#000;overflow:hidden}",
    "#stage{position:relative;width:" + width + "px;height:" + height + "px;overflow:hidden;background:#000}",
    "#pulse{position:absolute;inset:0;transform-origin:center center}",
    ".layer{position:absolute;inset:0;overflow:hidden;transform-origin:center center}",
    ".layer img{width:100%;height:100%;display:block;object-fit:cover}",
    "</style></head><body>",
    "<div id=\"stage\" data-composition-id=\"" + projectionId + "\" data-width=\"" + width
      + "\" data-height=\"" + height + "\" data-duration=\"" + durationSec + "\">",
    "<div id=\"pulse\"></div></div>",
    "<script src=\"https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js\"></script>",
    "<script>\"use strict\";(function(){",
    "const model=" + data + ";",
    "const stage=document.getElementById('stage');const host=document.getElementById('pulse');",
    "const views=[];for(let i=0;i<8;i++){const layer=document.createElement('div');",
    "layer.className='layer';const img=document.createElement('img');img.alt='';",
    "layer.appendChild(img);host.appendChild(layer);views.push({layer,img});}",
    "function draw(timeSec){const t=Math.max(0,Math.min(model.durationMs,Math.round(timeSec*1000)));",
    "const index=Math.min(model.frames.length-1,Math.round(t*model.fps/1000));",
    "const state=model.frames[index];for(const v of views){v.layer.style.display='none';}",
    "for(let k=0;k<state.frameEatFrame.levels.length;k++){const level=state.frameEatFrame.levels[k];",
    "const v=views[k];v.layer.style.display='block';v.img.src=state.asset;",
    "const scale=level.scale*level.entryProgress;v.layer.style.transform=",
    "'translate(-50%,-50%) translate('+ (level.pivotX*100) +'%, '+(level.pivotY*100)+'%) scale('+scale+') rotate('+level.rotationDeg+'deg)';",
    "v.layer.style.clipPath='inset('+(level.crop*50)+'%)';",
    "v.layer.style.opacity=String(level.opacity);}",
    "const p=state.pulse;host.style.transform='translate('+p.translateXPx+'px,'+p.translateYPx+'px) scale('+p.scale+') rotate('+p.rotationDeg+'deg)';",
    "host.style.opacity=String(p.opacity);host.style.filter='brightness('+p.brightness+') blur('+p.blurPx+'px)';",
    "return index;}",
    "window.__hyperkitchen={draw:draw,model:model};",
    "window.__timelines=window.__timelines||{};",
    "if(window.gsap){const driver={time:0};Object.defineProperty(driver,'clock',{get(){return this.time;},set(v){this.time=v;draw(v);}});",
    "const tl=window.gsap.timeline({paused:true});tl.to(driver,{clock:" + durationSec + ",duration:"
      + durationSec + ",ease:'none',lazy:false},0);window.__timelines[model.projectionId]=tl;}",
    "else{window.__timelines[model.projectionId]={seek(t){draw(t);return this;},pause(){return this;},",
    "duration(){return " + durationSec + ";}};}",
    "draw(0);})();</script></body></html>",
  ].join("\n");
}

module.exports = {
  HTML_ADAPTER,
  PROJECTION_SCHEMA,
  buildKitchenSpecimen,
  compileHyperFramesProjection,
  renderHyperFramesHtml,
};
