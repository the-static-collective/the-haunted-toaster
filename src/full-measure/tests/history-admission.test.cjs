"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs/promises");
const os=require("node:os");
const path=require("node:path");
const crypto=require("node:crypto");
const {freezeFrankenComposition}=require("../src/franken-composer/freeze.cjs");
const {createRenderedHistoryCapsule}=require("../src/nextgen/history-capsule.cjs");
const {writeHistorySidecar}=require("../src/nextgen/history-sidecar.cjs");
const {admitVideo}=require("../src/video-pantry/admit.cjs");

async function setup(withSidecar=true){
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),"ht-history-admit-"));
  const videoPath=path.join(dir,"finished.mp4");
  const bytes=Buffer.from("stable recursive compost bytes","utf8");
  await fs.writeFile(videoPath,bytes);
  const sha256=crypto.createHash("sha256").update(bytes).digest("hex");
  let capsule=null;
  if(withSidecar){
    const frozen=freezeFrankenComposition({
      schema:"static-collective/franken-composition/v1",
      policy:"franken-composer/full-song-v1",
      compositionId:"history-admit",
      seed:"history-admit",
      fps:24,
      durationFrames:240,
      ancestry:{},
      materials:[{
        materialId:"text:one",kind:"text",sourceIdentity:"text:one:HELLO",
        digest:"1".repeat(64),rightsBasis:"local-test",admissionBasis:"local-test",
      }],
      scenes:[
        {sceneId:"ARRIVE",startFrame:0,durationFrames:80,worldRule:"threshold",tracks:[]},
        {sceneId:"CROSS",startFrame:80,durationFrames:80,worldRule:"threshold",tracks:[]},
        {sceneId:"ASSEMBLE",startFrame:160,durationFrames:80,worldRule:"threshold",tracks:[]},
      ],
      transitions:[],receipts:{},
    });
    capsule=createRenderedHistoryCapsule({
      plan:frozen.plan,planHash:frozen.planHash,
      projection:{kind:"remotion",projectionHash:"2".repeat(64)},
      renderedMedia:{sha256,byteLength:bytes.length},
      historicalContext:{listeningFieldHash:"3".repeat(64)},
    });
    await writeHistorySidecar({videoPath,historyCapsule:capsule});
  }
  return {dir,videoPath,bytes,capsule};
}

const probeVideoImpl=async()=>({
  durationSeconds:10,width:640,height:360,frameRate:"24/1",
});

test("admission auto-discovers exact-byte history sidecar",async()=>{
  const s=await setup(true);
  try{
    const admitted=await admitVideo(s.videoPath,{persist:false,probeVideoImpl});
    assert.equal(admitted.binding.historyCapsule.capsuleHash,s.capsule.capsuleHash);
    assert.equal(admitted.binding.historyRef.capsuleHash,s.capsule.capsuleHash);
    assert.equal(admitted.binding.historyRef.authority,"provenance-only");
  }finally{await fs.rm(s.dir,{recursive:true,force:true});}
});

test("ordinary history-free video admission remains unchanged",async()=>{
  const s=await setup(false);
  try{
    const admitted=await admitVideo(s.videoPath,{persist:false,probeVideoImpl});
    assert.equal(Object.prototype.hasOwnProperty.call(admitted.binding,"historyCapsule"),false);
    assert.equal(Object.prototype.hasOwnProperty.call(admitted.binding,"historyRef"),false);
  }finally{await fs.rm(s.dir,{recursive:true,force:true});}
});

test("tampered video with stale sidecar is refused instead of stripping history silently",async()=>{
  const s=await setup(true);
  try{
    await fs.writeFile(s.videoPath,Buffer.from("tampered recursive bytes","utf8"));
    await assert.rejects(
      ()=>admitVideo(s.videoPath,{persist:false,probeVideoImpl}),
      /bytes|byte length/i,
    );
  }finally{await fs.rm(s.dir,{recursive:true,force:true});}
});
