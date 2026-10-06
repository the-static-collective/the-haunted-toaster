"use strict";

const {canonicalize,deepFreeze,hashCanonical}=require("../generation/canonical.cjs");

const FULL_SONG_FORM_SCHEMA="static-collective/full-song-form/v0";
const FULL_SONG_FORM_POLICY="section-snapped-three-act/v0";
const SCENES=["ARRIVE","CROSS","ASSEMBLE"];

function finite(value,label,min,max){
  const n=Number(value);
  if(!Number.isFinite(n)||n<min||n>max)throw new TypeError(`${label} must be finite in [${min}, ${max}].`);
  return n;
}
function frameAt(seconds,fps,totalFrames){
  return Math.max(0,Math.min(totalFrames,Math.round(Number(seconds)*fps)));
}
function normalizeSections(sections,durationSeconds,fps,totalFrames){
  if(!Array.isArray(sections))return [];
  const out=[];
  for(let index=0;index<sections.length;index++){
    const section=sections[index];
    if(!section||typeof section!=="object"||Array.isArray(section))continue;
    const start=Number(section.start);
    const end=Number(section.end);
    if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)continue;
    const boundedStart=Math.max(0,Math.min(durationSeconds,start));
    const boundedEnd=Math.max(0,Math.min(durationSeconds,end));
    if(boundedEnd<=boundedStart)continue;
    out.push({
      sectionIndex:index,
      label:String(section.label||`Section ${index+1}`),
      startSeconds:boundedStart,
      endSeconds:boundedEnd,
      startFrame:frameAt(boundedStart,fps,totalFrames),
      endFrame:frameAt(boundedEnd,fps,totalFrames),
      ...(Number.isFinite(Number(section.energy))?{energy:Number(section.energy)}:{}),
    });
  }
  return out.sort((a,b)=>a.startFrame-b.startFrame||a.endFrame-b.endFrame||a.sectionIndex-b.sectionIndex);
}
function fallbackBoundaries(totalFrames){
  const first=Math.max(1,Math.min(totalFrames-2,Math.round(totalFrames/3)));
  const second=Math.max(first+1,Math.min(totalFrames-1,Math.round((totalFrames*2)/3)));
  return [first,second];
}
function chooseBoundaries(sourceSections,totalFrames){
  const candidates=[...new Set(sourceSections.flatMap(section=>[section.startFrame,section.endFrame]))]
    .filter(frame=>Number.isSafeInteger(frame)&&frame>0&&frame<totalFrames)
    .sort((a,b)=>a-b);
  if(candidates.length<2)return {frames:fallbackBoundaries(totalFrames),basis:"duration-thirds"};
  const targetA=totalFrames/3,targetB=(totalFrames*2)/3;
  let best=null;
  for(let i=0;i<candidates.length;i++){
    for(let j=i+1;j<candidates.length;j++){
      const a=candidates[i],b=candidates[j];
      if(a<1||b<=a||b>=totalFrames)continue;
      const score=Math.abs(a-targetA)+Math.abs(b-targetB);
      if(!best||score<best.score||(score===best.score&&(a<best.a||(a===best.a&&b<best.b)))){
        best={a,b,score};
      }
    }
  }
  if(!best)return {frames:fallbackBoundaries(totalFrames),basis:"duration-thirds"};
  return {frames:[best.a,best.b],basis:"detected-section-boundaries"};
}
function validateSceneSpans(sceneSpans,totalFrames){
  if(!Array.isArray(sceneSpans)||sceneSpans.length!==3)throw new TypeError("Full-song form requires exactly three macro scene spans.");
  let cursor=0;
  return sceneSpans.map((span,index)=>{
    const sceneId=String(span?.sceneId||"");
    if(sceneId!==SCENES[index])throw new TypeError(`Full-song macro scene ${index} must be ${SCENES[index]}.`);
    const startFrame=Math.floor(finite(span.startFrame,`${sceneId} startFrame`,0,totalFrames-1));
    const durationFrames=Math.floor(finite(span.durationFrames,`${sceneId} durationFrames`,1,totalFrames));
    if(startFrame!==cursor)throw new RangeError("Full-song macro scene spans must be contiguous.");
    cursor=startFrame+durationFrames;
    return {sceneId,startFrame,durationFrames};
  }).map((span,index,array)=>{
    if(index===array.length-1&&span.startFrame+span.durationFrames!==totalFrames)throw new RangeError("Full-song macro scenes must exactly cover the admitted song.");
    return span;
  });
}
function validateFullSongForm(form){
  if(!form||typeof form!=="object"||Array.isArray(form))throw new TypeError("Full-song form must be an object.");
  if(form.schema!==FULL_SONG_FORM_SCHEMA||form.policy!==FULL_SONG_FORM_POLICY)throw new TypeError("Unsupported full-song form contract.");
  if(form.authority!=="timing-form")throw new TypeError("Full-song form must remain timing-form authority.");
  const fps=Math.floor(finite(form.fps,"fps",1,240));
  const totalFrames=Math.floor(finite(form.totalFrames,"totalFrames",3,1_000_000));
  const durationSeconds=finite(form.durationSeconds,"durationSeconds",1/fps,24*60*60);
  if(Math.round(durationSeconds*fps)!==totalFrames)throw new TypeError("Full-song form duration and totalFrames disagree.");
  validateSceneSpans(form.sceneSpans,totalFrames);
  if(!Array.isArray(form.sourceSections))throw new TypeError("Full-song form sourceSections must be an array.");
  const {formHash,...body}=form;
  const expected=hashCanonical(canonicalize(body),"HauntedToaster-FullSongForm-v0");
  if(!/^[a-f0-9]{64}$/.test(String(formHash||""))||formHash!==expected)throw new TypeError("Full-song form hash mismatch.");
  return deepFreeze(canonicalize(form));
}

function deriveFullSongForm({durationSeconds,fps=24,sections=[]}={}){
  const safeFps=Math.floor(finite(fps,"fps",1,240));
  const duration=finite(durationSeconds,"durationSeconds",1/safeFps,24*60*60);
  const totalFrames=Math.max(3,Math.round(duration*safeFps));
  const sourceSections=normalizeSections(sections,duration,safeFps,totalFrames);
  const chosen=chooseBoundaries(sourceSections,totalFrames);
  const [a,b]=chosen.frames;
  const sceneSpans=validateSceneSpans([
    {sceneId:"ARRIVE",startFrame:0,durationFrames:a},
    {sceneId:"CROSS",startFrame:a,durationFrames:b-a},
    {sceneId:"ASSEMBLE",startFrame:b,durationFrames:totalFrames-b},
  ],totalFrames);
  const body=canonicalize({
    schema:FULL_SONG_FORM_SCHEMA,
    policy:FULL_SONG_FORM_POLICY,
    authority:"timing-form",
    fps:safeFps,
    durationSeconds:duration,
    totalFrames,
    boundaryBasis:chosen.basis,
    sceneSpans,
    sourceSections,
    laws:[
      "SECTION GUIDE != EDIT",
      "SECTION BOUNDARY != PAUSE",
      "AUDIO CLOCK = PERFORMANCE CLOCK",
      "MACROFORM != PERFORMANCE",
    ],
  });
  return deepFreeze(canonicalize({
    ...body,
    formHash:hashCanonical(body,"HauntedToaster-FullSongForm-v0"),
  }));
}

module.exports={
  FULL_SONG_FORM_POLICY,
  FULL_SONG_FORM_SCHEMA,
  SCENES,
  deriveFullSongForm,
  validateFullSongForm,
  validateSceneSpans,
};
