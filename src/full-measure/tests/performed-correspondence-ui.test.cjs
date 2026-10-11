"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {JSDOM}=require("jsdom");
const fs=require("node:fs");
const path=require("node:path");
const {createCorrespondenceBench}=require("../src/renderer/performed-correspondence-ui.js");

const parent={
  performanceHash:"a".repeat(64),
  placements:[{id:"p0",materialId:"guitar",lane:0,sceneId:"ARRIVE"},{id:"p1",materialId:"rain",lane:1,sceneId:"CROSS"}],
};
const child={
  performanceHash:"b".repeat(64),
  placements:[
    {placementId:"c0",materialId:"guitar",lane:0,sceneId:"ARRIVE"},
    {placementId:"c1",materialId:"guitar",lane:1,sceneId:"CROSS"},
    {placementId:"c2",materialId:"rain",lane:2,sceneId:"ASSEMBLE"},
  ],
};
function setup(override={}){
  const html=fs.readFileSync(path.join(__dirname,"../src/renderer/index.html"),"utf8");
  const document=new JSDOM(html).window.document;
  const calls=[];
  const bridge={
    chooseCorrespondenceParent:async()=>"/parent.one-pass.json",
    inspectCorrespondenceParent:async()=>parent,
    sealPerformedCorrespondence:async(...args)=>{
      calls.push(args);
      return {path:"/custody/record.json",record:{correspondenceSha256:"c".repeat(64)}};
    },
    verifyPerformedCorrespondence:async()=>true,
    ...override,
  };
  const bench=createCorrespondenceBench({document,bridge});
  bench.update({receipt:child});
  return {bench,document,calls};
}
function check(document,side,ids){
  for(const id of ids){
    const root=document.getElementById("frankenCorrespondence"+(side==="parent"?"Parent":"Child")+"Placements");
    const box=Array.from(root.querySelectorAll("input[type=checkbox]")).find(x=>x.value===id);
    assert.ok(box,"missing "+id);
    box.click();
  }
}
test("human stages split across sealed performed endpoints, then records and independently verifies",async()=>{
  const {bench,document,calls}=setup();
  await bench.load();
  document.getElementById("frankenCorrespondenceKind").value="split";
  document.getElementById("frankenCorrespondenceAttestation").value="operator observed exact handoff";
  check(document,"parent",["p0"]);
  check(document,"child",["c0","c1"]);
  assert.equal(bench.stage(),true);
  assert.deepEqual(bench.state().claims,[{
    kind:"split",from:["p0"],to:["c0","c1"],attestationId:"operator observed exact handoff",
  }]);
  assert.equal(document.getElementById("frankenCorrespondenceSeal").disabled,false);
  await bench.seal();
  assert.equal(calls.length,1);
  assert.equal(calls[0][0],"/parent.one-pass.json");
  assert.equal(calls[0][1],child);
  assert.equal(calls[0][3],parent.performanceHash);
  assert.equal(bench.state().saved.record.correspondenceSha256,"c".repeat(64));
  await bench.verify();
  assert.equal(bench.state().verified,true);
  assert.match(document.getElementById("frankenCorrespondenceStatus").textContent,/JOIN != REUNION/);
  assert.equal(document.getElementById("frankenFreeze").disabled,true);
});
test("join is a distinct manual choice; never inferred from material identity",async()=>{
  const {bench,document}=setup();
  await bench.load();
  assert.equal(bench.state().claims.length,0);
  document.getElementById("frankenCorrespondenceKind").value="join";
  document.getElementById("frankenCorrespondenceAttestation").value="joined independently";
  check(document,"parent",["p0","p1"]);
  check(document,"child",["c2"]);
  assert.equal(bench.stage(),true);
  assert.equal(bench.state().claims[0].kind,"join");
  assert.equal(document.getElementById("frankenCorrespondenceStaged").textContent.includes("REUNION"),false);
});
test("no staged relation without explicit typed attestation or correct arity",async()=>{
  const {bench,document}=setup();await bench.load();
  document.getElementById("frankenCorrespondenceKind").value="split";
  check(document,"parent",["p0"]);check(document,"child",["c0"]);
  assert.equal(bench.stage(),false);
  assert.match(document.getElementById("frankenCorrespondenceStatus").textContent,/requires/);
  check(document,"child",["c1"]);
  assert.equal(bench.stage(),false);
  assert.match(document.getElementById("frankenCorrespondenceStatus").textContent,/attestation/);
});
test("a new performance revokes staged and recorded claims, refusing stale record authority",async()=>{
  const {bench,document}=setup();await bench.load();
  document.getElementById("frankenCorrespondenceKind").value="release";
  document.getElementById("frankenCorrespondenceAttestation").value="visible exit";
  check(document,"parent",["p1"]);assert.equal(bench.stage(),true);
  await bench.seal();assert.ok(bench.state().saved);
  bench.update({receipt:{...child,performanceHash:"d".repeat(64)}});
  assert.equal(bench.state().saved,null);
  assert.deepEqual(bench.state().claims,[]);
  assert.equal(document.getElementById("frankenCorrespondenceVerify").disabled,true);
  bench.update({receipt:null});
  assert.equal(document.getElementById("frankenCorrespondenceSeal").disabled,true);
});
test("explicit bridge refusal stays visible, cannot claim verification",async()=>{
  const {bench,document}=setup({sealPerformedCorrespondence:async()=>{throw Error("source receipt changed");}});
  await bench.load();
  document.getElementById("frankenCorrespondenceKind").value="emerge";
  document.getElementById("frankenCorrespondenceAttestation").value="first appearance";
  check(document,"child",["c2"]);
  assert.equal(bench.stage(),true);
  await bench.seal();
  assert.equal(bench.state().saved,null);
  assert.match(document.getElementById("frankenCorrespondenceStatus").textContent,/source receipt changed/);
});
