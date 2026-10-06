"use strict";

const {canonicalize,deepFreeze,hashCanonical}=require("../generation/canonical.cjs");
const {compilePerformanceTrace,validatePerformanceReceipt}=require("./performance-trace.cjs");
const {compileResidueMemory,validateTrace}=require("./residue-memory.cjs");

const PERFORMANCE_PROGRAM_SCHEMA="static-collective/performance-program/v0";
const RENDER_REGION_PLAN_SCHEMA="static-collective/render-region-plan/v0";
const REGION_EXECUTION_RECEIPT_SCHEMA="static-collective/performance-program-region-execution-receipt/v0";
const EXECUTION_STATE_SCHEMA="static-collective/performance-program-execution-state/v0";
const SCENE_STARTS=Object.freeze({ARRIVE:0,CROSS:384,ASSEMBLE:768});

function req(value,label){
  const text=String(value||"").trim();
  if(!text)throw new TypeError(`${label} is required.`);
  return text;
}
function whole(value,label,min=0,max=1_000_000){
  const number=Number(value);
  if(!Number.isSafeInteger(number)||number<min||number>max)throw new TypeError(`${label} must be an integer in [${min}, ${max}].`);
  return number;
}
function finite(value,label,min=-Infinity,max=Infinity){
  const number=Number(value);
  if(!Number.isFinite(number)||number<min||number>max)throw new TypeError(`${label} must be finite in [${min}, ${max}].`);
  return number;
}
function validateHash(value,label){
  const text=String(value||"");
  if(!/^[a-f0-9]{64}$/.test(text))throw new TypeError(`${label} must be 64 lowercase hex characters.`);
  return text;
}
function globalStartFrame(placement,index){
  const sceneId=req(placement?.sceneId,`placement[${index}].sceneId`);
  if(!Object.prototype.hasOwnProperty.call(SCENE_STARTS,sceneId))throw new TypeError(`Unsupported performance-program scene: ${sceneId}.`);
  return SCENE_STARTS[sceneId]+whole(placement?.startOffsetFrames,`placement[${index}].startOffsetFrames`);
}
function timelineAction(placement,index,totalFrames,sourcePerformanceHash){
  const durationFrames=whole(placement?.durationFrames,`placement[${index}].durationFrames`,1,totalFrames);
  const startFrame=globalStartFrame(placement,index);
  const endFrameExclusive=Math.min(totalFrames,startFrame+durationFrames);
  if(endFrameExclusive<=startFrame)throw new TypeError(`placement[${index}] has no executable frame span.`);
  const transform=placement?.transform||{};
  return canonicalize({
    actionId:`timeline:${sourcePerformanceHash.slice(0,12)}:${index}`,
    sourcePlacementId:req(placement?.placementId,`placement[${index}].placementId`),
    sourceGestureSeq:Number.isSafeInteger(placement?.gestureSeq)?placement.gestureSeq:null,
    sourceMaterialId:req(placement?.materialId,`placement[${index}].materialId`),
    sceneId:req(placement?.sceneId,`placement[${index}].sceneId`),
    startFrame,
    endFrameExclusive,
    durationFrames:endFrameExclusive-startFrame,
    transform:{
      x:finite(transform.x??0.5,`placement[${index}].transform.x`,-4,4),
      y:finite(transform.y??0.5,`placement[${index}].transform.y`,-4,4),
      scale:finite(transform.scale??1,`placement[${index}].transform.scale`,0.01,16),
      rotationDegrees:finite(transform.rotationDegrees??0,`placement[${index}].transform.rotationDegrees`,-3600,3600),
    },
    keyframes:Array.isArray(placement?.keyframes)?canonicalize(placement.keyframes):[],
  });
}
function compileRenderRegionPlan({sourcePerformanceHash,totalFrames,regionFrames=24}={}){
  const sourceHash=validateHash(sourcePerformanceHash,"sourcePerformanceHash");
  const total=whole(totalFrames,"totalFrames",1,1_000_000);
  const width=whole(regionFrames,"regionFrames",1,10_000);
  const regions=[];
  for(let startFrame=0,index=0;startFrame<total;startFrame+=width,index++){
    const endFrameExclusive=Math.min(total,startFrame+width);
    regions.push(canonicalize({
      regionId:`frame-region:${String(index).padStart(4,"0")}:${startFrame}-${endFrameExclusive}`,
      authority:"work-description-only",
      index,
      startFrame,
      endFrameExclusive,
      frameCount:endFrameExclusive-startFrame,
    }));
  }
  const body=canonicalize({
    schema:RENDER_REGION_PLAN_SCHEMA,
    authority:"work-description-only",
    sourcePerformanceHash:sourceHash,
    totalFrames:total,
    regionFrames:width,
    regionCount:regions.length,
    regions,
    laws:[
      "REGION PLAN != EXECUTION",
      "REGION ASSIGNMENT != COMPUTE CAPACITY AUTHORITY",
      "REGION OUTPUT WITNESS != RENDERED PIXEL PROOF",
    ],
  });
  return deepFreeze(canonicalize({
    ...body,
    regionPlanHash:hashCanonical(body,"HauntedToaster-RenderRegionPlan-v0"),
  }));
}
function validateRenderRegionPlan(plan){
  if(!plan||typeof plan!=="object"||Array.isArray(plan))throw new TypeError("RenderRegionPlan must be an object.");
  if(plan.schema!==RENDER_REGION_PLAN_SCHEMA)throw new TypeError("Unsupported RenderRegionPlan schema.");
  if(plan.authority!=="work-description-only")throw new TypeError("RenderRegionPlan must remain work-description-only.");
  if(!Array.isArray(plan.regions)||plan.regions.length!==plan.regionCount)throw new TypeError("RenderRegionPlan region count mismatch.");
  const {regionPlanHash,...body}=plan;
  const expected=hashCanonical(canonicalize(body),"HauntedToaster-RenderRegionPlan-v0");
  if(regionPlanHash!==expected)throw new TypeError("RenderRegionPlan hash mismatch.");
  let cursor=0;
  for(const [index,region] of plan.regions.entries()){
    if(region.index!==index)throw new TypeError("RenderRegionPlan region index mismatch.");
    if(region.startFrame!==cursor)throw new TypeError("RenderRegionPlan contains a gap or overlap.");
    if(region.endFrameExclusive<=region.startFrame)throw new TypeError("RenderRegionPlan contains an empty region.");
    if(region.frameCount!==region.endFrameExclusive-region.startFrame)throw new TypeError("RenderRegionPlan frame count mismatch.");
    cursor=region.endFrameExclusive;
  }
  if(cursor!==plan.totalFrames)throw new TypeError("RenderRegionPlan does not exactly cover totalFrames.");
  return plan;
}
function compilePerformanceProgram(receipt,{
  regionFrames=24,
  surfaceId="franken:topology",
  paintMode="scratch",
  decayPerFrame=.0004,
  carryAcrossScenes=true,
}={}){
  const source=validatePerformanceReceipt(receipt);
  const trace=compilePerformanceTrace(source,{surfaceId,paintMode});
  const residueMemory=compileResidueMemory(trace,{decayPerFrame,carryAcrossScenes});
  const renderRegionPlan=compileRenderRegionPlan({
    sourcePerformanceHash:source.performanceHash,
    totalFrames:source.totalFrames,
    regionFrames,
  });
  const timelineActions=source.placements.map((placement,index)=>timelineAction(
    placement,
    index,
    source.totalFrames,
    source.performanceHash,
  ));
  const body=canonicalize({
    schema:PERFORMANCE_PROGRAM_SCHEMA,
    authority:"portable-replay-description-only",
    sourcePerformanceHash:source.performanceHash,
    fps:source.fps,
    totalFrames:source.totalFrames,
    timelineActions,
    performanceTrace:trace,
    residueMemory,
    renderRegionPlan,
    replaySemantics:{
      produces:"deterministic consequences of the sealed take",
      doesNotProduce:"a new human performance witness",
    },
    laws:[
      "REPLAY != RE-PERFORMANCE",
      "PROGRAM != PERFORMANCE",
      "PROGRAM != RENDER AUTHORITY",
      "TRACE != FREEZE",
      "HISTORY != DESTINY",
      "REGION PLAN != COMPUTE AUTHORITY",
    ],
  });
  return deepFreeze(canonicalize({
    ...body,
    programHash:hashCanonical(body,"HauntedToaster-PerformanceProgram-v0"),
  }));
}
function validatePerformanceProgram(program){
  if(!program||typeof program!=="object"||Array.isArray(program))throw new TypeError("PerformanceProgram must be an object.");
  if(program.schema!==PERFORMANCE_PROGRAM_SCHEMA)throw new TypeError("Unsupported PerformanceProgram schema.");
  if(program.authority!=="portable-replay-description-only")throw new TypeError("PerformanceProgram authority mismatch.");
  validateHash(program.sourcePerformanceHash,"PerformanceProgram sourcePerformanceHash");
  validateRenderRegionPlan(program.renderRegionPlan);
  if(program.renderRegionPlan.sourcePerformanceHash!==program.sourcePerformanceHash)throw new TypeError("PerformanceProgram region plan source mismatch.");
  validateTrace(program.performanceTrace);
  if(program.performanceTrace?.sourcePerformanceHash!==program.sourcePerformanceHash)throw new TypeError("PerformanceProgram trace source mismatch.");
  if(!program.residueMemory||typeof program.residueMemory!=="object"||Array.isArray(program.residueMemory))throw new TypeError("PerformanceProgram residue memory must be an object.");
  if(program.residueMemory.schema!=="static-collective/residue-memory/v0"||program.residueMemory.authority!=="proposal-only")throw new TypeError("PerformanceProgram residue memory contract mismatch.");
  const {memoryHash,...memoryBody}=program.residueMemory;
  if(memoryHash!==hashCanonical(canonicalize(memoryBody),"HauntedToaster-ResidueMemory-v0"))throw new TypeError("PerformanceProgram residue memory hash mismatch.");
  if(program.residueMemory?.sourcePerformanceHash!==program.sourcePerformanceHash)throw new TypeError("PerformanceProgram residue source mismatch.");
  if(program.residueMemory?.sourceTraceHash!==program.performanceTrace?.traceHash)throw new TypeError("PerformanceProgram residue/trace lineage mismatch.");
  const {programHash,...body}=program;
  const expected=hashCanonical(canonicalize(body),"HauntedToaster-PerformanceProgram-v0");
  if(programHash!==expected)throw new TypeError("PerformanceProgram hash mismatch.");
  return program;
}
function expectedRegionSimulationDigest(program,region){
  return hashCanonical(canonicalize({
    programHash:program.programHash,
    regionPlanHash:program.renderRegionPlan.regionPlanHash,
    regionId:region.regionId,
    startFrame:region.startFrame,
    endFrameExclusive:region.endFrameExclusive,
  }),"HauntedToaster-PerformanceProgram-RegionOutput-v0");
}
function executeRegion(program,regionId,{workerId,attemptId}={}){
  const source=validatePerformanceProgram(program);
  const region=source.renderRegionPlan.regions.find(item=>item.regionId===regionId);
  if(!region)throw new TypeError(`Unknown performance-program region: ${regionId}.`);
  const body=canonicalize({
    schema:REGION_EXECUTION_RECEIPT_SCHEMA,
    authority:"witness-only",
    programHash:source.programHash,
    regionPlanHash:source.renderRegionPlan.regionPlanHash,
    regionId:region.regionId,
    workerId:req(workerId,"workerId"),
    attemptId:req(attemptId,"attemptId"),
    frameCount:region.frameCount,
    simulationDigest:expectedRegionSimulationDigest(source,region),
    claimLimits:[
      "DETERMINISTIC REGION DIGEST != RENDERED PIXELS",
      "EXECUTION RECEIPT != ECONOMIC VALUE",
      "EXECUTION RECEIPT != OWNERSHIP",
      "EXECUTION RECEIPT != CONTINUATION AUTHORITY",
    ],
  });
  return deepFreeze(canonicalize({
    ...body,
    receiptHash:hashCanonical(body,"HauntedToaster-PerformanceProgram-RegionReceipt-v0"),
  }));
}
function validateRegionExecutionReceipt(program,receipt){
  const source=validatePerformanceProgram(program);
  if(!receipt||typeof receipt!=="object"||Array.isArray(receipt))throw new TypeError("Region execution receipt must be an object.");
  if(receipt.schema!==REGION_EXECUTION_RECEIPT_SCHEMA)throw new TypeError("Unsupported region execution receipt schema.");
  if(receipt.authority!=="witness-only")throw new TypeError("Region execution receipt must remain witness-only.");
  if(receipt.programHash!==source.programHash||receipt.regionPlanHash!==source.renderRegionPlan.regionPlanHash)throw new TypeError("Region execution receipt lineage mismatch.");
  const region=source.renderRegionPlan.regions.find(item=>item.regionId===receipt.regionId);
  if(!region)throw new TypeError("Region execution receipt names an unknown region.");
  if(receipt.frameCount!==region.frameCount)throw new TypeError("Region execution receipt frame count mismatch.");
  if(receipt.simulationDigest!==expectedRegionSimulationDigest(source,region))throw new TypeError("Region execution simulation digest mismatch.");
  const {receiptHash,...body}=receipt;
  const expected=hashCanonical(canonicalize(body),"HauntedToaster-PerformanceProgram-RegionReceipt-v0");
  if(receiptHash!==expected)throw new TypeError("Region execution receipt hash mismatch.");
  return receipt;
}
function executionState(program,receipts=[]){
  const source=validatePerformanceProgram(program);
  if(!Array.isArray(receipts))throw new TypeError("executionState receipts must be an array.");
  const valid=receipts.map(receipt=>validateRegionExecutionReceipt(source,receipt));
  const byRegion=new Map();
  for(const receipt of valid){
    const list=byRegion.get(receipt.regionId)||[];
    list.push(receipt);
    byRegion.set(receipt.regionId,list);
  }
  for(const list of byRegion.values())list.sort((a,b)=>a.receiptHash.localeCompare(b.receiptHash));
  const coveredRegionIds=[];
  const missingRegionIds=[];
  const duplicateRegionIds=[];
  let creditedCoverageFrames=0;
  let observedAttemptFrames=0;
  for(const region of source.renderRegionPlan.regions){
    const attempts=byRegion.get(region.regionId)||[];
    observedAttemptFrames+=attempts.reduce((sum,item)=>sum+item.frameCount,0);
    if(attempts.length===0){
      missingRegionIds.push(region.regionId);
      continue;
    }
    coveredRegionIds.push(region.regionId);
    creditedCoverageFrames+=region.frameCount;
    if(attempts.length>1)duplicateRegionIds.push(region.regionId);
  }
  const complete=missingRegionIds.length===0;
  const aggregateSimulationDigest=complete
    ?hashCanonical(canonicalize({
        programHash:source.programHash,
        regionPlanHash:source.renderRegionPlan.regionPlanHash,
        outputs:source.renderRegionPlan.regions.map(region=>({
          regionId:region.regionId,
          simulationDigest:expectedRegionSimulationDigest(source,region),
        })),
      }),"HauntedToaster-PerformanceProgram-AggregateOutput-v0")
    :null;
  const body=canonicalize({
    schema:EXECUTION_STATE_SCHEMA,
    authority:"accounting-only",
    programHash:source.programHash,
    regionPlanHash:source.renderRegionPlan.regionPlanHash,
    attemptCount:valid.length,
    coveredRegionIds,
    missingRegionIds,
    duplicateRegionIds,
    duplicateAttemptCount:valid.length-coveredRegionIds.length,
    creditedCoverageFrames,
    observedAttemptFrames,
    redundantWorkFrames:observedAttemptFrames-creditedCoverageFrames,
    complete,
    aggregateSimulationDigest,
    laws:[
      "ATTEMPT COUNT != COVERAGE",
      "DUPLICATE WORK != DOUBLE CREDIT",
      "MISSING SET != ASSIGNMENT AUTHORITY",
      "REPLAY != RE-PERFORMANCE",
    ],
  });
  return deepFreeze(canonicalize({
    ...body,
    stateHash:hashCanonical(body,"HauntedToaster-PerformanceProgram-ExecutionState-v0"),
  }));
}
function compilePerformanceBundle(receipt,options={}){
  const program=compilePerformanceProgram(receipt,options);
  const executionReceipt=executionState(program,[]);
  return deepFreeze({
    program,
    renderRegionPlan:program.renderRegionPlan,
    executionReceipt,
  });
}

module.exports={
  EXECUTION_STATE_SCHEMA,
  PERFORMANCE_PROGRAM_SCHEMA,
  REGION_EXECUTION_RECEIPT_SCHEMA,
  RENDER_REGION_PLAN_SCHEMA,
  compilePerformanceBundle,
  compilePerformanceProgram,
  compileRenderRegionPlan,
  executeRegion,
  executionState,
  expectedRegionSimulationDigest,
  validatePerformanceProgram,
  validateRegionExecutionReceipt,
  validateRenderRegionPlan,
};
