"use strict";

const crypto=require("node:crypto");
const fs=require("node:fs/promises");
const path=require("node:path");
const {canonicalize,deepFreeze,hashCanonical}=require("../generation/canonical.cjs");
const {resolveFfmpeg,runProcess}=require("../render/tooling.cjs");
const {strengthAtFrame}=require("./residue-memory.cjs");
const {validatePerformanceProgram}=require("./performance-program.cjs");

const PIXEL_REGION_RECEIPT_SCHEMA="static-collective/performance-program-pixel-region-receipt/v0";
const PIXEL_EXECUTION_STATE_SCHEMA="static-collective/performance-program-pixel-execution-state/v0";
const PIXEL_ARTIFACT_GRAPH_SCHEMA="static-collective/performance-program-pixel-artifact-graph/v0";
const WHOLE_RENDER_RECEIPT_SCHEMA="static-collective/performance-program-whole-render-receipt/v0";
const RENDERER_ID="ffmpeg-performance-program-witness-raster/v0";

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
function clamp(value,min,max){
  return Math.min(max,Math.max(min,value));
}
function sha256(bytes){
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
function safeName(value){
  return String(value).replace(/[^A-Za-z0-9._-]/g,"_").slice(0,180);
}
function materialColor(materialId,blend="normal"){
  const digest=crypto.createHash("sha256").update(String(materialId),"utf8").digest();
  const lift=blend==="screen"?96:64;
  const channel=index=>Math.min(255,lift+(digest[index]%160));
  return [channel(0),channel(1),channel(2)]
    .map(value=>value.toString(16).padStart(2,"0"))
    .join("");
}
function experiencedOffsetForAction(action,offsetFrame){
  const raw=Math.max(0,Number(offsetFrame)||0);
  const map=action?.experiencedTime;
  if(!map)return raw;
  if(map.schema!=="static-collective/experienced-time-map/v0"||map.authority!=="compiled-relation-only"){
    throw new TypeError("Unsupported experienced-time contract.");
  }
  if(map.law!=="ease-in-power")throw new TypeError(`Unsupported experienced-time law: ${String(map.law||"(missing)")}.`);
  const exponent=Number(map.exponent);
  if(!Number.isFinite(exponent)||exponent<1||exponent>8)throw new TypeError("Experienced-time exponent is outside the supported range.");
  const span=Math.max(0,Number(action?.durationFrames||0)-1);
  if(span<=0)return 0;
  const normalized=clamp(raw/span,0,1);
  return Math.pow(normalized,exponent)*span;
}

function interpolateTransform(action,offsetFrame){
  const base=action?.transform||{x:.5,y:.5,scale:1,rotationDegrees:0};
  const points=[{offsetFrames:0,transform:base},...(Array.isArray(action?.transformKeyframes)?action.transformKeyframes:[])]
    .filter(item=>Number.isFinite(Number(item?.offsetFrames))&&item?.transform)
    .map(item=>({
      offsetFrames:Math.max(0,Math.floor(Number(item.offsetFrames))),
      transform:{
        x:Number(item.transform.x),
        y:Number(item.transform.y),
        scale:Number(item.transform.scale),
        rotationDegrees:Number(item.transform.rotationDegrees),
      },
    }))
    .sort((a,b)=>a.offsetFrames-b.offsetFrames);
  const unique=[];
  for(const point of points){
    const previous=unique.at(-1);
    if(previous?.offsetFrames===point.offsetFrames)unique[unique.length-1]=point;
    else unique.push(point);
  }
  const target=Math.max(0,Number(offsetFrame)||0);
  let left=unique[0],right=unique.at(-1);
  for(let index=0;index<unique.length;index++){
    if(unique[index].offsetFrames<=target)left=unique[index];
    if(unique[index].offsetFrames>=target){right=unique[index];break;}
  }
  if(!left||!right)return {...base};
  const span=right.offsetFrames-left.offsetFrames;
  const ratio=span<=0?0:clamp((target-left.offsetFrames)/span,0,1);
  const lerp=(a,b)=>a+((b-a)*ratio);
  return {
    x:lerp(left.transform.x,right.transform.x),
    y:lerp(left.transform.y,right.transform.y),
    scale:lerp(left.transform.scale,right.transform.scale),
    rotationDegrees:lerp(left.transform.rotationDegrees,right.transform.rotationDegrees),
  };
}
function geometryForAction(action,globalFrame,width,height){
  const rawOffset=globalFrame-action.startFrame;
  const offset=experiencedOffsetForAction(action,rawOffset);
  const transform=interpolateTransform(action,offset);
  const crop=action.crop&&typeof action.crop==="object"?action.crop:null;
  const scale=clamp(Number(transform.scale)||1,0.05,16);
  const baseWidth=clamp(Math.round(width*.22*scale),2,width);
  const baseHeight=clamp(Math.round(height*.22*scale),2,height);
  const cropX=crop?clamp(Number(crop.x)||0,0,1):0;
  const cropY=crop?clamp(Number(crop.y)||0,0,1):0;
  const cropWidth=crop?clamp(Number(crop.width)||1,.01,1):1;
  const cropHeight=crop?clamp(Number(crop.height)||1,.01,1):1;
  const boxWidth=clamp(Math.round(baseWidth*cropWidth),2,width);
  const boxHeight=clamp(Math.round(baseHeight*cropHeight),2,height);
  const centerX=(Number(transform.x)||0)*width+(cropX+(cropWidth/2)-.5)*baseWidth;
  const centerY=(Number(transform.y)||0)*height+(cropY+(cropHeight/2)-.5)*baseHeight;
  const x=clamp(Math.round(centerX-(boxWidth/2)),0,Math.max(0,width-boxWidth));
  const y=clamp(Math.round(centerY-(boxHeight/2)),0,Math.max(0,height-boxHeight));
  const angle=(Number(transform.rotationDegrees)||0)*(Math.PI/180);
  const radius=Math.max(2,Math.round(Math.min(boxWidth,boxHeight)*.35));
  const markerX=clamp(Math.round(x+(boxWidth/2)+(Math.cos(angle)*radius)),0,width-2);
  const markerY=clamp(Math.round(y+(boxHeight/2)+(Math.sin(angle)*radius)),0,height-2);
  const sourcePhase=Math.abs((whole(action.sourceStartFrames??0,"sourceStartFrames") + Math.max(0,Math.floor(offset)))%Math.max(1,boxWidth));
  const sourceMarkerX=clamp(x+sourcePhase,0,width-1);
  return {x,y,boxWidth,boxHeight,markerX,markerY,sourceMarkerX};
}
function frameFilters(program,globalFrame,localFrame,width,height){
  const filters=[];
  const active=(program.timelineActions||[])
    .filter(action=>globalFrame>=action.startFrame&&globalFrame<action.endFrameExclusive)
    .sort((a,b)=>(Number(a.stackOrder)||0)-(Number(b.stackOrder)||0)||String(a.actionId).localeCompare(String(b.actionId)));
  for(const action of active){
    const geometry=geometryForAction(action,globalFrame,width,height);
    const color=materialColor(action.sourceMaterialId,action.blend);
    const opacity=Number(action.opacity);
    const alpha=clamp(Number.isFinite(opacity)?opacity:1,0,1);
    const enable=`eq(n\\,${localFrame})`;
    filters.push(`drawbox=x=${geometry.x}:y=${geometry.y}:w=${geometry.boxWidth}:h=${geometry.boxHeight}:color=0x${color}@${alpha.toFixed(6)}:t=fill:enable='${enable}'`);
    filters.push(`drawbox=x=${geometry.markerX}:y=${geometry.markerY}:w=2:h=2:color=white@0.900000:t=fill:enable='${enable}'`);
    filters.push(`drawbox=x=${geometry.sourceMarkerX}:y=${geometry.y}:w=1:h=${geometry.boxHeight}:color=black@0.650000:t=fill:enable='${enable}'`);
  }
  const residues=program.residueMemory?.residues||[];
  if(residues.length){
    const total=residues.reduce((sum,residue)=>sum+strengthAtFrame(residue,globalFrame),0);
    const average=clamp(total/residues.length,0,1);
    const barWidth=Math.round(width*average);
    if(barWidth>0){
      const enable=`eq(n\\,${localFrame})`;
      filters.push(`drawbox=x=0:y=0:w=${barWidth}:h=2:color=0xf4df9c@0.850000:t=fill:enable='${enable}'`);
    }
  }
  return filters;
}
function compileWitnessFilter(program,{startFrame,endFrameExclusive,width,height}){
  const source=validatePerformanceProgram(program);
  const start=whole(startFrame,"startFrame",0,source.totalFrames-1);
  const end=whole(endFrameExclusive,"endFrameExclusive",start+1,source.totalFrames);
  const w=whole(width,"width",16,4096);
  const h=whole(height,"height",16,4096);
  const filters=["format=rgb24"];
  for(let globalFrame=start;globalFrame<end;globalFrame++){
    filters.push(...frameFilters(source,globalFrame,globalFrame-start,w,h));
  }
  return filters.join(",");
}
async function readFrameRecords(directory,startFrame,endFrameExclusive){
  const frames=[];
  for(let frame=startFrame;frame<endFrameExclusive;frame++){
    const filename=`frame-${String(frame).padStart(6,"0")}.ppm`;
    const filePath=path.join(directory,filename);
    const bytes=await fs.readFile(filePath);
    frames.push({
      frame,
      filename,
      sha256:sha256(bytes),
      sizeBytes:bytes.length,
    });
  }
  return frames;
}
async function renderFrames(program,{
  rootDir,
  startFrame,
  endFrameExclusive,
  width=96,
  height=54,
  label,
}={}){
  const source=validatePerformanceProgram(program);
  const root=path.resolve(req(rootDir,"rootDir"));
  const start=whole(startFrame,"startFrame",0,source.totalFrames-1);
  const end=whole(endFrameExclusive,"endFrameExclusive",start+1,source.totalFrames);
  const frameCount=end-start;
  const w=whole(width,"width",16,4096);
  const h=whole(height,"height",16,4096);
  const directory=path.join(root,safeName(source.programHash),safeName(label));
  await fs.rm(directory,{recursive:true,force:true});
  await fs.mkdir(directory,{recursive:true});
  const filter=compileWitnessFilter(source,{startFrame:start,endFrameExclusive:end,width:w,height:h});
  const outputPattern=path.join(directory,"frame-%06d.ppm");
  await runProcess(resolveFfmpeg(),[
    "-y",
    "-hide_banner",
    "-loglevel","error",
    "-f","lavfi",
    "-i",`color=c=0x050509:s=${w}x${h}:r=${source.fps}`,
    "-vf",filter,
    "-frames:v",String(frameCount),
    "-pix_fmt","rgb24",
    "-threads","1",
    "-start_number",String(start),
    "-f","image2",
    "-vcodec","ppm",
    outputPattern,
  ],{cwd:directory});
  const frames=await readFrameRecords(directory,start,end);
  if(frames.length!==frameCount)throw new Error("Witness raster frame count mismatch.");
  return {directory,width:w,height:h,frames};
}
function regionPixelHash(program,region,frames){
  return hashCanonical(canonicalize({
    programHash:program.programHash,
    regionPlanHash:program.renderRegionPlan.regionPlanHash,
    regionId:region.regionId,
    frames:frames.map(frame=>({frame:frame.frame,sha256:frame.sha256})),
  }),"HauntedToaster-PerformanceProgram-RegionPixels-v0");
}
async function renderProgramRegion(program,regionId,{
  rootDir,
  workerId,
  attemptId,
  width=96,
  height=54,
}={}){
  const source=validatePerformanceProgram(program);
  const region=source.renderRegionPlan.regions.find(item=>item.regionId===regionId);
  if(!region)throw new TypeError(`Unknown performance-program region: ${regionId}.`);
  const worker=req(workerId,"workerId");
  const attempt=req(attemptId,"attemptId");
  const rendered=await renderFrames(source,{
    rootDir,
    startFrame:region.startFrame,
    endFrameExclusive:region.endFrameExclusive,
    width,
    height,
    label:`${safeName(region.regionId)}--${safeName(attempt)}`,
  });
  const body=canonicalize({
    schema:PIXEL_REGION_RECEIPT_SCHEMA,
    authority:"witness-only",
    renderer:RENDERER_ID,
    programHash:source.programHash,
    regionPlanHash:source.renderRegionPlan.regionPlanHash,
    regionId:region.regionId,
    workerId:worker,
    attemptId:attempt,
    startFrame:region.startFrame,
    endFrameExclusive:region.endFrameExclusive,
    frameCount:region.frameCount,
    raster:{width:rendered.width,height:rendered.height,pixelFormat:"rgb24",container:"ppm-sequence"},
    frames:rendered.frames,
    regionPixelHash:regionPixelHash(source,region,rendered.frames),
    claimLimits:[
      "PIXEL RECEIPT != HUMAN PERFORMANCE",
      "WITNESS RASTER != FINAL ARTISTIC PROJECTION",
      "WORKER ID != COMPUTE CAPACITY AUTHORITY",
      "ARTIFACT HASH != ECONOMIC VALUE",
    ],
  });
  const receipt=deepFreeze(canonicalize({
    ...body,
    receiptHash:hashCanonical(body,"HauntedToaster-PerformanceProgram-PixelRegionReceipt-v0"),
  }));
  return {directory:rendered.directory,receipt};
}
function validatePixelRegionReceipt(program,receipt){
  const source=validatePerformanceProgram(program);
  if(!receipt||typeof receipt!=="object"||Array.isArray(receipt))throw new TypeError("Pixel region receipt must be an object.");
  if(receipt.schema!==PIXEL_REGION_RECEIPT_SCHEMA)throw new TypeError("Unsupported pixel region receipt schema.");
  if(receipt.authority!=="witness-only"||receipt.renderer!==RENDERER_ID)throw new TypeError("Pixel region receipt authority/renderer mismatch.");
  if(receipt.programHash!==source.programHash||receipt.regionPlanHash!==source.renderRegionPlan.regionPlanHash)throw new TypeError("Pixel region receipt lineage mismatch.");
  const region=source.renderRegionPlan.regions.find(item=>item.regionId===receipt.regionId);
  if(!region)throw new TypeError("Pixel region receipt names an unknown region.");
  if(receipt.startFrame!==region.startFrame||receipt.endFrameExclusive!==region.endFrameExclusive||receipt.frameCount!==region.frameCount)throw new TypeError("Pixel region receipt frame span mismatch.");
  if(!Array.isArray(receipt.frames)||receipt.frames.length!==region.frameCount)throw new TypeError("Pixel region receipt frame inventory mismatch.");
  for(let index=0;index<receipt.frames.length;index++){
    const frame=receipt.frames[index];
    if(frame.frame!==region.startFrame+index)throw new TypeError("Pixel region receipt contains a non-contiguous frame inventory.");
    if(!/^[a-f0-9]{64}$/.test(String(frame.sha256||"")))throw new TypeError("Pixel region receipt contains an invalid frame hash.");
  }
  const expectedRegionHash=regionPixelHash(source,region,receipt.frames);
  if(receipt.regionPixelHash!==expectedRegionHash)throw new TypeError("Pixel region receipt pixel hash mismatch.");
  const {receiptHash,...body}=receipt;
  if(receiptHash!==hashCanonical(canonicalize(body),"HauntedToaster-PerformanceProgram-PixelRegionReceipt-v0"))throw new TypeError("Pixel region receipt hash mismatch.");
  return receipt;
}
function pixelExecutionState(program,receipts=[]){
  const source=validatePerformanceProgram(program);
  if(!Array.isArray(receipts))throw new TypeError("pixelExecutionState receipts must be an array.");
  const valid=receipts.map(receipt=>validatePixelRegionReceipt(source,receipt));
  const byRegion=new Map();
  for(const receipt of valid){
    const list=byRegion.get(receipt.regionId)||[];
    list.push(receipt);
    byRegion.set(receipt.regionId,list);
  }
  const coveredRegionIds=[];
  const missingRegionIds=[];
  const duplicateRegionIds=[];
  const conflictingRegionIds=[];
  for(const region of source.renderRegionPlan.regions){
    const attempts=byRegion.get(region.regionId)||[];
    if(!attempts.length){
      missingRegionIds.push(region.regionId);
      continue;
    }
    coveredRegionIds.push(region.regionId);
    if(attempts.length>1)duplicateRegionIds.push(region.regionId);
    if(new Set(attempts.map(item=>item.regionPixelHash)).size>1)conflictingRegionIds.push(region.regionId);
  }
  const body=canonicalize({
    schema:PIXEL_EXECUTION_STATE_SCHEMA,
    authority:"accounting-only",
    renderer:RENDERER_ID,
    programHash:source.programHash,
    regionPlanHash:source.renderRegionPlan.regionPlanHash,
    attemptCount:valid.length,
    coveredRegionIds,
    missingRegionIds,
    duplicateRegionIds,
    conflictingRegionIds,
    duplicateAttemptCount:valid.length-coveredRegionIds.length,
    complete:missingRegionIds.length===0&&conflictingRegionIds.length===0,
    laws:[
      "PIXEL ATTEMPT COUNT != PIXEL COVERAGE",
      "DUPLICATE PIXELS != DOUBLE CREDIT",
      "CONFLICT != SILENT WINNER",
      "MISSING SET != ASSIGNMENT AUTHORITY",
    ],
  });
  return deepFreeze(canonicalize({
    ...body,
    stateHash:hashCanonical(body,"HauntedToaster-PerformanceProgram-PixelExecutionState-v0"),
  }));
}
function frameGraphHash(program,frames){
  return hashCanonical(canonicalize({
    programHash:program.programHash,
    renderer:RENDERER_ID,
    frames:frames.map(frame=>({frame:frame.frame,sha256:frame.sha256})),
  }),"HauntedToaster-PerformanceProgram-FrameGraph-v0");
}
function composePixelArtifactGraph(program,receipts=[]){
  const source=validatePerformanceProgram(program);
  const state=pixelExecutionState(source,receipts);
  if(!state.complete)throw new TypeError("Pixel artifact graph requires complete conflict-free region coverage.");
  const byRegion=new Map();
  for(const receipt of receipts.map(item=>validatePixelRegionReceipt(source,item))){
    const list=byRegion.get(receipt.regionId)||[];
    list.push(receipt);
    byRegion.set(receipt.regionId,list);
  }
  const frames=[];
  const regionPixels=[];
  for(const region of source.renderRegionPlan.regions){
    const attempts=(byRegion.get(region.regionId)||[]).sort((a,b)=>a.receiptHash.localeCompare(b.receiptHash));
    const chosen=attempts[0];
    regionPixels.push({regionId:region.regionId,regionPixelHash:chosen.regionPixelHash});
    frames.push(...chosen.frames.map(frame=>({frame:frame.frame,sha256:frame.sha256,sizeBytes:frame.sizeBytes})));
  }
  if(frames.length!==source.totalFrames)throw new TypeError("Pixel artifact graph does not cover every program frame.");
  for(let index=0;index<frames.length;index++)if(frames[index].frame!==index)throw new TypeError("Pixel artifact graph frame order is not contiguous.");
  const body=canonicalize({
    schema:PIXEL_ARTIFACT_GRAPH_SCHEMA,
    authority:"artifact-witness-only",
    renderer:RENDERER_ID,
    programHash:source.programHash,
    regionPlanHash:source.renderRegionPlan.regionPlanHash,
    frameCount:frames.length,
    regionPixels,
    frames,
    frameGraphHash:frameGraphHash(source,frames),
  });
  return deepFreeze(canonicalize({
    ...body,
    artifactGraphHash:hashCanonical(body,"HauntedToaster-PerformanceProgram-PixelArtifactGraph-v0"),
  }));
}
async function renderProgramWhole(program,{
  rootDir,
  workerId="clean-whole",
  attemptId="clean-whole",
  width=96,
  height=54,
}={}){
  const source=validatePerformanceProgram(program);
  const rendered=await renderFrames(source,{
    rootDir,
    startFrame:0,
    endFrameExclusive:source.totalFrames,
    width,
    height,
    label:`whole--${safeName(attemptId)}`,
  });
  const body=canonicalize({
    schema:WHOLE_RENDER_RECEIPT_SCHEMA,
    authority:"witness-only",
    renderer:RENDERER_ID,
    programHash:source.programHash,
    workerId:req(workerId,"workerId"),
    attemptId:req(attemptId,"attemptId"),
    frameCount:rendered.frames.length,
    raster:{width:rendered.width,height:rendered.height,pixelFormat:"rgb24",container:"ppm-sequence"},
    frames:rendered.frames,
    frameGraphHash:frameGraphHash(source,rendered.frames),
    claimLimits:[
      "WHOLE RENDER RECEIPT != HUMAN PERFORMANCE",
      "WITNESS RASTER != FINAL ARTISTIC PROJECTION",
    ],
  });
  return {
    directory:rendered.directory,
    receipt:deepFreeze(canonicalize({
      ...body,
      receiptHash:hashCanonical(body,"HauntedToaster-PerformanceProgram-WholeRenderReceipt-v0"),
    })),
  };
}

module.exports={
  PIXEL_ARTIFACT_GRAPH_SCHEMA,
  PIXEL_EXECUTION_STATE_SCHEMA,
  PIXEL_REGION_RECEIPT_SCHEMA,
  RENDERER_ID,
  WHOLE_RENDER_RECEIPT_SCHEMA,
  compileWitnessFilter,
  composePixelArtifactGraph,
  experiencedOffsetForAction,
  frameGraphHash,
  interpolateTransform,
  pixelExecutionState,
  renderProgramRegion,
  renderProgramWhole,
  validatePixelRegionReceipt,
};
