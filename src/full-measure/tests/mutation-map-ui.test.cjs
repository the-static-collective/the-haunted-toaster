"use strict";
const test=require("node:test");const assert=require("node:assert/strict");
const {JSDOM}=require("jsdom");const fs=require("node:fs");const path=require("node:path");
const {createMutationInspector}=require("../src/renderer/mutation-map.js");
const {specimen}=require("./fixtures/mutation-specimen.cjs");
const {compileFamilyMutations}=require("../src/nextgen/mutation-record.cjs");
const {compileGenerationalEcology}=require("../src/nextgen/generational-ecology.cjs");
function setup(inputs,bridge){
  const html=fs.readFileSync(path.join(__dirname,"../src/renderer/index.html"),"utf8");
  const dom=new JSDOM(html);const {document}=dom.window;
  const inspector=createMutationInspector({document,bridge});
  inspector.update({ecology:compileGenerationalEcology(inputs),receipt:inputs.performanceReceipts[0]});
  return {dom,document,inspector};
}
test("mutation inspector selects performed edges and displays separate unknowns and actual particulars",async()=>{
  const inputs=specimen(c=>{c.placements[0].transform.x+=.1;});
  const calls=[];
  const bridge={measureMutation:async(receipts,paths)=>{calls.push([receipts,paths]);return compileFamilyMutations({...inputs,performanceReceipts:receipts}).map(record=>({record,path:`/${record.mutationRecordHash}.json`}));}};
  const {document,inspector}=setup(inputs,bridge);
  assert.equal(document.getElementById("frankenMeasureMutation").disabled,false);
  await inspector.measure();
  assert.equal(calls.length,1);
  assert.equal(document.querySelectorAll(".franken-mutation-dimension").length,5);
  assert.match(document.getElementById("frankenMutationMap").textContent,/geometry/);
  assert.match(document.getElementById("frankenMutationStatus").textContent,/DISTANCE != VALUE/);
  assert.equal(document.getElementById("frankenFreeze").disabled,true);
  inspector.update({ecology:null,receipt:null});
  assert.equal(document.getElementById("frankenMeasureMutation").disabled,true);
  assert.equal(document.querySelectorAll(".franken-mutation-dimension").length,0);
});
test("unknown counts remain unknown and bridge refusals are visible",async()=>{
  const inputs=specimen();const rows=compileFamilyMutations({...inputs,parentEvidence:[]});
  const {document,inspector}=setup(inputs,{measureMutation:async()=>rows.map(record=>({record,path:"/unknown.json"}))});
  await inspector.measure();
  assert.match(document.getElementById("frankenMutationMap").textContent,/unknown/);
  assert.equal(document.querySelectorAll(".franken-mutation-bar[data-count='0']").length,0);
  const refused=setup(inputs,{measureMutation:async()=>{throw new Error("tampered parent evidence");}});
  await refused.inspector.measure();
  assert.match(refused.document.getElementById("frankenMutationStatus").textContent,/tampered parent evidence/);
  assert.equal(refused.document.getElementById("frankenMeasureMutation").disabled,false);
});
