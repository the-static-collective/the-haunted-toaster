"use strict";
// Executable deterministic experiment; stdout contains canonical reviewable evidence.
const fs=require("node:fs");
const {canonicalBytes}=require("../src/generation/canonical.cjs");
const {compileFamilyMutations,verifyMutationRecord}=require("../src/nextgen/mutation-record.cjs");
function run(inputs){
  const records=compileFamilyMutations(inputs);
  for(const record of records)verifyMutationRecord(record,inputs);
  return {inputs,records};
}
if(require.main===module){
  const args=process.argv.slice(2);let inputs;
  if(args.length===1&&args[0]==="--specimen"){
    const {specimen}=require("../tests/fixtures/mutation-specimen.cjs");
    const a=specimen(c=>{c.placements[0].transform.x+=.1;});
    const b=specimen(c=>{c.placements[0].startOffsetFrames+=2;c.materials[0].roleId="actor";});
    const c=specimen(c=>{c.materials[0].roleId="actor";});
    inputs={...a,performanceReceipts:[...a.performanceReceipts,...b.performanceReceipts,...c.performanceReceipts]};
  }else if(args.length===2&&args[0]==="--input")inputs=JSON.parse(fs.readFileSync(args[1],"utf8"));
  else throw new Error("Usage: node scripts/mutation-distance.cjs --specimen | --input family-evidence.json");
  process.stdout.write(canonicalBytes(run(inputs)));
}
module.exports={run};
