"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const {freezeFrankenComposition}=require("../src/franken-composer/freeze.cjs");
const {
  bindHistoryToVideo,
  createRenderedHistoryCapsule,
  validateRenderedHistoryCapsule,
}=require("../src/nextgen/history-capsule.cjs");

function frozen(){
  return freezeFrankenComposition({
    schema:"static-collective/franken-composition/v1",
    policy:"franken-composer/full-song-v1",
    compositionId:"history-specimen",
    seed:"history-specimen",
    fps:24,
    durationFrames:240,
    ancestry:{},
    materials:[{
      materialId:"text:one",
      kind:"text",
      sourceIdentity:"text:one:HELLO",
      digest:"1".repeat(64),
      rightsBasis:"local-test",
      admissionBasis:"local-test",
    }],
    scenes:[
      {sceneId:"ARRIVE",startFrame:0,durationFrames:80,worldRule:"threshold",tracks:[]},
      {sceneId:"CROSS",startFrame:80,durationFrames:80,worldRule:"threshold",tracks:[]},
      {sceneId:"ASSEMBLE",startFrame:160,durationFrames:80,worldRule:"threshold",tracks:[]},
    ],
    transitions:[],
    receipts:{},
  });
}

function capsule(overrides={}){
  const {plan,planHash}=frozen();
  return createRenderedHistoryCapsule({
    plan,
    planHash,
    projection:{kind:"remotion",projectionHash:"2".repeat(64)},
    renderedMedia:{sha256:"3".repeat(64),byteLength:123456},
    historicalContext:{
      performanceHash:"4".repeat(64),
      traceHash:"5".repeat(64),
      residueMemoryHash:"6".repeat(64),
      listeningFieldHash:"7".repeat(64),
      fullSongFormHash:"8".repeat(64),
      admittedSongSha256:"9".repeat(64),
    },
    ...overrides,
  });
}

test("rendered history capsule binds exact output bytes to exact render authority",()=>{
  const value=capsule();
  assert.equal(value.authority,"provenance-only");
  assert.equal(value.renderedMedia.sha256,"3".repeat(64));
  assert.equal(value.renderAuthority.planHash,frozen().planHash);
  assert.equal(value.renderAuthority.projectionHash,"2".repeat(64));
  assert.equal(value.historicalContext.traceHash,"5".repeat(64));
  assert.match(value.capsuleHash,/^[a-f0-9]{64}$/);
  assert.equal(validateRenderedHistoryCapsule(value).capsuleHash,value.capsuleHash);
});

test("same rendered bytes can carry different lawful history identities",()=>{
  const a=capsule();
  const b=capsule({historicalContext:{
    performanceHash:"a".repeat(64),
    traceHash:"b".repeat(64),
    residueMemoryHash:"c".repeat(64),
    listeningFieldHash:"d".repeat(64),
    fullSongFormHash:"e".repeat(64),
    admittedSongSha256:"f".repeat(64),
  }});
  assert.equal(a.renderedMedia.sha256,b.renderedMedia.sha256);
  assert.notEqual(a.capsuleHash,b.capsuleHash);
});

test("proposal-only context remains explicitly non-causal render history",()=>{
  const value=capsule();
  assert.equal(value.historicalContext.authority,"context-reference-only");
  assert.equal(value.renderAuthority.authority,"render-cause-reference");
  assert.ok(value.laws.includes("SURROUNDING HISTORY != RENDER CAUSE"));
});

test("recursive history increments generation and retains parent capsule refs",()=>{
  const parent=capsule();
  const child=capsule({
    renderedMedia:{sha256:"a".repeat(64),byteLength:222},
    parents:[{capsuleHash:parent.capsuleHash,generation:parent.generation}],
  });
  assert.equal(parent.generation,1);
  assert.equal(child.generation,2);
  assert.deepEqual(child.parents,[{capsuleHash:parent.capsuleHash,generation:1}]);
});

test("history binds to admitted video only when exact bytes match",()=>{
  const value=capsule();
  const ref=bindHistoryToVideo({historyCapsule:value,sourceSha256:"3".repeat(64)});
  assert.equal(ref.capsuleHash,value.capsuleHash);
  assert.equal(ref.generation,1);
  assert.equal(ref.authority,"provenance-only");
  assert.throws(
    ()=>bindHistoryToVideo({historyCapsule:value,sourceSha256:"0".repeat(64)}),
    /bytes/i,
  );
});

test("capsule refuses mutated frozen plan identity",()=>{
  const value=frozen();
  assert.throws(
    ()=>createRenderedHistoryCapsule({
      plan:value.plan,
      planHash:"0".repeat(64),
      projection:{kind:"remotion",projectionHash:"2".repeat(64)},
      renderedMedia:{sha256:"3".repeat(64)},
    }),
    /plan/i,
  );
});
