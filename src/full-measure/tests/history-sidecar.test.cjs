"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs/promises");
const os=require("node:os");
const path=require("node:path");
const crypto=require("node:crypto");
const {freezeFrankenComposition}=require("../src/franken-composer/freeze.cjs");
const {createRenderedHistoryCapsule}=require("../src/nextgen/history-capsule.cjs");
const {
  historySidecarPath,
  readHistorySidecar,
  writeHistorySidecar,
}=require("../src/nextgen/history-sidecar.cjs");

async function specimen(){
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),"ht-history-sidecar-"));
  const videoPath=path.join(dir,"finished.mp4");
  const bytes=Buffer.from("not-real-video-but-stable-test-bytes","utf8");
  await fs.writeFile(videoPath,bytes);
  const sha256=crypto.createHash("sha256").update(bytes).digest("hex");
  const frozen=freezeFrankenComposition({
    schema:"static-collective/franken-composition/v0",
    policy:"franken-composer/v0",
    compositionId:"history-sidecar",
    seed:"history-sidecar",
    fps:24,
    durationFrames:1152,
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
      {sceneId:"ARRIVE",startFrame:0,durationFrames:384,worldRule:"threshold",tracks:[]},
      {sceneId:"CROSS",startFrame:384,durationFrames:384,worldRule:"threshold",tracks:[]},
      {sceneId:"ASSEMBLE",startFrame:768,durationFrames:384,worldRule:"threshold",tracks:[]},
    ],
    transitions:[],
    receipts:{},
  });
  const capsule=createRenderedHistoryCapsule({
    plan:frozen.plan,
    planHash:frozen.planHash,
    projection:{kind:"remotion",projectionHash:"2".repeat(64)},
    renderedMedia:{sha256,byteLength:bytes.length},
    historicalContext:{traceHash:"3".repeat(64)},
  });
  return {dir,videoPath,bytes,sha256,capsule};
}

test("history sidecar writes adjacent to exact finished bytes and reads back verified",async()=>{
  const s=await specimen();
  try{
    const written=await writeHistorySidecar({videoPath:s.videoPath,historyCapsule:s.capsule});
    assert.equal(written.path,historySidecarPath(s.videoPath));
    assert.equal(written.capsuleHash,s.capsule.capsuleHash);
    assert.equal(written.existing,false);

    const read=await readHistorySidecar({videoPath:s.videoPath});
    assert.equal(read.historyCapsule.capsuleHash,s.capsule.capsuleHash);
    assert.equal(read.historyRef.renderedMediaSha256,s.sha256);
  }finally{
    await fs.rm(s.dir,{recursive:true,force:true});
  }
});

test("identical sidecar write is idempotent",async()=>{
  const s=await specimen();
  try{
    await writeHistorySidecar({videoPath:s.videoPath,historyCapsule:s.capsule});
    const again=await writeHistorySidecar({videoPath:s.videoPath,historyCapsule:s.capsule});
    assert.equal(again.existing,true);
  }finally{
    await fs.rm(s.dir,{recursive:true,force:true});
  }
});

test("changed finished bytes invalidate inherited history",async()=>{
  const s=await specimen();
  try{
    await writeHistorySidecar({videoPath:s.videoPath,historyCapsule:s.capsule});
    await fs.writeFile(s.videoPath,Buffer.from("different bytes","utf8"));
    await assert.rejects(()=>readHistorySidecar({videoPath:s.videoPath}),/bytes/i);
  }finally{
    await fs.rm(s.dir,{recursive:true,force:true});
  }
});

test("conflicting pre-existing sidecar refuses overwrite",async()=>{
  const s=await specimen();
  try{
    const sidecar=historySidecarPath(s.videoPath);
    await fs.writeFile(sidecar,JSON.stringify({wrong:true})+"\n","utf8");
    await assert.rejects(
      ()=>writeHistorySidecar({videoPath:s.videoPath,historyCapsule:s.capsule}),
      /refusing overwrite/i,
    );
  }finally{
    await fs.rm(s.dir,{recursive:true,force:true});
  }
});
