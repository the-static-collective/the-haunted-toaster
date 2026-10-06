"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const {
  beginOnePass,createOnePassSession,finishOnePass,pressLane,releaseLane,
}=require("../src/renderer/one-pass.js");
const {compilePerformanceProgram}=require("../src/nextgen/performance-program.cjs");
const {compileResidueTerrain}=require("../src/nextgen/playable-terrain.cjs");
const {
  acceptPossibilityCrossing,
  createPossibilityCrossingProposal,
  validatePossibilityCrossingBinding,
  validatePossibilityCrossingProposal,
}=require("../src/nextgen/possibility-interaction.cjs");

const materials=Array.from({length:6},(_,index)=>({
  slot:index+1,roleId:`lane-${index+1}`,
  materialId:`video-digest:lane-${index+1}:${String(index+1).repeat(12)}`,
  sourceDurationFrames:120,
}));

function map(){
  let session=createOnePassSession({materials,fps:24,totalFrames:192});
  session=beginOnePass(session,0);
  session=pressLane(session,0,300);
  session=releaseLane(session,0,1600);
  const program=compilePerformanceProgram(finishOnePass(session,8000).receipt,{decayPerFrame:.002});
  return compileResidueTerrain(program,{maxSamples:32}).maps[0].map;
}

test("clicking an exact sampled map point creates a proposal, not an edit",()=>{
  const m=map();
  const point=m.points[Math.floor(m.points.length/2)];
  const proposal=createPossibilityCrossingProposal(m,{frame:point.frame});
  assert.equal(proposal.schema,"static-collective/possibility-crossing-proposal/v0");
  assert.equal(proposal.authority,"proposal-only");
  assert.equal(proposal.sourceMapHash,m.mapHash);
  assert.equal(proposal.frame,point.frame);
  assert.equal(proposal.transitionHash,point.transitionHash);
  assert.equal(proposal.energy,point.energy);
  assert.deepEqual(proposal.contributions,point.contributions);
  assert.match(proposal.proposalHash,/^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(proposal).includes("execution"),false);
  validatePossibilityCrossingProposal(proposal);
});

test("proposal refuses unsampled frames",()=>{
  const m=map();
  const sampled=new Set(m.points.map(point=>point.frame));
  let frame=1;
  while(sampled.has(frame))frame+=1;
  assert.throws(()=>createPossibilityCrossingProposal(m,{frame}),/sampled/i);
});

test("explicit ACCEPT binds exact proposal identity but grants no execution authority",()=>{
  const m=map();
  const proposal=createPossibilityCrossingProposal(m,{frame:m.points[0].frame});
  const binding=acceptPossibilityCrossing(proposal,{
    expectedProposalHash:proposal.proposalHash,
    acceptedBy:"human-ui",
  });
  assert.equal(binding.schema,"static-collective/possibility-crossing-binding/v0");
  assert.equal(binding.authority,"human-accepted-relation-only");
  assert.equal(binding.sourceProposalHash,proposal.proposalHash);
  assert.equal(binding.sourceMapHash,m.mapHash);
  assert.equal(binding.frame,proposal.frame);
  assert.equal(binding.transitionHash,proposal.transitionHash);
  assert.equal(binding.acceptedBy,"human-ui");
  assert.ok(binding.laws.includes("ACCEPTANCE != EXECUTION"));
  assert.ok(binding.laws.includes("BINDING != FREEZE"));
  validatePossibilityCrossingBinding(binding);
});

test("ACCEPT refuses stale proposal identity",()=>{
  const m=map();
  const proposal=createPossibilityCrossingProposal(m,{frame:m.points[0].frame});
  assert.throws(()=>acceptPossibilityCrossing(proposal,{
    expectedProposalHash:"0".repeat(64),
    acceptedBy:"human-ui",
  }),/stale|proposal/i);
});

test("tampered proposal and binding hashes refuse",()=>{
  const m=map();
  const proposal=createPossibilityCrossingProposal(m,{frame:m.points[0].frame});
  assert.throws(()=>validatePossibilityCrossingProposal({...proposal,energy:.123}),/hash/i);
  const binding=acceptPossibilityCrossing(proposal,{
    expectedProposalHash:proposal.proposalHash,
    acceptedBy:"human-ui",
  });
  assert.throws(()=>validatePossibilityCrossingBinding({...binding,frame:binding.frame+1}),/hash/i);
});
