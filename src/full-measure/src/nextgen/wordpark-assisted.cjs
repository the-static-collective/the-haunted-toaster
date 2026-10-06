"use strict";

const {
  createWordparkSession,
  dropLyricFromGuide,
  sealWordparkPacket,
  stepWordpark,
}=require("./wordpark.cjs");
const {
  advanceLyricGuide,
  createLyricGuideState,
  deriveLyricPerformanceQueue,
  guideLookahead,
  punchCurrentLyric,
  setLaneLatch,
}=require("./lyric-performance-queue.cjs");

const ASSISTED_SCHEMA="static-collective/wordpark-assisted-session/v0";

function assertAssisted(session){
  if(!session||session.schema!==ASSISTED_SCHEMA||session.authority!=="performance-state"){
    throw new TypeError("Expected assisted WORDPARK session.");
  }
  return session;
}

function materializeGuideArrivals(session){
  assertAssisted(session);
  let wordpark=session.wordpark;
  let applied=session.appliedArrivalCount;
  while(applied<session.guide.arrivals.length){
    const arrival=session.guide.arrivals[applied];
    const entry=session.guide.queue.entries[arrival.queueIndex];
    if(!entry||entry.lineId!==arrival.lineId){
      throw new TypeError("Assisted WORDPARK arrival no longer matches its queue.");
    }
    wordpark=dropLyricFromGuide(wordpark,{entry,arrival});
    applied+=1;
  }
  return {
    ...session,
    wordpark,
    appliedArrivalCount:applied,
  };
}

function createAssistedWordparkSession({
  fullSongForm,
  listeningField,
  alignment,
  ball,
  initialLane="OPEN",
}={}){
  const queue=deriveLyricPerformanceQueue({
    fullSongForm,
    listeningField,
    alignment,
  });
  return {
    schema:ASSISTED_SCHEMA,
    authority:"performance-state",
    queueHash:queue.queueHash,
    wordpark:createWordparkSession({fullSongForm,listeningField,ball}),
    guide:createLyricGuideState({queue,initialLane}),
    appliedArrivalCount:0,
  };
}

function setAssistedLane(session,{moodLane,frame}={}){
  assertAssisted(session);
  return {
    ...session,
    guide:setLaneLatch(session.guide,moodLane,frame),
  };
}

function advanceAssistedWordpark(session,{
  frame,
  steerX=0,
  steerY=0,
  dt=1/24,
}={}){
  assertAssisted(session);
  let next={
    ...session,
    guide:advanceLyricGuide(session.guide,frame),
  };
  next=materializeGuideArrivals(next);
  return {
    ...next,
    wordpark:stepWordpark(next.wordpark,{frame,steerX,steerY,dt}),
  };
}

function punchAssistedLyric(session,{frame}={}){
  assertAssisted(session);
  let next={
    ...session,
    guide:punchCurrentLyric(session.guide,{frame}),
  };
  next=materializeGuideArrivals(next);
  return next;
}

function assistedLookahead(session){
  assertAssisted(session);
  return guideLookahead(session.guide,3);
}

function sealAssistedWordpark(session){
  assertAssisted(session);
  const packet=sealWordparkPacket(session.wordpark);
  return {
    packet,
    guide:{
      queueHash:session.guide.queueHash,
      laneChanges:session.guide.laneChanges,
      arrivals:session.guide.arrivals,
      misses:session.guide.misses,
      humanAnchors:session.guide.humanAnchors,
      unresolved:session.guide.queue.entries.slice(session.guide.cursor).map(entry=>({
        queueIndex:entry.queueIndex,
        lineId:entry.lineId,
        state:entry.state,
        proposedFrame:entry.proposedFrame,
      })),
    },
  };
}

module.exports={
  ASSISTED_SCHEMA,
  advanceAssistedWordpark,
  assistedLookahead,
  createAssistedWordparkSession,
  materializeGuideArrivals,
  punchAssistedLyric,
  sealAssistedWordpark,
  setAssistedLane,
};
