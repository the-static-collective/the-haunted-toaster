"use strict";

const {
  canonicalize,
  deepFreeze,
  hashCanonical,
}=require("../generation/canonical.cjs");

const QUEUE_SCHEMA="static-collective/lyric-performance-queue/v0";
const QUEUE_AUTHORITY="performance-guide-only";
const GUIDE_SCHEMA="static-collective/lyric-performance-guide-state/v0";
const STATES=new Set(["ANCHORED","READY","WATCH","CATCH"]);
const LANES=new Set(["OPEN","TENDER","STRANGE","HARD"]);

function req(value,label,limit=500){
  const text=String(value??"").trim();
  if(!text)throw new TypeError(`${label} must be non-empty.`);
  if(text.length>limit)throw new TypeError(`${label} exceeds ${limit} characters.`);
  return text;
}

function finiteFrame(value,totalFrames,label){
  const frame=Math.round(Number(value));
  if(!Number.isFinite(frame)||frame<0||frame>=totalFrames){
    throw new TypeError(`${label} must be inside the admitted song.`);
  }
  return frame;
}

function lyricWitnessIndex(field){
  if(!field||field.schema!=="static-collective/listening-field/v0"||field.authority!=="testimony-only"){
    throw new TypeError("Lyric performance queue requires testimony-only ListeningFieldV0.");
  }
  const index=new Map();
  for(const lane of field.lanes||[]){
    for(const witness of lane.witnesses||[]){
      if(witness?.kind!=="lyric-cue"||witness?.authority!=="testimony-only")continue;
      const lineId=String(witness?.sourceRef?.lineId||"").trim();
      if(lineId)index.set(lineId,witness);
    }
  }
  return index;
}

function classifyCue(cue){
  const status=String(cue?.status||"unmatched");
  if(status==="human"||cue?.humanCorrected===true)return "ANCHORED";
  if(status==="high")return "READY";
  if(status==="medium")return "WATCH";
  return "CATCH";
}

function deriveLyricPerformanceQueue({fullSongForm,listeningField,alignment}={}){
  if(!fullSongForm||fullSongForm.schema!=="static-collective/full-song-form/v0"){
    throw new TypeError("Lyric performance queue requires FullSongFormV0.");
  }
  if(listeningField?.formRef?.formHash!==fullSongForm.formHash){
    throw new TypeError("ListeningField must bind to the exact FullSongForm.");
  }
  if(!alignment||alignment.schema!=="full-measure.lyric-alignment.v1"||!Array.isArray(alignment.cues)){
    throw new TypeError("Lyric performance queue requires Listener alignment v1.");
  }

  const witnessByLine=lyricWitnessIndex(listeningField);
  const entries=alignment.cues.map((cue,index)=>{
    const lineId=req(cue?.lineId||`line-${index+1}`,`cue[${index}] lineId`,96);
    const text=req(cue?.text,`cue[${index}] text`,500);
    const state=classifyCue(cue);
    const witness=witnessByLine.get(lineId)||null;
    const proposedFrame=witness?finiteFrame(witness.startFrame,fullSongForm.totalFrames,`cue[${index}] proposedFrame`):null;
    const confidenceValue=Number(cue?.confidence);
    const confidence=Number.isFinite(confidenceValue)
      ?Math.max(0,Math.min(1,confidenceValue))
      :0;

    if(state!=="CATCH"&&!witness){
      throw new TypeError(`Scheduled lyric ${lineId} requires a ListeningField timing witness.`);
    }

    return canonicalize({
      queueIndex:index,
      lineId,
      text,
      state,
      authority:QUEUE_AUTHORITY,
      autoArrival:state!=="CATCH",
      proposedFrame,
      sourceWitnessId:witness?.witnessId||null,
      sourceEvidence:{
        alignmentSchema:alignment.schema,
        status:String(cue?.status||"unmatched"),
        confidence,
        humanCorrected:cue?.humanCorrected===true,
      },
    });
  });

  const body=canonicalize({
    schema:QUEUE_SCHEMA,
    authority:QUEUE_AUTHORITY,
    songRef:listeningField.songRef,
    formRef:{
      formHash:fullSongForm.formHash,
      fps:fullSongForm.fps,
      totalFrames:fullSongForm.totalFrames,
    },
    listeningFieldRef:{
      fieldHash:listeningField.fieldHash,
      authority:listeningField.authority,
    },
    alignmentRef:{
      schema:alignment.schema,
      cueCount:entries.length,
    },
    entries,
    laws:[
      "INTERACTION BURDEN != EVIDENCE AUTHORITY",
      "AUTO ARRIVAL != HUMAN PLACEMENT CLAIM",
      "HUMAN PUNCH != MACHINE HEARING",
      "LATCHED MOOD != LYRIC MEANING",
      "LANE STATE != TIMING AUTHORITY",
      "MISS != ERROR",
      "UNRESOLVED != STOP",
      "PERFORMANCE QUEUE != FROZEN PLAN",
    ],
  });

  return deepFreeze(canonicalize({
    ...body,
    queueHash:hashCanonical(body,"HauntedToaster-LyricPerformanceQueue-v0"),
  }));
}

