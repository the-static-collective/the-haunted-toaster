"use strict";

const {canonicalize,deepFreeze,hashCanonical}=require("../generation/canonical.cjs");
const {validatePerformanceReceipt}=require("./performance-trace.cjs");
const {validateAdoptedMaterialAdmission}=require("./adopted-artifact-promotion.cjs");

const GENERATIONAL_ECOLOGY_SCHEMA="static-collective/generational-ecology/v0";
const GENERATIONAL_ECOLOGY_POLICY="performed-history-kinship/v0";
const SHA=/^[a-f0-9]{64}$/;
const SCENE_ORDER=new Map([["ARRIVE",0],["CROSS",1],["ASSEMBLE",2]]);

function req(value,label){
  const text=String(value||"").trim();
  if(!text)throw new TypeError(`${label} is required.`);
  return text;
}
function hash64(value,label){
  const text=req(value,label).toLowerCase();
  if(!SHA.test(text))throw new TypeError(`${label} must be 64 lowercase hex characters.`);
  return text;
}
function whole(value,label,min=0,max=1_000_000){
  const number=Number(value);
  if(!Number.isSafeInteger(number)||number<min||number>max)throw new TypeError(`${label} must be an integer in [${min}, ${max}].`);
  return number;
}
function array(value,label,max){
  if(!Array.isArray(value)||value.length>max)throw new TypeError(`${label} must be an array of at most ${max} items.`);
  return value;
}
function historyNodeFromRef(ref){
  return canonicalize({
    nodeId:`history:${hash64(ref.capsuleHash,"history capsuleHash")}`,
    kind:"rendered-history-capsule",
    authority:"provenance-only",
    capsuleHash:ref.capsuleHash,
    generation:whole(ref.generation,"history generation",1,1_000_000),
    renderedMediaSha256:hash64(ref.renderedMediaSha256,"history renderedMediaSha256"),
    parentCapsuleHashes:array(ref.parentCapsuleHashes||[],"history parentCapsuleHashes",32)
      .map((value,index)=>hash64(value,`history parentCapsuleHashes[${index}]`))
      .sort(),
  });
}
function mergeHistoryNode(nodes,node){
  const existing=nodes.get(node.capsuleHash);
  if(!existing){
    nodes.set(node.capsuleHash,node);
    return;
  }
  if(existing.kind==="history-parent-reference"){
    nodes.set(node.capsuleHash,node);
    return;
  }
  if(
    existing.generation!==node.generation||
    existing.renderedMediaSha256!==node.renderedMediaSha256||
    JSON.stringify(existing.parentCapsuleHashes)!==JSON.stringify(node.parentCapsuleHashes)
  )throw new TypeError(`Conflicting explicit history evidence for capsule ${node.capsuleHash}.`);
}
function placementEvidence(receipt,materialIds){
  const ids=new Set(materialIds);
  const placements=(receipt.placements||[]).filter(placement=>ids.has(placement.materialId));
  const sceneIds=[...new Set(placements.map(placement=>req(placement.sceneId,"placement sceneId")))]
    .sort((a,b)=>(SCENE_ORDER.get(a)??99)-(SCENE_ORDER.get(b)??99)||a.localeCompare(b));
  return canonicalize({
    materialIds:[...ids].sort(),
    placementIds:placements.map(placement=>req(placement.placementId,"placementId")).sort(),
    placementCount:placements.length,
    sceneIds,
    usedFrameCount:placements.reduce((sum,placement)=>sum+whole(placement.durationFrames,"placement durationFrames",1,1_000_000),0),
  });
}
function compileGenerationalEcology({
  performanceReceipts=[],
  artifactAdmissions=[],
}={}){
  const receipts=array(performanceReceipts,"performanceReceipts",32).map(validatePerformanceReceipt);
  const admissions=array(artifactAdmissions,"artifactAdmissions",64).map(validateAdoptedMaterialAdmission);

  const historyNodes=new Map();
  const performanceRows=[];
  const edgeMap=new Map();
  const fossilMap=new Map();
  const childrenByParent=new Map();

  for(const receipt of [...receipts].sort((a,b)=>a.performanceHash.localeCompare(b.performanceHash))){
    const usedMaterialIds=new Set((receipt.placements||[]).map(placement=>placement.materialId));
    const directByCapsule=new Map();

    for(const material of receipt.materials||[]){
      if(!usedMaterialIds.has(material.materialId)||!material.historyRef)continue;
      const ref=material.historyRef;
      const node=historyNodeFromRef(ref);
      mergeHistoryNode(historyNodes,node);
      if(!directByCapsule.has(node.capsuleHash))directByCapsule.set(node.capsuleHash,{ref,materialIds:[]});
      directByCapsule.get(node.capsuleHash).materialIds.push(material.materialId);

      for(const parentHash of node.parentCapsuleHashes){
        if(!historyNodes.has(parentHash)){
          historyNodes.set(parentHash,canonicalize({
            nodeId:`history:${parentHash}`,
            kind:"history-parent-reference",
            authority:"reference-only",
            capsuleHash:parentHash,
            generation:null,
            renderedMediaSha256:null,
            parentCapsuleHashes:[],
          }));
        }
        const edgeKey=`declared:${parentHash}:${node.capsuleHash}`;
        if(!edgeMap.has(edgeKey))edgeMap.set(edgeKey,canonicalize({
          edgeId:edgeKey,
          kind:"declared-history-parent",
          authority:"reference-only",
          fromNodeId:`history:${parentHash}`,
          toNodeId:node.nodeId,
          evidenceBasis:"explicit-parentCapsuleHashes",
        }));
      }

      if(ref.lawFossilRef){
        const fossil=ref.lawFossilRef;
        const fossilHash=hash64(fossil.lawFossilHash,"lawFossilHash");
        const sourceCapsuleHashes=new Set(fossilMap.get(fossilHash)?.sourceCapsuleHashes||[]);
        sourceCapsuleHashes.add(node.capsuleHash);
        fossilMap.set(fossilHash,canonicalize({
          lawFossilHash:fossilHash,
          authority:"provenance-only",
          weirdnessCompilationHash:hash64(fossil.weirdnessCompilationHash,"weirdnessCompilationHash"),
          sourceProgramHash:hash64(fossil.sourceProgramHash,"law fossil sourceProgramHash"),
          compiledProgramHash:hash64(fossil.compiledProgramHash,"law fossil compiledProgramHash"),
          axes:array(fossil.axes,"law fossil axes",16).map(axis=>canonicalize({
            axisId:req(axis.axisId,"law fossil axisId"),
            amount:Number(axis.amount),
          })).sort((a,b)=>a.axisId.localeCompare(b.axisId)),
          sourceCapsuleHashes:[...sourceCapsuleHashes].sort(),
          activeLawAuthority:"none",
        }));
      }
    }

    const parentEntries=[...directByCapsule.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
    const parentGenerations=parentEntries.map(([,value])=>whole(value.ref.generation,"parent generation",1,1_000_000)).sort((a,b)=>a-b);
    const generation=parentGenerations.length?Math.max(...parentGenerations)+1:1;
    const performanceNodeId=`performance:${receipt.performanceHash}`;
    const parentCapsuleHashes=parentEntries.map(([hash])=>hash);

    performanceRows.push(canonicalize({
      nodeId:performanceNodeId,
      kind:"performed-world-candidate",
      authority:"witness-derived-observation-only",
      performanceHash:receipt.performanceHash,
      generation,
      directParentCount:parentEntries.length,
      parentCapsuleHashes,
      parentGenerations,
      placementCount:(receipt.placements||[]).length,
    }));

    for(const [capsuleHash,value] of parentEntries){
      const evidence=placementEvidence(receipt,value.materialIds);
      const edgeId=`performed:${capsuleHash}:${receipt.performanceHash}`;
      edgeMap.set(edgeId,canonicalize({
        edgeId,
        kind:"performed-from-history",
        authority:"observational-only",
        fromNodeId:`history:${capsuleHash}`,
        toNodeId:performanceNodeId,
        evidenceBasis:"placed-material-history-ref",
        ...evidence,
      }));
      if(!childrenByParent.has(capsuleHash))childrenByParent.set(capsuleHash,new Set());
      childrenByParent.get(capsuleHash).add(receipt.performanceHash);
    }
  }

  const adoptionEvidence=admissions
    .sort((a,b)=>a.admissionHash.localeCompare(b.admissionHash))
    .map(admission=>{
      const matches=[...historyNodes.values()]
        .filter(node=>node.kind==="rendered-history-capsule"&&node.renderedMediaSha256===admission.mediaSha256)
        .map(node=>node.capsuleHash)
        .sort();
      const matchedHistoryCapsuleHash=matches.length===1?matches[0]:null;
      const matchBasis=matches.length===1
        ?"exact-media-sha256"
        :matches.length>1
          ?"ambiguous-exact-media-sha256"
          :"unresolved";
      return canonicalize({
        admissionHash:admission.admissionHash,
        authority:"evidence-only",
        materialId:admission.material.materialId,
        sourceDispositionHash:admission.sourceDispositionHash,
        candidateGraphHash:admission.candidateGraphHash,
        mediaSha256:admission.mediaSha256,
        matchedHistoryCapsuleHash,
        candidateHistoryCapsuleHashes:matches,
        matchBasis,
      });
    });

  const reuseObservations=[];
  const siblingGroups=[];
  for(const [capsuleHash,childrenSet] of [...childrenByParent.entries()].sort((a,b)=>a[0].localeCompare(b[0]))){
    const performanceHashes=[...childrenSet].sort();
    if(performanceHashes.length<2)continue;
    reuseObservations.push(canonicalize({
      parentCapsuleHash:capsuleHash,
      childCount:performanceHashes.length,
      performanceHashes,
      authority:"observational-only",
    }));
    siblingGroups.push(canonicalize({
      sharedParentCapsuleHash:capsuleHash,
      performanceHashes,
      relation:"shared-explicit-parent-only",
      authority:"derived-relation-only",
    }));
  }

  const historyRows=[...historyNodes.values()].sort((a,b)=>
    a.capsuleHash.localeCompare(b.capsuleHash)||
    a.kind.localeCompare(b.kind)
  );
  const edges=[...edgeMap.values()].sort((a,b)=>a.edgeId.localeCompare(b.edgeId));
  const lawFossils=[...fossilMap.values()].sort((a,b)=>a.lawFossilHash.localeCompare(b.lawFossilHash));
  const generations=performanceRows.map(row=>row.generation);
  const knownHistoryGenerations=historyRows.map(row=>row.generation).filter(Number.isSafeInteger);
  const body=canonicalize({
    schema:GENERATIONAL_ECOLOGY_SCHEMA,
    policy:GENERATIONAL_ECOLOGY_POLICY,
    authority:"observational-only",
    performanceCount:performanceRows.length,
    historyNodeCount:historyRows.length,
    edgeCount:edges.length,
    performanceHashSet:performanceRows.map(row=>row.performanceHash).sort(),
    performances:performanceRows,
    historyNodes:historyRows,
    edges,
    lawFossils,
    activeLawAuthority:"none",
    adoptionEvidence,
    reuseObservations,
    siblingGroups,
    generationRange:{
      min:generations.length?Math.min(...generations):null,
      max:generations.length?Math.max(...generations):null,
      maxKnownHistoryGeneration:knownHistoryGenerations.length?Math.max(...knownHistoryGenerations):null,
    },
    laws:[
      "GENEALOGY != DESTINY",
      "AVAILABLE ANCESTRY != PERFORMED PARENTAGE",
      "UNUSED HISTORY != PARENT",
      "SHARED PARENT != SAME CHILD",
      "GENERATION != QUALITY",
      "GENERATION != AUTHORITY",
      "LAW FOSSIL != ACTIVE LAW",
      "ADOPTION EVIDENCE != KINSHIP AUTHORITY",
      "SAME BYTES != SAME AUTHORITY",
      "UNKNOWN GENERATION != ZERO",
    ],
  });
  return deepFreeze(canonicalize({
    ...body,
    ecologyHash:hashCanonical(body,"HauntedToaster-GenerationalEcology-v0"),
  }));
}

function validateGenerationalEcology(value){
  if(!value||typeof value!=="object"||Array.isArray(value))throw new TypeError("Generational ecology must be an object.");
  if(value.schema!==GENERATIONAL_ECOLOGY_SCHEMA||value.policy!==GENERATIONAL_ECOLOGY_POLICY||value.authority!=="observational-only"){
    throw new TypeError("Unsupported generational ecology contract.");
  }
  if(!Array.isArray(value.performances)||value.performances.length!==value.performanceCount)throw new TypeError("Generational ecology performance count mismatch.");
  if(!Array.isArray(value.historyNodes)||value.historyNodes.length!==value.historyNodeCount)throw new TypeError("Generational ecology history-node count mismatch.");
  if(!Array.isArray(value.edges)||value.edges.length!==value.edgeCount)throw new TypeError("Generational ecology edge count mismatch.");
  for(const row of value.performances){
    hash64(row.performanceHash,"ecology performanceHash");
    whole(row.generation,"ecology performance generation",1,1_000_001);
    if(row.authority!=="witness-derived-observation-only")throw new TypeError("Performance genealogy authority escalated.");
  }
  for(const node of value.historyNodes){
    hash64(node.capsuleHash,"ecology history capsuleHash");
    if(node.kind==="rendered-history-capsule"){
      whole(node.generation,"ecology history generation",1,1_000_000);
      hash64(node.renderedMediaSha256,"ecology history media sha256");
    }else if(node.kind==="history-parent-reference"){
      if(node.generation!==null||node.renderedMediaSha256!==null)throw new TypeError("Reference-only history node invents unavailable evidence.");
    }else throw new TypeError("Unknown ecology history node kind.");
  }
  if(value.activeLawAuthority!=="none")throw new TypeError("Generational ecology cannot activate historical law.");
  const {ecologyHash,...body}=value;
  const expected=hashCanonical(canonicalize(body),"HauntedToaster-GenerationalEcology-v0");
  if(hash64(ecologyHash,"ecologyHash")!==expected)throw new TypeError("Generational ecology hash mismatch.");
  return deepFreeze(canonicalize(value));
}

module.exports={
  GENERATIONAL_ECOLOGY_POLICY,
  GENERATIONAL_ECOLOGY_SCHEMA,
  compileGenerationalEcology,
  validateGenerationalEcology,
};
