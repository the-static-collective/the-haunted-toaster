"use strict";

const {canonicalize,canonicalBytes,deepFreeze,hashCanonical}=require("../generation/canonical.cjs");
const {compileGenerationalEcology}=require("./generational-ecology.cjs");
const {validatePerformanceReceipt}=require("./performance-trace.cjs");
const {validateRenderedHistoryCapsule,bindHistoryToVideo}=require("./history-capsule.cjs");
const {lawFossilRef}=require("./law-fossil.cjs");
const {normalizeHistoryRef,SCENE_FRAMES,SCENES}=require("../renderer/one-pass.js");

const MUTATION_RECORD_SCHEMA="static-collective/mutation-record/v0";
const MUTATION_COMPARISON_POLICY="exact-placement-witness-particulars/v0";
const DOMAIN="HauntedToaster-MutationRecord-v0";
const DIMENSIONS=["placement","timing","topology","lawFossil","materialRole"];
const LAWS=[
  "DISTANCE != VALUE","MUTATION != IMPROVEMENT","DIFFERENCE != RECOMMENDATION",
  "GENEALOGY != DESTINY","GEOMETRY != TOPOLOGY","SERIALIZATION DELTA != CREATIVE DELTA",
  "SERIALIZATION DELTA != PLACEMENT DELTA","TIME DIFFERENCE != RHYTHMIC QUALITY",
  "LAW FOSSIL != ACTIVE LAW","HISTORICAL PRESENCE != CURRENT AUTHORITY",
  "AVAILABLE ROLE != PERFORMED ROLE","UNKNOWN != ZERO","UNKNOWN GENERATION != ZERO",
  "SUMMARY != EVIDENCE","SHARED PARENT != SAME MUTATION","SAME GENERATION != SAME DISTANCE",
  "SAME DISTANCE != SAME MUTATION",
];
const same=(a,b)=>canonicalBytes(a).equals(canonicalBytes(b));
const sortRows=rows=>rows.sort((a,b)=>JSON.stringify(canonicalize(a)).localeCompare(JSON.stringify(canonicalize(b))));
function boundedArray(value,label,max=96){
  if(!Array.isArray(value)||value.length>max)throw new TypeError(`${label} must be an array of at most ${max} items.`);
  return value;
}
function integer(value,label,min,max){
  if(!Number.isSafeInteger(value)||value<min||value>max)throw new TypeError(`${label} must be an integer in [${min}, ${max}].`);
  return value;
}
function required(value,label){
  if(typeof value!=="string"||!value.trim())throw new TypeError(`${label} is required.`);
  return value;
}
function unique(rows,key,label){
  if(new Set(rows.map(row=>row[key])).size!==rows.length)throw new TypeError(`Duplicate ${label} identity.`);
}
function gcd(a,b){return b?gcd(b,a%b):Math.abs(a);}
function rational(n,d){const g=gcd(n,d);return {numerator:n/g,denominator:d/g,unit:"seconds"};}
function seconds(frames,fps){return rational(frames,fps);}
function subtract(a,b){return rational(a.numerator*b.denominator-b.numerator*a.denominator,a.denominator*b.denominator);}
function compareTime(a,b){return a.numerator*b.denominator-b.numerator*a.denominator;}
function displayTime(value){return `${value.numerator}/${value.denominator} s (${(value.numerator/value.denominator).toFixed(6)} s)`;}

