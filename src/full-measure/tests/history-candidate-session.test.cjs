"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const {sameVideoBinding}=require("../src/candidate-session.cjs");

function binding(historyHash=""){
  const sourceSha256="3".repeat(64),byteLength=1000;
  return {
    schema:"haunted-toaster/video-source/v1",
    specimenId:`sha256:${sourceSha256}:${byteLength}`,
    sourceSha256,
    byteLength,
    path:"/tmp/same.mp4",
    ...(historyHash?{historyRef:{capsuleHash:historyHash,authority:"provenance-only"}}:{}),
  };
}

test("same bytes and same history remain the same candidate source",()=>{
  assert.equal(sameVideoBinding(binding("a".repeat(64)),binding("a".repeat(64))),true);
});

test("same bytes but different history invalidate candidate source identity",()=>{
  assert.equal(sameVideoBinding(binding("a".repeat(64)),binding("b".repeat(64))),false);
});

test("adding or removing history invalidates candidate source identity",()=>{
  assert.equal(sameVideoBinding(binding(),binding("a".repeat(64))),false);
});

test("history-free equality keeps old specimen behavior",()=>{
  assert.equal(sameVideoBinding(binding(),binding()),true);
});
