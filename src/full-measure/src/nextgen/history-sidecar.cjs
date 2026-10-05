"use strict";

const fs=require("node:fs/promises");
const path=require("node:path");
const crypto=require("node:crypto");
const {canonicalBytes}=require("../generation/canonical.cjs");
const {
  bindHistoryToVideo,
  validateRenderedHistoryCapsule,
}=require("./history-capsule.cjs");

function historySidecarPath(videoPath){
  const raw=String(videoPath||"").trim();
  if(!raw)throw new TypeError("videoPath is required.");
  const resolved=path.resolve(raw);
  return `${resolved}.history.json`;
}

async function fileSha256(filePath){
  const bytes=await fs.readFile(filePath);
  return {
    bytes,
    sha256:crypto.createHash("sha256").update(bytes).digest("hex"),
  };
}

async function writeHistorySidecar({videoPath,historyCapsule}={}){
  const raw=String(videoPath||"").trim();
  if(!raw)throw new TypeError("videoPath is required.");
  const resolved=path.resolve(raw);
  const capsule=validateRenderedHistoryCapsule(historyCapsule);
  const file=await fileSha256(resolved);
  bindHistoryToVideo({historyCapsule:capsule,sourceSha256:file.sha256});
  if(capsule.renderedMedia.byteLength!==undefined&&capsule.renderedMedia.byteLength!==file.bytes.length){
    throw new TypeError("History capsule byte length does not match the finished video bytes.");
  }
  const sidecar=historySidecarPath(resolved);
  const bytes=canonicalBytes(capsule);
  try{
    await fs.writeFile(sidecar,bytes,{flag:"wx"});
    return {
      path:sidecar,
      capsuleHash:capsule.capsuleHash,
      existing:false,
    };
  }catch(error){
    if(error?.code!=="EEXIST")throw error;
    const existing=await fs.readFile(sidecar);
    if(!existing.equals(bytes))throw new Error("History sidecar already exists with different bytes; refusing overwrite.");
    return {
      path:sidecar,
      capsuleHash:capsule.capsuleHash,
      existing:true,
    };
  }
}

async function readHistorySidecar({videoPath}={}){
  const raw=String(videoPath||"").trim();
  if(!raw)throw new TypeError("videoPath is required.");
  const resolved=path.resolve(raw);
  const sidecar=historySidecarPath(resolved);
  const [file,raw]=await Promise.all([
    fileSha256(resolved),
    fs.readFile(sidecar,"utf8"),
  ]);
  let parsed;
  try{
    parsed=JSON.parse(raw);
  }catch(error){
    throw new TypeError(`History sidecar is not valid JSON: ${error?.message||error}`);
  }
  const capsule=validateRenderedHistoryCapsule(parsed);
  if(capsule.renderedMedia.byteLength!==undefined&&capsule.renderedMedia.byteLength!==file.bytes.length){
    throw new TypeError("History capsule byte length does not match the admitted video bytes.");
  }
  const historyRef=bindHistoryToVideo({
    historyCapsule:capsule,
    sourceSha256:file.sha256,
  });
  return {
    path:sidecar,
    historyCapsule:capsule,
    historyRef,
  };
}

module.exports={
  historySidecarPath,
  readHistorySidecar,
  writeHistorySidecar,
};