// A neutral performed-use grammar. Coordinates and relations are separate projections;
// identity is exact and local to the supplied evidence, never inferred by similarity.
function historyEvidence(value){
  const ref=normalizeHistoryRef(value);
  return canonicalize({...ref,parentCapsuleHashes:[...ref.parentCapsuleHashes].sort()});
}
function performedEvidence(receipt){
  if(!receipt)return null;
  validatePerformanceReceipt(receipt);
  integer(receipt.fps,"fps",1,240);
  integer(receipt.totalFrames,"totalFrames",1,1_000_000);
  boundedArray(receipt.events,"events",192);
  const materials=boundedArray(receipt.materials,"materials",64);
  unique(materials,"materialId","material");
  const byMaterial=new Map(materials.map(material=>{
    required(material.materialId,"materialId");
    required(material.roleId,"roleId");
    if(material.historyRef)historyEvidence(material.historyRef);
    return [material.materialId,material];
  }));
  const placements=boundedArray(receipt.placements,"placements").map(p=>{
    required(p.placementId,"placementId");
    const material=byMaterial.get(p.materialId);
    if(!material)throw new TypeError("Placement source binding has no material evidence.");
    const section=SCENES.indexOf(p.sceneId);
    if(section<0)throw new TypeError("Unknown ONE PASS section; timing cannot be invented.");
    const offset=integer(p.startOffsetFrames,"startOffsetFrames",0,SCENE_FRAMES-1);
    const duration=integer(p.durationFrames,"durationFrames",1,receipt.totalFrames);
    const onset=section*SCENE_FRAMES+offset;
    if(onset+duration>receipt.totalFrames||offset+duration>SCENE_FRAMES)throw new TypeError("Placement exceeds its witnessed section or performance span.");
    integer(p.lane,"lane",0,5);
    integer(p.stackOrder,"stackOrder",-1_000_000,1_000_000);
    integer(p.sourceStartFrames,"sourceStartFrames",0,1_000_000);
    if(!p.transform||!Array.isArray(p.transformKeyframes))throw new TypeError("Placement geometry evidence is missing.");
    // Keyframe list order is serialization; offsetFrames is the performed ordering.
    const path=p.transformKeyframes.map(frame=>{
      integer(frame.offsetFrames,"keyframe offsetFrames",0,duration-1);
      if(!frame.transform)throw new TypeError("Keyframe transform evidence is missing.");
      return canonicalize(frame);
    }).sort((a,b)=>a.offsetFrames-b.offsetFrames);
    unique(path,"offsetFrames","keyframe");
    const moving=path.some(frame=>["x","y","scale","rotationDegrees"].some(key=>frame.transform[key]!==p.transform[key]));
    return canonicalize({
      id:p.placementId,source:p.materialId,lane:p.lane,region:p.sceneId,order:p.stackOrder,
      geometry:{transform:p.transform,keyframes:path,crop:p.crop,opacity:p.opacity,blend:p.blend},
      sourceStartFrames:p.sourceStartFrames,
      onset:seconds(onset,receipt.fps),duration:seconds(duration,receipt.fps),end:seconds(onset+duration,receipt.fps),
      roles:[material.roleId,moving?"moving-surface":"held-surface",...(p.crop?["crop"]:[])].sort(),
    });
  }).sort((a,b)=>a.id.localeCompare(b.id));
  unique(placements,"id","placement");
  const used=new Set(placements.map(p=>p.source));
  const refs=materials.filter(m=>used.has(m.materialId)&&m.historyRef).map(m=>historyEvidence(m.historyRef));
  const fossils=refs.filter(ref=>ref.lawFossilRef).map(ref=>ref.lawFossilRef);
  return {placements,total:seconds(receipt.totalFrames,receipt.fps),fossils,unknownAncestors:[...new Set(refs.flatMap(ref=>ref.parentCapsuleHashes))].sort()};
}
function dimension(changes=[],unknown=[],observations=[]){
  return canonicalize({
    status:unknown.length?"unknown":changes.length?"changed":"unchanged",
    distance:unknown.length?null:changes.length,
    measuredParticularCount:changes.length,
    changes:sortRows(changes),observations:sortRows(observations),unknown:[...new Set(unknown)].sort(),
  });
}
function paired(parent,child){
  const a=new Map(parent.placements.map(p=>[p.id,p]));
  const b=new Map(child.placements.map(p=>[p.id,p]));
  const ids=[...new Set([...a.keys(),...b.keys()])].sort();
  return ids.map(id=>({id,a:a.get(id)||null,b:b.get(id)||null}));
}
function fieldChanges(pairs,fields){
  const changes=[];
  for(const {id,a,b} of pairs){
    if(!a||!b)continue;
    for(const [key,kind] of fields)if(!same(a[key],b[key]))changes.push({kind,placementId:id,before:a[key],after:b[key]});
  }
  return changes;
}
function placementDelta(parent,child){
  const pairs=paired(parent,child);
  const changes=fieldChanges(pairs,[["source","source-binding"],["lane","lane"],["region","region"],["order","ordering"],["sourceStartFrames","source-trim"]]);
  for(const {id,a,b} of pairs){
    if(a&&b&&!same(a.geometry,b.geometry)){
      const fields=[];
      for(const property of ["x","y","scale","rotationDegrees"]){
        if(!same(a.geometry.transform[property],b.geometry.transform[property]))fields.push({property:`transform.${property}`,before:a.geometry.transform[property],after:b.geometry.transform[property]});
      }
      for(const property of ["keyframes","crop","opacity","blend"]){
        if(!same(a.geometry[property],b.geometry[property]))fields.push({property,before:a.geometry[property],after:b.geometry[property]});
      }
      changes.push({kind:"geometry",placementId:id,fields});
    }
  }
  for(const {id,a,b} of pairs)if(!a||!b)changes.push({kind:a?"removed-placement":"added-placement",placementId:id,before:a,after:b});
  const counts=e=>{
    const out={};for(const p of e.placements)out[p.source]=(out[p.source]||0)+1;return out;
  };
  const a=counts(parent),b=counts(child);
  for(const source of [...new Set([...Object.keys(a),...Object.keys(b)])].sort())if((a[source]||0)!==(b[source]||0))changes.push({kind:"repetition-count",source,before:a[source]||0,after:b[source]||0});
  return dimension(changes);
}
function gaps(evidence){
  const intervals=[...evidence.placements].sort((a,b)=>compareTime(a.onset,b.onset)||compareTime(a.end,b.end));
  let cursor=seconds(0,1);const out=[];
  for(const p of intervals){
    if(compareTime(p.onset,cursor)>0)out.push({start:cursor,end:p.onset});
    if(compareTime(p.end,cursor)>0)cursor=p.end;
  }
  if(compareTime(evidence.total,cursor)>0)out.push({start:cursor,end:evidence.total});
  return out;
}
function overlaps(e){
  const out=[];
  for(let i=0;i<e.placements.length;i++)for(let j=i+1;j<e.placements.length;j++){
    const a=e.placements[i],b=e.placements[j];
    const start=compareTime(a.onset,b.onset)>0?a.onset:b.onset;
    const end=compareTime(a.end,b.end)<0?a.end:b.end;
    if(compareTime(end,start)>0)out.push({from:a.id,to:b.id,duration:subtract(end,start)});
  }
  return sortRows(out);
}
function timingDelta(parent,child){
  const pairs=paired(parent,child),changes=[];
  for(const {id,a,b} of pairs){
    if(!a||!b){changes.push({kind:a?"removed-span":"added-span",placementId:id,before:a?{onset:a.onset,duration:a.duration}:null,after:b?{onset:b.onset,duration:b.duration}:null});continue;}
    for(const key of ["onset","duration"])if(compareTime(a[key],b[key])!==0){
      const delta=subtract(b[key],a[key]);
      changes.push({kind:key,placementId:id,before:a[key],after:b[key],delta,display:displayTime(delta)});
    }
    if(a.region!==b.region)changes.push({kind:"section-reassignment",placementId:id,before:a.region,after:b.region});
  }
  for(const [kind,before,after] of [["overlap",overlaps(parent),overlaps(child)],["silence-gap-structure",gaps(parent),gaps(child)],["performance-duration",parent.total,child.total]])if(!same(before,after))changes.push({kind,before,after});
  return dimension(changes,[],[{kind:"beat-relative",status:"unknown",reason:"ONE PASS receipt carries no accepted beat grid."}]);
}
function topologyRelations(e){
  const relations=[];
  const add=(kind,from,to)=>relations.push({kind,from:from.id,to:to.id});
  const contains=(a,b)=>compareTime(a.onset,b.onset)<=0&&compareTime(a.end,b.end)>=0;
  for(let i=0;i<e.placements.length;i++)for(let j=i+1;j<e.placements.length;j++){
    const a=e.placements[i],b=e.placements[j];
    if(compareTime(a.end,b.onset)<=0)add("sequence-before",a,b);
    else if(compareTime(b.end,a.onset)<=0)add("sequence-before",b,a);
    else{
      add("temporal-overlap",a,b);
      if(a.region===b.region&&Math.abs(a.lane-b.lane)===1)add("concurrent-lane-adjacency",a,b);
    }
    if(contains(a,b))add("temporal-containment",a,b);
    if(contains(b,a))add("temporal-containment",b,a);
  }
  return sortRows(relations);
}
function topologyDelta(parent,child){
  const a=topologyRelations(parent),b=topologyRelations(child);
  const changes=[];
  for(const [before,after,kind] of [[a,b,"removed-relation"],[b,a,"added-relation"]])for(const relation of before)if(!after.some(other=>same(relation,other)))changes.push({kind,relation});
  return dimension(changes,[],[{kind:"scope",grammar:["sequence-before","temporal-overlap","temporal-containment","concurrent-lane-adjacency"]},{kind:"unmeasurable",relations:["spatial-crossing","spatial-containment","branch-rejoin"],reason:"No explicit relation witness in this adapter; coordinates do not authorize these claims."}]);
}
function fossilDelta(parent,child){
  const changes=[],observations=[{kind:"scope",meaning:"direct performed history refs plus supplied parent capsule fossil; removal means absent from this observed history, not erased ancestry"}];
  const fossilMap=rows=>{
    const out=new Map();
    for(const fossil of rows){
      if(out.has(fossil.lawFossilHash)&&!same(out.get(fossil.lawFossilHash),fossil))throw new TypeError("Conflicting law-fossil identity.");
      out.set(fossil.lawFossilHash,fossil);
    }
    return out;
  };
  const a=fossilMap(parent?.fossils||[]),b=fossilMap(child.fossils);
  for(const hash of [...new Set([...a.keys(),...b.keys()])].sort()){
    if(!parent){observations.push({kind:"observed-child-fossil",lawFossilHash:hash,comparison:"unknown",activeLawAuthority:"none"});continue;}
    if(a.has(hash)&&b.has(hash)){
      if(!same(a.get(hash),b.get(hash)))throw new TypeError("Conflicting law-fossil identity.");
      observations.push({kind:"inherited",lawFossilHash:hash,activeLawAuthority:"none"});
    }else changes.push({kind:a.has(hash)?"removed":"added",lawFossilHash:hash,before:a.get(hash)||null,after:b.get(hash)||null,activeLawAuthority:"none"});
  }
  for(const x of a.values())for(const y of b.values())if(x.sourceProgramHash===y.sourceProgramHash&&x.lawFossilHash!==y.lawFossilHash)for(const axis of x.axes){
    const other=y.axes.find(row=>row.axisId===axis.axisId);
    if(other&&axis.amount!==other.amount)observations.push({kind:"contradicted-annotation",axisId:axis.axisId,before:{lawFossilHash:x.lawFossilHash,amount:axis.amount},after:{lawFossilHash:y.lawFossilHash,amount:other.amount},activeLawAuthority:"none",meaning:"different historical relaxation annotations; no active-law compliance claim"});
  }
  const missing=[...(parent?.unknownAncestors||[]),...child.unknownAncestors];
  const unknown=[...(!parent?["parent performed history unavailable"]:[]),...missing.map(hash=>`ancestry unavailable: ${hash}`)];
  for(const hash of missing)observations.push({kind:"absent-because-ancestry-unknown",capsuleHash:hash,generation:null});
  return dimension(changes,unknown,observations);
}
function roleDelta(parent,child){
  const roleUses=evidence=>{
    const map=new Map();
    for(const placement of evidence.placements){
      if(!map.has(placement.source))map.set(placement.source,new Set());
      for(const role of placement.roles)map.get(placement.source).add(role);
    }
    return new Map([...map].map(([source,roles])=>[source,[...roles].sort()]));
  };
  const a=roleUses(parent),b=roleUses(child),changes=[];
  for(const materialId of [...new Set([...a.keys(),...b.keys()])].sort()){
    const before=a.get(materialId)||null,after=b.get(materialId)||null;
    if(!same(before,after))changes.push({kind:before===null?"use-began":after===null?"use-ceased":"performed-role",materialId,before,after,parentPlacementIds:parent.placements.filter(p=>p.source===materialId).map(p=>p.id),childPlacementIds:child.placements.filter(p=>p.source===materialId).map(p=>p.id)});
  }
  return dimension(changes,[],[{kind:"scope",meaning:"per-material roles only on performed placements: lane role, held/moving surface, crop; capability inventory is excluded"}]);
}
function artifactRef(receipt){return {identity:`performance:${receipt.performanceHash}`,identityHash:receipt.performanceHash,evidenceHash:hashCanonical(receipt,"HauntedToaster-MutationArtifactEvidence-v0"),schema:receipt.schema};}

