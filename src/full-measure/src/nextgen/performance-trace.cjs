"use strict";

const {canonicalize,deepFreeze,hashCanonical}=require("../generation/canonical.cjs");
const {fingerprint256,stableStringify}=require("../renderer/one-pass.js");

const PERFORMANCE_TRACE_SCHEMA="static-collective/performance-trace/v0";
const PERFORMANCE_TRACE_POLICY="watch-play-trace/v0";
const PAINT_MODES=new Set(["scratch","stain","carve","bloom","reveal","displace"]);

function finite(v,label,min=-Infinity,max=Infinity){
  const n=Number(v);
  if(!Number.isFinite(n)||n<min||n>max)throw new TypeError(`${label} must be finite in [${min}, ${max}].`);
  return n;
}
function req(v,label){
  const s=String(v||"").trim();
  if(!s)throw new TypeError(`${label} is required.`);
  return s;
}
function witnessBody(receipt){
  const {performanceHash,...body}=receipt;
  return body;
}
function validatePerformanceReceipt(receipt){
  if(!receipt||typeof receipt!=="object"||Array.isArray(receipt))throw new TypeError("PerformanceTrace requires a ONE PASS receipt.");
  if(receipt.schema!=="static-collective/one-pass-performance-receipt/v0")throw new TypeError("PerformanceTrace requires ONE PASS receipt v0.");
  if(receipt.authority!=="witness-only")throw new TypeError("ONE PASS receipt must remain witness-only.");
  if(!Array.isArray(receipt.events)||!Array.isArray(receipt.placements))throw new TypeError("ONE PASS receipt requires events and placements.");
  if(receipt.eventCount!==receipt.events.length||receipt.placementCount!==receipt.placements.length)throw new TypeError("ONE PASS receipt counts do not match its body.");
  const expected=fingerprint256(stableStringify(witnessBody(receipt)));
  if(receipt.performanceHash!==expected)throw new TypeError("ONE PASS performance fingerprint mismatch.");
  return receipt;
}
function amountForDuration(durationFrames,totalFrames){
  const d=finite(durationFrames,"placement durationFrames",1,1_000_000);
  const total=finite(totalFrames,"performance totalFrames",1,1_000_000);
  return Math.max(0.12,Math.min(1,0.12+(d/total)*3.2));
}
function compilePerformanceTrace(receipt,{surfaceId="franken:topology",paintMode="scratch"}={}){
  const source=validatePerformanceReceipt(receipt);
  const surface=req(surfaceId,"surfaceId");
  const mode=req(paintMode,"paintMode");
  if(!PAINT_MODES.has(mode))throw new TypeError(`Unsupported topology paint mode: ${mode}.`);

  const paintEvents=source.placements.map((placement,index)=>{
    const placementId=req(placement.placementId,`placement[${index}].placementId`);
    const materialId=req(placement.materialId,`placement[${index}].materialId`);
    const durationFrames=finite(placement.durationFrames,`placement[${index}].durationFrames`,1,source.totalFrames);
    const transform=placement.transform||{};
    const amount=amountForDuration(durationFrames,source.totalFrames);
    return canonicalize({
      paintEventId:`paint:${source.performanceHash.slice(0,12)}:${placementId}`,
      authority:"proposal-only",
      sourcePerformanceHash:source.performanceHash,
      sourcePlacementId:placementId,
      sourceMaterialId:materialId,
      surfaceId:surface,
      span:{
        sceneId:req(placement.sceneId,`placement[${index}].sceneId`),
        startOffsetFrames:finite(placement.startOffsetFrames,`placement[${index}].startOffsetFrames`,0,1_000_000),
        durationFrames,
      },
      brush:{
        kind:"held-material-stamp",
        mode,
        x:finite(transform.x??0.5,`placement[${index}].transform.x`,-4,4),
        y:finite(transform.y??0.5,`placement[${index}].transform.y`,-4,4),
        scale:finite(transform.scale??1,`placement[${index}].transform.scale`,0.01,16),
        rotationDegrees:finite(transform.rotationDegrees??0,`placement[${index}].transform.rotationDegrees`,-3600,3600),
        amount,
      },
      persistence:{
        mode:"accumulate-decay",
        decayPerFrame:0.012,
        carryAcrossScenes:false,
      },
    });
  });

  const syzygies=paintEvents.map((paint,index)=>canonicalize({
    syzygyId:`syzygy:${source.performanceHash.slice(0,12)}:${index}`,
    authority:"proposal-only",
    driver:{
      kind:"performance-hold-duration",
      sourcePerformanceHash:source.performanceHash,
      placementId:paint.sourcePlacementId,
      property:"durationFrames",
    },
    target:{
      ref:paint.paintEventId,
      property:"brush.amount",
    },
    mapping:{
      kind:"linear",
      inputRange:[1,source.totalFrames],
      outputRange:[0.12,1],
    },
  }));

  const body=canonicalize({
    schema:PERFORMANCE_TRACE_SCHEMA,
    policy:PERFORMANCE_TRACE_POLICY,
    authority:"proposal-only",
    sourcePerformanceHash:source.performanceHash,
    fps:source.fps,
    totalFrames:source.totalFrames,
    topologySurfaceId:surface,
    paintMode:mode,
    placementIds:source.placements.map(p=>p.placementId),
    paintEvents,
    syzygies,
    laws:[
      "WATCH != PLAY",
      "PLAY != TRACE",
      "TRACE != FREEZE",
      "PAINT != SOURCE",
      "SYZYGY != OBJECT",
      "RELATION != AUTHORITY",
    ],
  });
  return deepFreeze(canonicalize({
    ...body,
    traceHash:hashCanonical(body,"HauntedToaster-PerformanceTrace-v0"),
  }));
}

module.exports={
  PAINT_MODES,
  PERFORMANCE_TRACE_POLICY,
  PERFORMANCE_TRACE_SCHEMA,
  amountForDuration,
  compilePerformanceTrace,
  validatePerformanceReceipt,
};
