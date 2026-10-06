"use strict";

const {
  advanceAssistedWordpark,
  assistedLookahead,
  createAssistedWordparkSession,
  punchAssistedLyric,
  sealAssistedWordpark,
  setAssistedLane,
}=require("./wordpark-assisted.cjs");

function clone(value){
  return value==null?value:structuredClone(value);
}

function snapshotFor(session){
  if(!session)return {
    schema:"static-collective/wordpark-play-snapshot/v0",
    active:false,
  };
  const guide=session.guide;
  const wordpark=session.wordpark;
  return {
    schema:"static-collective/wordpark-play-snapshot/v0",
    active:true,
    authority:"view-snapshot-only",
    queueHash:guide.queueHash,
    totalFrames:guide.queue.formRef.totalFrames,
    fps:guide.queue.formRef.fps,
    frame:guide.lastFrame,
    laneLatch:guide.laneLatch,
    cursor:guide.cursor,
    lookahead:assistedLookahead(session),
    ball:clone(wordpark.ball),
    wordObjects:clone(wordpark.wordObjects),
    arrivalCount:guide.arrivals.length,
    missCount:guide.misses.length,
    humanAnchorCount:guide.humanAnchors.length,
    misses:clone(guide.misses.slice(-8)),
  };
}

function createAssistedWordparkRuntime(){
  let session=null;
  let sealed=null;

  return {
    start(input={}){
      session=createAssistedWordparkSession(input);
      sealed=null;
      return snapshotFor(session);
    },
    setLane({moodLane,frame}={}){
      if(!session)throw new TypeError("Start WORDPARK before changing lanes.");
      session=setAssistedLane(session,{moodLane,frame});
      return snapshotFor(session);
    },
    advanceTo({frame,steerX=0,steerY=0}={}){
      if(!session)throw new TypeError("Start WORDPARK before advancing.");
      const target=Math.round(Number(frame));
      if(!Number.isFinite(target))throw new TypeError("WORDPARK target frame must be finite.");
      if(target<session.guide.lastFrame)throw new TypeError("WORDPARK audio clock cannot run backward.");
      const last=Math.min(target,session.guide.queue.formRef.totalFrames-1);
      const fps=session.guide.queue.formRef.fps;
      for(let current=session.guide.lastFrame+1;current<=last;current++){
        session=advanceAssistedWordpark(session,{
          frame:current,
          steerX,
          steerY,
          dt:1/fps,
        });
      }
      return snapshotFor(session);
    },
    punch({frame}={}){
      if(!session)throw new TypeError("Start WORDPARK before punching lyrics.");
      session=punchAssistedLyric(session,{frame});
      return snapshotFor(session);
    },
    snapshot(){
      return snapshotFor(session);
    },
    seal(){
      if(!session)throw new TypeError("Start WORDPARK before sealing.");
      sealed=sealAssistedWordpark(session);
      return clone(sealed);
    },
    reset(){
      session=null;
      sealed=null;
      return snapshotFor(null);
    },
  };
}

module.exports={
  createAssistedWordparkRuntime,
  snapshotFor,
};