function compileFamilyMutations({performanceReceipts=[],parentEvidence=[],comparisonPolicy=MUTATION_COMPARISON_POLICY}={}){
  if(comparisonPolicy!==MUTATION_COMPARISON_POLICY)throw new TypeError("Unsupported mutation comparison policy.");
  const receipts=boundedArray(performanceReceipts,"performanceReceipts",32);
  const parents=boundedArray(parentEvidence,"parentEvidence",32);
  // Rebuild 023 instead of trusting a persisted ecology or an asserted edge.
  const ecology=compileGenerationalEcology({performanceReceipts:receipts});
  const receiptMap=new Map(receipts.map(r=>[r.performanceHash,r]));
  const evidenceMap=new Map();
  for(const item of parents){
    const capsule=validateRenderedHistoryCapsule(item.historyCapsule);
    if(evidenceMap.has(capsule.capsuleHash))throw new TypeError("Duplicate parent evidence identity.");
    if(item.performanceReceipt){
      performedEvidence(item.performanceReceipt);
      if(capsule.historicalContext.performanceHash!==item.performanceReceipt.performanceHash)throw new TypeError("Parent receipt does not match the capsule's exact historical performance binding.");
      const parentWorld=compileGenerationalEcology({performanceReceipts:[item.performanceReceipt]}).performances[0];
      if(parentWorld.generation!==capsule.generation||!same([...parentWorld.parentCapsuleHashes].sort(),capsule.parents.map(p=>p.capsuleHash).sort()))throw new TypeError("Parent performance genealogy contradicts capsule lineage.");
    }
    evidenceMap.set(capsule.capsuleHash,{capsule,receipt:item.performanceReceipt||null});
  }
  const records=[];
  for(const edge of ecology.edges.filter(e=>e.kind==="performed-from-history")){
    const childReceipt=receiptMap.get(edge.toNodeId.slice("performance:".length));
    const node=ecology.historyNodes.find(n=>n.nodeId===edge.fromNodeId);
    const supplied=evidenceMap.get(node.capsuleHash);
    const usedRefs=childReceipt.materials.filter(m=>edge.materialIds.includes(m.materialId)).map(m=>historyEvidence(m.historyRef));
    if(supplied){
      const bound=bindHistoryToVideo({historyCapsule:supplied.capsule,sourceSha256:node.renderedMediaSha256});
      if(usedRefs.some(ref=>!same(ref,historyEvidence(bound))))throw new TypeError("Parent capsule contradicts performed edge history evidence.");
    }
    const parent=performedEvidence(supplied?.receipt),child=performedEvidence(childReceipt);
    // A capsule's own fossil belongs to the parent's history too. Its presence
    // never activates law, and historical performance context never becomes render cause.
    if(parent&&supplied.capsule.historicalContext.lawFossil)parent.fossils.push(lawFossilRef(supplied.capsule.historicalContext.lawFossil));
    const unknown=()=>dimension([],["parent performed-use evidence unavailable"]);
    const deltas={
      placement:parent?placementDelta(parent,child):unknown(),
      timing:parent?timingDelta(parent,child):unknown(),
      topology:parent?topologyDelta(parent,child):unknown(),
      lawFossil:fossilDelta(parent,child),
      materialRole:parent?roleDelta(parent,child):unknown(),
    };
    const unknownDimensions=DIMENSIONS.filter(key=>deltas[key].status==="unknown");
    const measuredParticularCount=DIMENSIONS.reduce((sum,key)=>sum+deltas[key].measuredParticularCount,0);
    const parentArtifact={identity:node.nodeId,identityHash:node.capsuleHash,schema:"static-collective/rendered-history-capsule/v0",renderedMediaSha256:node.renderedMediaSha256,evidenceStatus:supplied?"verified-capsule":"performed-reference-only",evidenceHash:supplied?hashCanonical(supplied.capsule,"HauntedToaster-MutationArtifactEvidence-v0"):null};
    const body=canonicalize({
      schema:MUTATION_RECORD_SCHEMA,comparisonPolicy,comparisonVersion:0,authority:"observational-only",
      parentArtifact,childArtifact:artifactRef(childReceipt),genealogyEdge:edge,
      parentGeneration:node.generation,childGeneration:ecology.performances.find(p=>p.nodeId===edge.toNodeId).generation,
      deltas,aggregateDistance:{unit:"changed-particular-count",value:unknownDimensions.length?null:measuredParticularCount,measuredParticularCount,coverage:unknownDimensions.length?"partial":"complete-within-policy",meaning:"descriptive index only; overlapping particulars may be counted in separate dimensions"},
      unknownDimensions,unmeasurable:["beat-relative timing without accepted beat grid","spatial crossing/containment and branch/rejoin without explicit relation evidence","semantic roles outside witnessed ONE PASS use","rendered-pixel difference; historical performance context is not render cause"],
      unknownAncestry:ecology.historyNodes.filter(n=>n.generation===null).map(n=>({identity:n.nodeId,generation:null})),
      evidenceReferences:{ecologyHash:ecology.ecologyHash,parentPerformance:supplied?.receipt?artifactRef(supplied.receipt):null,childPerformance:artifactRef(childReceipt),performedHistoryRefs:sortRows(usedRefs)},
      activeLawAuthority:"none",grantedAuthorities:[],laws:LAWS,
    });
    records.push(deepFreeze(canonicalize({...body,mutationRecordHash:hashCanonical(body,DOMAIN)})));
  }
  for(const hash of evidenceMap.keys())if(!ecology.edges.some(edge=>edge.fromNodeId===`history:${hash}`&&edge.kind==="performed-from-history"))throw new TypeError("Parent evidence does not belong to any performed family edge.");
  return deepFreeze(records.sort((a,b)=>a.genealogyEdge.edgeId.localeCompare(b.genealogyEdge.edgeId)));
}
function verifyMutationRecord(record,inputs){
  if(!record||record.schema!==MUTATION_RECORD_SCHEMA)throw new TypeError("Unsupported mutation record.");
  const rebuilt=compileFamilyMutations(inputs).find(row=>row.genealogyEdge.edgeId===record.genealogyEdge?.edgeId);
  if(!rebuilt||!same(rebuilt,record))throw new TypeError("Mutation record verification failed: independently recomputed evidence differs.");
  return true;
}
module.exports={MUTATION_RECORD_SCHEMA,MUTATION_COMPARISON_POLICY,compileFamilyMutations,verifyMutationRecord};
