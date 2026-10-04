"use strict";
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");
const {canonicalStringify,canonicalize,deepFreeze}=require("../../generation/canonical.cjs");
const ACCEPTANCE_SCHEMA="haunted-blender/accepted-creative-take/v0";
const RECEIPT_SCHEMA="haunted-blender/creative-claw-take-receipt/v0";
const SHA=/^[a-f0-9]{64}$/;
function sha(bytes){return crypto.createHash("sha256").update(bytes).digest("hex");}
function requireSha(v,label){const x=String(v||"").toLowerCase();if(!SHA.test(x))throw new TypeError(`${label} must be SHA-256.`);return x;}
function adaptAcceptedBlenderTake({acceptance,acceptancePath,admissionReceipt,videoPath}={}){
 if(!acceptance||acceptance.schema!==ACCEPTANCE_SCHEMA||acceptance.status!=="filmmaker_accepted_private_preview")throw new TypeError("Blender take must be explicitly filmmaker accepted for private preview.");
 if(!admissionReceipt||admissionReceipt.schema!==RECEIPT_SCHEMA||admissionReceipt.status!=="candidate_admitted_not_filmmaker_accepted")throw new TypeError("Blender admission receipt is missing or has the wrong status.");
 if(typeof acceptancePath!=="string"||!acceptancePath.trim())throw new TypeError("Blender acceptance path is required.");
 const acceptanceResolved=path.resolve(acceptancePath);
 const acceptanceCanonical=canonicalStringify(acceptance);
 const acceptanceSha=sha(Buffer.from(acceptanceCanonical,"utf8"));
 if(path.basename(acceptanceResolved)!==acceptanceSha+".json")throw new TypeError("Blender acceptance content-addressed identity does not match its filename.");
 const acceptanceBytes=fs.readFileSync(acceptanceResolved);
 if(!acceptanceBytes.equals(Buffer.from(acceptanceCanonical+"\n","utf8")))throw new TypeError("Blender acceptance artifact bytes changed after acceptance.");
 if(typeof videoPath!=="string"||!videoPath.trim())throw new TypeError("Blender video path is required.");
 const resolved=path.resolve(videoPath);
 const stat=fs.statSync(resolved);
 if(!stat.isFile()||path.extname(resolved).toLowerCase()!==".mp4")throw new TypeError("Accepted Blender material must be a local MP4 file.");
 const observedVideoSha=sha(fs.readFileSync(resolved));
 const acceptedVideoSha=requireSha(acceptance.video_sha256,"Blender acceptance video digest");
 if(observedVideoSha!==acceptedVideoSha||requireSha(admissionReceipt.output_sha256,"Blender admission video digest")!==acceptedVideoSha)throw new TypeError("Blender video digest changed after acceptance.");
 const receiptDigest=sha(Buffer.from(canonicalStringify(admissionReceipt)+"\n","utf8"));
 if(receiptDigest!==requireSha(acceptance.admission_receipt_sha256,"Blender admission receipt digest"))throw new TypeError("Blender admission receipt digest changed after acceptance.");
 for(const key of ["request_sha256","artifact_sha256"]){if(requireSha(acceptance[key],`acceptance ${key}`)!==requireSha(admissionReceipt[key],`admission ${key}`))throw new TypeError(`Blender ${key} lineage mismatch.`);}
 if(acceptance.beat!==admissionReceipt.beat||!Number.isInteger(acceptance.beat)||acceptance.beat<0)throw new TypeError("Blender beat lineage mismatch.");
 if(acceptance.distribution_authorized!==false||admissionReceipt.distribution_authorized!==false)throw new TypeError("Blender private preview does not authorize distribution.");
 const ancestry={acceptanceSchema:ACCEPTANCE_SCHEMA,acceptanceSha256:acceptanceSha,admissionReceiptSchema:RECEIPT_SCHEMA,requestSha256:acceptance.request_sha256,artifactSha256:acceptance.artifact_sha256,admissionReceiptSha256:receiptDigest,beat:acceptance.beat,authority:"filmmaker-accepted-private-preview-only"};
 const material={materialId:`blender-take:${acceptedVideoSha.slice(0,16)}`,kind:"video",sourceIdentity:`sha256:${acceptedVideoSha}:${stat.size}`,digest:acceptedVideoSha,byteLength:stat.size,rightsBasis:"private-preview-no-distribution",admissionBasis:"filmmaker_accepted_private_preview",distributionAuthorized:false,sourcePath:resolved};
 return deepFreeze(canonicalize({authority:"material-only",ancestry,material,nonclaims:["Acceptance is not release or publication authorization","Accepted motion is not proof of a real-world event"]}));
}
module.exports={adaptAcceptedBlenderTake};