function validateQueue(queue){
  if(!queue||queue.schema!==QUEUE_SCHEMA||queue.authority!==QUEUE_AUTHORITY){
    throw new TypeError("Expected LyricPerformanceQueueV0.");
  }
  if(!Array.isArray(queue.entries)||!Number.isSafeInteger(queue.formRef?.totalFrames)){
    throw new TypeError("Lyric performance queue is malformed.");
  }
  for(const entry of queue.entries){
    if(!STATES.has(entry.state)||entry.authority!==QUEUE_AUTHORITY)throw new TypeError("Invalid lyric queue entry.");
    if(entry.proposedFrame!==null)finiteFrame(entry.proposedFrame,queue.formRef.totalFrames,"queue proposedFrame");
  }
  const {queueHash,...body}=queue;
  const expected=hashCanonical(canonicalize(body),"HauntedToaster-LyricPerformanceQueue-v0");
  if(queueHash!==expected)throw new TypeError("Lyric performance queue hash mismatch.");
  return queue;
}

function arrivalFor(entry,actualFrame,moodLane,timingSource){
  return canonicalize({
    queueIndex:entry.queueIndex,
    lineId:entry.lineId,
    text:entry.text,
    sourceWitnessId:entry.sourceWitnessId,
    scheduledFrame:entry.proposedFrame,
    actualFrame,
    timingSource,
    moodLane,
    moodAuthority:"performance-choice",
    humanAnchorCreated:timingSource==="human-punch",
  });
}

function createLyricGuideState({queue,initialLane="OPEN"}={}){
  validateQueue(queue);
  if(!LANES.has(initialLane))throw new TypeError(`Unknown lyric lane: ${initialLane}.`);
  return deepFreeze(canonicalize({
    schema:GUIDE_SCHEMA,
    authority:"performance-state",
    queueHash:queue.queueHash,
    queue,
    cursor:0,
    laneLatch:initialLane,
    laneChanges:[],
    arrivals:[],
    misses:[],
    humanAnchors:[],
    lastFrame:0,
  }));
}

function assertGuide(state){
  if(!state||state.schema!==GUIDE_SCHEMA||state.authority!=="performance-state"){
    throw new TypeError("Expected lyric performance guide state.");
  }
  validateQueue(state.queue);
  if(state.queueHash!==state.queue.queueHash)throw new TypeError("Lyric guide queue identity mismatch.");
  return state;
}

