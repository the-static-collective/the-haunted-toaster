"use strict";

const path=require("node:path");
const {canonicalize,deepFreeze,hashCanonical}=require("../generation/canonical.cjs");
const {hashFile}=require("../video-pantry/admit.cjs");
const {validatePerformanceProgram}=require("./performance-program.cjs");

const MEDIA_BINDING_SET_SCHEMA="static-collective/performance-program-media-binding-set/v0";
const LOCAL_MEDIA_PATHS_SCHEMA="static-collective/performance-program-local-media-paths/v0";
const SHA256=/^[a-f0-9]{64}$/;

function req(value,label){
  const text=String(value||"").trim();
  if(!text)throw new TypeError(`${label} is required.`);
  return text;
}
function normalizeEntry(entry,index){
  if(!entry||typeof entry!=="object"||Array.isArray(entry))throw new TypeError(`media entry[${index}] must be an object.`);
  const materialId=req(entry.materialId,`media entry[${index}].materialId`);
  const sourceSha256=String(entry.sourceSha256||entry.digest||"").trim().toLowerCase();
  if(!SHA256.test(sourceSha256))throw new TypeError(`media entry[${index}].sourceSha256 must be 64 lowercase hex.`);
  const sourceByteLength=Number(entry.sourceByteLength??entry.byteLength);
  if(!Number.isSafeInteger(sourceByteLength)||sourceByteLength<1)throw new TypeError(`media entry[${index}].sourceByteLength must be a positive integer.`);
  const sourceSpecimenId=req(entry.sourceSpecimenId,`media entry[${index}].sourceSpecimenId`);
  const localPath=req(entry.sourcePath??entry.path,`media entry[${index}].sourcePath`);
  return {
    materialId,
    sourceSpecimenId,
    sourceSha256,
    sourceByteLength,
    sourceIdentity:req(entry.sourceIdentity??`admitted:${sourceSpecimenId}`,`media entry[${index}].sourceIdentity`),
    planHash:entry.planHash?req(entry.planHash,`media entry[${index}].planHash`):null,
    roleId:entry.roleId?req(entry.roleId,`media entry[${index}].roleId`):null,
    digestOperatorId:entry.digestOperatorId?req(entry.digestOperatorId,`media entry[${index}].digestOperatorId`):null,
    samplingPolicyId:entry.samplingPolicyId?req(entry.samplingPolicyId,`media entry[${index}].samplingPolicyId`):null,
    projectionClass:entry.projectionClass?req(entry.projectionClass,`media entry[${index}].projectionClass`):null,
    localPath:path.resolve(localPath),
  };
}
function materialMap(program){
  return new Map((program.materials||[]).map(material=>[material.materialId,material]));
}
function requiredMaterialIds(program){
  return [...new Set((program.timelineActions||[]).map(action=>action.sourceMaterialId))].sort();
}
function createPerformanceProgramMediaBindings(program,{entries=[]}={}){
  const source=validatePerformanceProgram(program);
  if(!Array.isArray(entries))throw new TypeError("Media binding entries must be an array.");
  const normalized=entries.map(normalizeEntry);
  const byMaterial=new Map();
  for(const entry of normalized){
    if(byMaterial.has(entry.materialId))throw new TypeError(`Duplicate media binding for ${entry.materialId}.`);
    byMaterial.set(entry.materialId,entry);
  }
  const materials=materialMap(source);
  const required=requiredMaterialIds(source);
  const witnessBindings=required.map(materialId=>{
    const entry=byMaterial.get(materialId);
    if(!entry)throw new TypeError(`Missing admitted media binding for PerformanceProgram material: ${materialId}.`);
    const programMaterial=materials.get(materialId);
    if(!programMaterial)throw new TypeError(`PerformanceProgram material manifest does not contain ${materialId}.`);
    if(programMaterial.planHash&&entry.planHash&&programMaterial.planHash!==entry.planHash)throw new TypeError(`Media planHash mismatch for ${materialId}.`);
    if(programMaterial.roleId&&entry.roleId&&programMaterial.roleId!==entry.roleId)throw new TypeError(`Media roleId mismatch for ${materialId}.`);
    if(programMaterial.digestOperatorId&&entry.digestOperatorId&&programMaterial.digestOperatorId!==entry.digestOperatorId)throw new TypeError(`Media digest operator mismatch for ${materialId}.`);
    if(programMaterial.samplingPolicyId&&entry.samplingPolicyId&&programMaterial.samplingPolicyId!==entry.samplingPolicyId)throw new TypeError(`Media sampling policy mismatch for ${materialId}.`);
    return canonicalize({
      materialId,
      sourceSpecimenId:entry.sourceSpecimenId,
      sourceSha256:entry.sourceSha256,
      sourceByteLength:entry.sourceByteLength,
      sourceIdentity:entry.sourceIdentity,
      programMaterialHash:hashCanonical(programMaterial,"HauntedToaster-PerformanceProgram-Material-v0"),
      planHash:entry.planHash,
      roleId:entry.roleId,
      digestOperatorId:entry.digestOperatorId,
      samplingPolicyId:entry.samplingPolicyId,
      projectionClass:entry.projectionClass,
    });
  });
  const witnessBody=canonicalize({
    schema:MEDIA_BINDING_SET_SCHEMA,
    authority:"admitted-media-evidence-only",
    programHash:source.programHash,
    requiredMaterialIds:required,
    bindings:witnessBindings,
    laws:[
      "CONTENT IDENTITY != LOCAL PATH",
      "MEDIA BINDING != RENDER AUTHORITY",
      "LOCAL PATH != SOURCE IDENTITY",
      "BYTE REVALIDATION PRECEDES PIXEL USE",
    ],
  });
  const witness=deepFreeze(canonicalize({
    ...witnessBody,
    bindingSetHash:hashCanonical(witnessBody,"HauntedToaster-PerformanceProgram-MediaBindingSet-v0"),
  }));
  const localBody=canonicalize({
    schema:LOCAL_MEDIA_PATHS_SCHEMA,
    authority:"transport-local-only",
    programHash:source.programHash,
    bindingSetHash:witness.bindingSetHash,
    bindings:witnessBindings.map(binding=>({
      materialId:binding.materialId,
      sourceSpecimenId:binding.sourceSpecimenId,
      path:byMaterial.get(binding.materialId).localPath,
    })),
    laws:[
      "LOCAL PATH != SOURCE IDENTITY",
      "PATH TRANSPORT != ADMISSION",
    ],
  });
  const localPaths=deepFreeze(canonicalize({
    ...localBody,
    transportHash:hashCanonical(localBody,"HauntedToaster-PerformanceProgram-LocalMediaPaths-v0"),
  }));
  return deepFreeze({witness,localPaths});
}
function validateMediaBindingSet(program,witness){
  const source=validatePerformanceProgram(program);
  if(!witness||typeof witness!=="object"||Array.isArray(witness))throw new TypeError("Media binding witness must be an object.");
  if(witness.schema!==MEDIA_BINDING_SET_SCHEMA)throw new TypeError("Unsupported media binding witness schema.");
  if(witness.authority!=="admitted-media-evidence-only")throw new TypeError("Media binding witness authority mismatch.");
  if(witness.programHash!==source.programHash)throw new TypeError("Media binding witness program mismatch.");
  if(!Array.isArray(witness.bindings)||!Array.isArray(witness.requiredMaterialIds))throw new TypeError("Media binding witness inventory is malformed.");
  if(JSON.stringify(witness.requiredMaterialIds)!==JSON.stringify(requiredMaterialIds(source)))throw new TypeError("Media binding witness required material set mismatch.");
  const byMaterial=new Map(witness.bindings.map(item=>[item.materialId,item]));
  if(byMaterial.size!==witness.bindings.length)throw new TypeError("Media binding witness contains duplicate material IDs.");
  const materials=materialMap(source);
  for(const materialId of witness.requiredMaterialIds){
    const binding=byMaterial.get(materialId);
    if(!binding)throw new TypeError(`Media binding witness missing ${materialId}.`);
    if(!SHA256.test(String(binding.sourceSha256||"")))throw new TypeError("Media binding witness contains invalid SHA-256.");
    const material=materials.get(materialId);
    if(!material)throw new TypeError("Media binding witness references a missing program material.");
    if(binding.programMaterialHash!==hashCanonical(material,"HauntedToaster-PerformanceProgram-Material-v0"))throw new TypeError(`Media binding witness program material hash mismatch for ${materialId}.`);
  }
  const {bindingSetHash,...body}=witness;
  if(bindingSetHash!==hashCanonical(canonicalize(body),"HauntedToaster-PerformanceProgram-MediaBindingSet-v0"))throw new TypeError("Media binding witness hash mismatch.");
  return witness;
}
function validateLocalMediaPaths(program,witness,localPaths){
  const source=validatePerformanceProgram(program);
  const admitted=validateMediaBindingSet(source,witness);
  if(!localPaths||typeof localPaths!=="object"||Array.isArray(localPaths))throw new TypeError("Local media path transport must be an object.");
  if(localPaths.schema!==LOCAL_MEDIA_PATHS_SCHEMA||localPaths.authority!=="transport-local-only")throw new TypeError("Local media path transport contract mismatch.");
  if(localPaths.programHash!==source.programHash||localPaths.bindingSetHash!==admitted.bindingSetHash)throw new TypeError("Local media path transport lineage mismatch.");
  if(!Array.isArray(localPaths.bindings))throw new TypeError("Local media path transport bindings must be an array.");
  const byMaterial=new Map(localPaths.bindings.map(item=>[item.materialId,item]));
  for(const binding of admitted.bindings){
    const local=byMaterial.get(binding.materialId);
    if(!local||local.sourceSpecimenId!==binding.sourceSpecimenId||typeof local.path!=="string"||!local.path)throw new TypeError(`Local media path transport missing ${binding.materialId}.`);
  }
  const {transportHash,...body}=localPaths;
  if(transportHash!==hashCanonical(canonicalize(body),"HauntedToaster-PerformanceProgram-LocalMediaPaths-v0"))throw new TypeError("Local media path transport hash mismatch.");
  return localPaths;
}
async function revalidateLocalMedia(program,witness,localPaths){
  const source=validatePerformanceProgram(program);
  const admitted=validateMediaBindingSet(source,witness);
  const transport=validateLocalMediaPaths(source,admitted,localPaths);
  const transportByMaterial=new Map(transport.bindings.map(item=>[item.materialId,item]));
  const cache=new Map();
  const verified=[];
  for(const binding of admitted.bindings){
    const local=transportByMaterial.get(binding.materialId);
    const resolved=path.resolve(local.path);
    let observed=cache.get(resolved);
    if(!observed){
      observed=await hashFile(resolved);
      cache.set(resolved,observed);
    }
    if(observed.sha256!==binding.sourceSha256||observed.byteLength!==binding.sourceByteLength)throw new TypeError(`Admitted media bytes changed for ${binding.materialId}.`);
    verified.push(canonicalize({
      materialId:binding.materialId,
      sourceSpecimenId:binding.sourceSpecimenId,
      sourceSha256:binding.sourceSha256,
      sourceByteLength:binding.sourceByteLength,
      path:resolved,
    }));
  }
  return deepFreeze(verified);
}

module.exports={
  LOCAL_MEDIA_PATHS_SCHEMA,
  MEDIA_BINDING_SET_SCHEMA,
  createPerformanceProgramMediaBindings,
  revalidateLocalMedia,
  requiredMaterialIds,
  validateLocalMediaPaths,
  validateMediaBindingSet,
};
