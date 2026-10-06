"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const crypto=require("node:crypto");
const fs=require("node:fs/promises");
const os=require("node:os");
const path=require("node:path");
const {canonicalize,hashCanonical}=require("../src/generation/canonical.cjs");
const {decideCandidateArtifact}=require("../src/nextgen/artifact-adoption.cjs");
const {createFrankenComposerService}=require("../src/franken-composer/bridge.cjs");

function sha256(bytes){return crypto.createHash("sha256").update(bytes).digest("hex");}
function graph(){
  const body=canonicalize({
    schema:"static-collective/candidate-derived-frame-graph/v0",
    authority:"review-candidate-only",
    renderer:"ffmpeg-performance-program-witness-raster/v0",
    sourceProgramHash:"a".repeat(64),
    derivedProgramHash:"b".repeat(64),
    sourceWholeReceiptHash:"c".repeat(64),
    sourceScopeProposalHash:"d".repeat(64),
    sourceScopeApprovalHash:"e".repeat(64),
    fps:24,frameCount:2,changedFrameCount:1,
    derivedRegionIds:["region:0"],
    frames:[
      {frame:0,sha256:"1".repeat(64),sizeBytes:100,provenance:"source-world",sourceReceiptHash:"2".repeat(64)},
      {frame:1,sha256:"3".repeat(64),sizeBytes:100,provenance:"derived-world",sourceReceiptHash:"4".repeat(64),sourceRegionId:"region:0"},
    ],
    frameGraphHash:"5".repeat(64),
    laws:["CANDIDATE GRAPH != ADOPTION"],
  });
  return canonicalize({...body,candidateGraphHash:hashCanonical(body,"HauntedToaster-CandidateDerivedFrameGraph-v0")});
}
function review(bytes){
  const g=graph();
  const body=canonicalize({
    schema:"static-collective/candidate-artifact-review-media/v0",
    authority:"review-projection-only",
    candidateGraphHash:g.candidateGraphHash,
    frameGraphHash:g.frameGraphHash,
    frameCount:g.frameCount,
    fps:g.fps,
    mediaSha256:sha256(bytes),
    mediaByteLength:bytes.length,
    laws:["REVIEW MEDIA != ADOPTION"],
  });
  return canonicalize({...body,reviewMediaReceiptHash:hashCanonical(body,"HauntedToaster-CandidateArtifactReviewMedia-v0")});
}
function adopted(bytes){
  const g=graph(),r=review(bytes);
  const d=decideCandidateArtifact(g,{
    decision:"ADOPT",
    expectedCandidateGraphHash:g.candidateGraphHash,
    reviewMediaSha256:r.mediaSha256,
    decidedBy:"human-ui",
  });
  return {g,r,d};
}

test("bridge proposes import only from exact review-media bytes under Franken custody",async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"ht-022-propose-"));
  try{
    const bytes=Buffer.from("adopted-review-media","utf8");
    const {g,r,d}=adopted(bytes);
    const dir=path.join(root,"crossing-reviews","specimen");
    await fs.mkdir(dir,{recursive:true});
    const mediaPath=path.join(dir,"candidate-review.mp4");
    await fs.writeFile(mediaPath,bytes);
    const service=createFrankenComposerService({rootDir:root});
    const result=await service.proposeAdoptedArtifactImport(g,r,d,mediaPath);
    assert.equal(result.proposal.authority,"proposal-only");
    assert.equal(result.proposal.mediaSha256,r.mediaSha256);
    assert.equal(result.mediaPath,mediaPath);
    assert.match(result.mediaUrl,/^file:/);

    await fs.writeFile(mediaPath,Buffer.from("changed","utf8"));
    await assert.rejects(
      ()=>service.proposeAdoptedArtifactImport(g,r,d,mediaPath),
      /bytes|review/i,
    );
  }finally{await fs.rm(root,{recursive:true,force:true});}
});

test("explicit admission creates self-contained exact-byte material package create-only",async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"ht-022-admit-"));
  try{
    const bytes=Buffer.from("adopted-review-media","utf8");
    const {g,r,d}=adopted(bytes);
    const sourceDir=path.join(root,"crossing-reviews","specimen");
    await fs.mkdir(sourceDir,{recursive:true});
    const mediaPath=path.join(sourceDir,"candidate-review.mp4");
    await fs.writeFile(mediaPath,bytes);
    const service=createFrankenComposerService({rootDir:root});
    const proposed=await service.proposeAdoptedArtifactImport(g,r,d,mediaPath);
    const first=await service.admitAdoptedArtifactImport(
      proposed.proposal,proposed.proposal.importProposalHash,mediaPath,
    );
    assert.equal(first.admission.authority,"material-only");
    assert.equal(first.admission.material.digest,r.mediaSha256);
    assert.equal(first.descriptor.materialId,first.admission.material.materialId);
    assert.equal(await fs.readFile(first.materialPath,"utf8"),bytes.toString("utf8"));
    assert.equal(JSON.parse(await fs.readFile(first.admissionPath,"utf8")).admissionHash,first.admission.admissionHash);

    const second=await service.admitAdoptedArtifactImport(
      proposed.proposal,proposed.proposal.importProposalHash,mediaPath,
    );
    assert.equal(second.admission.admissionHash,first.admission.admissionHash);
    assert.equal(second.admissionPath,first.admissionPath);
  }finally{await fs.rm(root,{recursive:true,force:true});}
});

test("media mutation between proposal and admission refuses instead of importing stale bytes",async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"ht-022-stale-media-"));
  try{
    const bytes=Buffer.from("adopted-review-media","utf8");
    const {g,r,d}=adopted(bytes);
    const sourceDir=path.join(root,"crossing-reviews","specimen");
    await fs.mkdir(sourceDir,{recursive:true});
    const mediaPath=path.join(sourceDir,"candidate-review.mp4");
    await fs.writeFile(mediaPath,bytes);
    const service=createFrankenComposerService({rootDir:root});
    const proposed=await service.proposeAdoptedArtifactImport(g,r,d,mediaPath);
    await fs.writeFile(mediaPath,Buffer.from("mutated-after-proposal","utf8"));
    await assert.rejects(
      ()=>service.admitAdoptedArtifactImport(
        proposed.proposal,proposed.proposal.importProposalHash,mediaPath,
      ),
      /bytes changed|media bytes/i,
    );
  }finally{await fs.rm(root,{recursive:true,force:true});}
});

test("adopted review media outside Franken output custody refuses",async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"ht-022-root-"));
  const outside=await fs.mkdtemp(path.join(os.tmpdir(),"ht-022-outside-"));
  try{
    const bytes=Buffer.from("adopted-review-media","utf8");
    const {g,r,d}=adopted(bytes);
    const mediaPath=path.join(outside,"candidate-review.mp4");
    await fs.writeFile(mediaPath,bytes);
    const service=createFrankenComposerService({rootDir:root});
    await assert.rejects(
      ()=>service.proposeAdoptedArtifactImport(g,r,d,mediaPath),
      /custody/i,
    );
  }finally{
    await fs.rm(root,{recursive:true,force:true});
    await fs.rm(outside,{recursive:true,force:true});
  }
});