function setLaneLatch(state,moodLane,frame){
  assertGuide(state);
  if(!LANES.has(moodLane))throw new TypeError(`Unknown lyric lane: ${moodLane}.`);
  const target=finiteFrame(frame,state.queue.formRef.totalFrames,"lane latch frame");
  return deepFreeze(canonicalize({
    ...state,
    laneLatch:moodLane,
    lastFrame:Math.max(state.lastFrame,target),
    laneChanges:[
      ...state.laneChanges,
      {
        frame:target,
        moodLane,
        authority:"performance-choice",
      },
    ],
  }));
}

function nextScheduledEntry(entries,start){
  for(let index=start;index<entries.length;index++){
    const entry=entries[index];
    if(entry.autoArrival&&entry.proposedFrame!==null)return entry;
  }
  return null;
}

function advanceLyricGuide(state,frame){
  assertGuide(state);
  const target=finiteFrame(frame,state.queue.formRef.totalFrames,"guide frame");
  if(target<state.lastFrame)throw new TypeError("Lyric performance guide cannot run backward.");
  let cursor=state.cursor;
  const arrivals=[...state.arrivals];
  const misses=[...state.misses];
  const entries=state.queue.entries;

  while(cursor<entries.length){
    const entry=entries[cursor];

    if(entry.autoArrival){
      if(entry.proposedFrame===null||entry.proposedFrame>target)break;
      arrivals.push(arrivalFor(entry,entry.proposedFrame,state.laneLatch,"machine-scheduled"));
      cursor+=1;
      continue;
    }

    const overtaker=nextScheduledEntry(entries,cursor+1);
    if(overtaker&&overtaker.proposedFrame!==null&&overtaker.proposedFrame<=target){
      misses.push(canonicalize({
        queueIndex:entry.queueIndex,
        lineId:entry.lineId,
        text:entry.text,
        sourceWitnessId:entry.sourceWitnessId,
        proposedFrame:entry.proposedFrame,
        missedAtFrame:overtaker.proposedFrame,
        reason:"overtaken-by-scheduled-lyric",
        authority:"witness-only",
      }));
      cursor+=1;
      continue;
    }
    break;
  }

  return deepFreeze(canonicalize({
    ...state,
    cursor,
    arrivals,
    misses,
    lastFrame:target,
  }));
}

function punchCurrentLyric(state,{frame}={}){
  assertGuide(state);
  const target=finiteFrame(frame,state.queue.formRef.totalFrames,"punch frame");
  if(target<state.lastFrame)throw new TypeError("Lyric punch cannot run backward.");
  const entry=state.queue.entries[state.cursor];
  if(!entry)throw new TypeError("No current lyric remains to punch.");

  const anchor=canonicalize({
    lineId:entry.lineId,
    mediaTimeMs:Math.round((target/state.queue.formRef.fps)*1000),
    source:"human-tap",
    anchorVersion:"lyric-anchor/v1",
    origin:"one-pass-punch",
    authority:"human-timing-evidence",
  });
  return deepFreeze(canonicalize({
    ...state,
    cursor:state.cursor+1,
    arrivals:[
      ...state.arrivals,
      arrivalFor(entry,target,state.laneLatch,"human-punch"),
    ],
    humanAnchors:[
      ...state.humanAnchors.filter(existing=>existing.lineId!==entry.lineId),
      anchor,
    ],
    lastFrame:target,
  }));
}

function guideLookahead(state,limit=3){
  assertGuide(state);
  const count=Math.max(1,Math.min(3,Math.floor(Number(limit)||3)));
  return state.queue.entries.slice(state.cursor,state.cursor+count).map(entry=>canonicalize({
    queueIndex:entry.queueIndex,
    lineId:entry.lineId,
    text:entry.text,
    state:entry.state,
    proposedFrame:entry.proposedFrame,
    autoArrival:entry.autoArrival,
  }));
}

module.exports={
  GUIDE_SCHEMA,
  QUEUE_AUTHORITY,
  QUEUE_SCHEMA,
  advanceLyricGuide,
  createLyricGuideState,
  deriveLyricPerformanceQueue,
  guideLookahead,
  punchCurrentLyric,
  setLaneLatch,
  validateQueue,
};
