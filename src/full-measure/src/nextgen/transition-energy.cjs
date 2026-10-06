"use strict";

const {canonicalize,deepFreeze,hashCanonical}=require("../generation/canonical.cjs");
const {strengthAtFrame}=require("./residue-memory.cjs");
const {AXIS_IDS,validateWeirdnessCompilation}=require("./weirdness-compiler.cjs");
const {validatePerformanceProgram}=require("./performance-program.cjs");

const TRANSITION_FIELD_SCHEMA="static-collective/transition-energy-field/v0";
const TRANSITION_FIELD_POLICY="explicit-creative-physics/v0";
const TRANSITION_KINDS=Object.freeze([
  "generic-relation",
  "law-return",
  "scar-wake",
  "kinship-cross",
]);
const AXIS_SET=new Set(Object.values(AXIS_IDS));
const WEIGHTS=Object.freeze({
  currentWorldLawResonance:.20,
  lawFossilResonance:.25,
  residuePresence:.30,
  sharedHistoryCapsule:.18,
  sharedLawFossil:.12,
});

function req(value,label){
  const text=String(value||"").trim();
  if(!text)throw new TypeError(`${label} is required.`);
  return text;
}
function hash64(value,label){
  const text=req(value,label).toLowerCase();
  if(!/^[a-f0-9]{64}$/.test(text))throw new TypeError(`${label} must be 64 lowercase hex characters.`);
  return text;
}
function finite(value,label,min=-Infinity,max=Infinity){
  const number=Number(value);
  if(!Number.isFinite(number)||number<min||number>max)throw new TypeError(`${label} must be finite in [${min}, ${max}].`);
  return number;
}
function whole(value,label,min=0,max=1_000_000){
  const number=Number(value);
  if(!Number.isSafeInteger(number)||number<min||number>max)throw new TypeError(`${label} must be an integer in [${min}, ${max}].`);
  return number;
}
function q(value){
  return Math.round(Number(value)*1_000_000)/1_000_000;
}
function clamp(value,min=0,max=1){
  return Math.min(max,Math.max(min,value));
}
function materialById(program,materialId,label="materialId"){
  const id=req(materialId,label);
  const material=(program.materials||[]).find(item=>item.materialId===id);
  if(!material)throw new TypeError(`Unknown PerformanceProgram material: ${id}.`);
  return material;
}
function axisAmount(axes,axisId){
  const axis=(axes||[]).find(item=>item.axisId===axisId);
  return axis?finite(axis.amount,`${axisId} amount`,0,1):0;
}
function currentWorldAxes(program){
  if(!program.weirdness)return [];
  if(program.weirdness.schema!=="static-collective/weirdness-binding/v0"||program.weirdness.authority!=="proposal-only"){
    throw new TypeError("PerformanceProgram weirdness binding is unsupported.");
  }
  return Array.isArray(program.weirdness.axes)?program.weirdness.axes:[];
}
function fossilAxes(material){
  const ref=material?.historyRef?.lawFossilRef;
  if(!ref)return [];
  if(ref.schema!=="static-collective/law-fossil-ref/v0"||ref.authority!=="provenance-only"){
    throw new TypeError(`Material ${material.materialId} carries an invalid law fossil ref.`);
  }
  if(!material?.historyRef?.worldLawCauseRef)throw new TypeError(`Material ${material.materialId} law fossil lacks a causal render witness.`);
  return Array.isArray(ref.axes)?ref.axes:[];
}
function normalizeCandidate(program,candidate,index){
  if(!candidate||typeof candidate!=="object"||Array.isArray(candidate))throw new TypeError(`transition candidate ${index} must be an object.`);
  const allowed=new Set([
    "candidateId","kind","frame","fromState","toState","baseEnergy",
    "materialId","targetAxisId","targetResidueId","fromMaterialId","toMaterialId",
  ]);
  for(const key of Object.keys(candidate)){
    if(!allowed.has(key))throw new TypeError(`Unsupported transition candidate field: ${key}.`);
  }
  const kind=req(candidate.kind,`candidate[${index}].kind`);
  if(!TRANSITION_KINDS.includes(kind))throw new TypeError(`Unsupported transition kind: ${kind}.`);
  const out={
    candidateId:req(candidate.candidateId,`candidate[${index}].candidateId`),
    kind,
    frame:whole(candidate.frame,`candidate[${index}].frame`,0,program.totalFrames-1),
    fromState:req(candidate.fromState,`candidate[${index}].fromState`),
    toState:req(candidate.toState,`candidate[${index}].toState`),
    baseEnergy:q(finite(candidate.baseEnergy,`candidate[${index}].baseEnergy`,0,1)),
  };
  if(kind==="law-return"){
    out.materialId=materialById(program,candidate.materialId,`candidate[${index}].materialId`).materialId;
    out.targetAxisId=req(candidate.targetAxisId,`candidate[${index}].targetAxisId`);
    if(!AXIS_SET.has(out.targetAxisId))throw new TypeError(`Unsupported target Weirdness axis: ${out.targetAxisId}.`);
  }else if(kind==="scar-wake"){
    out.targetResidueId=req(candidate.targetResidueId,`candidate[${index}].targetResidueId`);
    if(!(program.residueMemory?.residues||[]).some(item=>item.residueId===out.targetResidueId)){
      throw new TypeError(`Unknown residue target: ${out.targetResidueId}.`);
    }
  }else if(kind==="kinship-cross"){
    out.fromMaterialId=materialById(program,candidate.fromMaterialId,`candidate[${index}].fromMaterialId`).materialId;
    out.toMaterialId=materialById(program,candidate.toMaterialId,`candidate[${index}].toMaterialId`).materialId;
    if(out.fromMaterialId===out.toMaterialId)throw new TypeError("Kinship crossing requires two different materials.");
  }
  return canonicalize(out);
}
function contribution(kind,delta,evidence){
  return canonicalize({
    kind,
    delta:q(delta),
    evidence:canonicalize(evidence),
  });
}
function lawReturnContributions(program,candidate){
  const contributions=[];
  const worldAmount=axisAmount(currentWorldAxes(program),candidate.targetAxisId);
  if(worldAmount>0){
    contributions.push(contribution(
      "current-world-law-resonance",
      -(WEIGHTS.currentWorldLawResonance*worldAmount),
      {
        axisId:candidate.targetAxisId,
        amount:q(worldAmount),
        programHash:program.programHash,
        weirdnessSourceProgramHash:program.weirdness?.sourceProgramHash||program.programHash,
      },
    ));
  }
  const material=materialById(program,candidate.materialId);
  const fossilAmount=axisAmount(fossilAxes(material),candidate.targetAxisId);
  if(fossilAmount>0){
    contributions.push(contribution(
      "law-fossil-resonance",
      -(WEIGHTS.lawFossilResonance*fossilAmount),
      {
        materialId:material.materialId,
        axisId:candidate.targetAxisId,
        amount:q(fossilAmount),
        lawFossilHash:hash64(material.historyRef.lawFossilRef.lawFossilHash,"lawFossilHash"),
        worldLawCauseHash:hash64(material.historyRef.worldLawCauseRef.causeHash,"worldLawCauseHash"),
      },
    ));
  }
  return contributions;
}
function scarWakeContributions(program,candidate){
  const residue=program.residueMemory.residues.find(item=>item.residueId===candidate.targetResidueId);
  const strength=strengthAtFrame(residue,candidate.frame);
  if(strength<=0)return [];
  return [contribution(
    "residue-presence",
    -(WEIGHTS.residuePresence*strength),
    {
      residueId:residue.residueId,
      strength:q(strength),
      residueMemoryHash:hash64(program.residueMemory.memoryHash,"residueMemoryHash"),
      frame:candidate.frame,
    },
  )];
}
function kinshipContributions(program,candidate){
  const from=materialById(program,candidate.fromMaterialId);
  const to=materialById(program,candidate.toMaterialId);
  const a=from.historyRef||null;
  const b=to.historyRef||null;
  if(!a||!b)return [];
  if(a.capsuleHash&&a.capsuleHash===b.capsuleHash){
    return [contribution(
      "shared-history-capsule",
      -WEIGHTS.sharedHistoryCapsule,
      {
        capsuleHash:hash64(a.capsuleHash,"shared capsuleHash"),
        fromMaterialId:from.materialId,
        toMaterialId:to.materialId,
      },
    )];
  }
  const fossilA=a.lawFossilRef?.lawFossilHash;
  const fossilB=b.lawFossilRef?.lawFossilHash;
  if(fossilA&&fossilA===fossilB){
    return [contribution(
      "shared-law-fossil",
      -WEIGHTS.sharedLawFossil,
      {
        lawFossilHash:hash64(fossilA,"shared lawFossilHash"),
        fromMaterialId:from.materialId,
        toMaterialId:to.materialId,
      },
    )];
  }
  return [];
}
function contributionsFor(program,candidate){
  if(candidate.kind==="law-return")return lawReturnContributions(program,candidate);
  if(candidate.kind==="scar-wake")return scarWakeContributions(program,candidate);
  if(candidate.kind==="kinship-cross")return kinshipContributions(program,candidate);
  return [];
}
function transitionRecord(program,candidate){
  const contributions=contributionsFor(program,candidate)
    .sort((a,b)=>a.kind.localeCompare(b.kind)||JSON.stringify(a.evidence).localeCompare(JSON.stringify(b.evidence)));
  const delta=q(contributions.reduce((sum,item)=>sum+item.delta,0));
  const body=canonicalize({
    authority:"candidate-only",
    ...candidate,
    contributions,
    totalDelta:delta,
    energy:q(clamp(candidate.baseEnergy+delta)),
    laws:[
      "ENERGY != PROBABILITY",
      "ENERGY != VALUE",
      "LOWER ENERGY != ACCEPTANCE",
    ],
  });
  return deepFreeze(canonicalize({
    ...body,
    transitionHash:hashCanonical(body,"HauntedToaster-TransitionEnergy-v0"),
  }));
}
function compileTransitionField(program,{candidates=[]}={}){
  const source=validatePerformanceProgram(program);
  if(!Array.isArray(candidates))throw new TypeError("transition candidates must be an array.");
  if(candidates.length>256)throw new TypeError("transition field is limited to 256 candidates.");
  const normalized=candidates.map((candidate,index)=>normalizeCandidate(source,candidate,index));
  const seen=new Set();
  for(const candidate of normalized){
    if(seen.has(candidate.candidateId))throw new TypeError(`Duplicate transition candidate: ${candidate.candidateId}.`);
    seen.add(candidate.candidateId);
  }
  const transitions=normalized
    .map(candidate=>transitionRecord(source,candidate))
    .sort((a,b)=>a.candidateId.localeCompare(b.candidateId));
  const body=canonicalize({
    schema:TRANSITION_FIELD_SCHEMA,
    policy:TRANSITION_FIELD_POLICY,
    authority:"descriptive-possibility-only",
    sourceProgramHash:source.programHash,
    sourcePerformanceHash:source.sourcePerformanceHash,
    weights:WEIGHTS,
    transitionCount:transitions.length,
    transitions,
    laws:[
      "LOWER TRANSITION COST != TAKE TRANSITION",
      "LOWEST ENERGY != RECOMMENDATION",
      "ENERGY != PROBABILITY",
      "ENERGY != VALUE",
      "REACHABILITY != SELECTION",
      "FIELD != AUTHORITY",
      "EVIDENCE CONTRIBUTION != CAUSE OF ACCEPTANCE",
    ],
  });
  return deepFreeze(canonicalize({
    ...body,
    fieldHash:hashCanonical(body,"HauntedToaster-TransitionEnergyField-v0"),
  }));
}
function validateTransitionField(field){
  if(!field||typeof field!=="object"||Array.isArray(field))throw new TypeError("TransitionEnergyField must be an object.");
  if(field.schema!==TRANSITION_FIELD_SCHEMA||field.policy!==TRANSITION_FIELD_POLICY||field.authority!=="descriptive-possibility-only"){
    throw new TypeError("Unsupported TransitionEnergyField contract.");
  }
  hash64(field.sourceProgramHash,"TransitionEnergyField sourceProgramHash");
  hash64(field.sourcePerformanceHash,"TransitionEnergyField sourcePerformanceHash");
  if(!Array.isArray(field.transitions)||field.transitions.length!==field.transitionCount)throw new TypeError("TransitionEnergyField transition count mismatch.");
  const ids=new Set();
  for(const transition of field.transitions){
    const id=req(transition.candidateId,"transition candidateId");
    if(ids.has(id))throw new TypeError("TransitionEnergyField contains duplicate candidates.");
    ids.add(id);
    if(transition.authority!=="candidate-only")throw new TypeError("Transition energy must remain candidate-only.");
    const expectedEnergy=q(clamp(
      finite(transition.baseEnergy,"transition baseEnergy",0,1)
      +(transition.contributions||[]).reduce((sum,item)=>sum+finite(item.delta,"transition contribution delta",-1,1),0)
    ));
    if(transition.energy!==expectedEnergy)throw new TypeError("Transition energy arithmetic mismatch.");
    const {transitionHash,...body}=transition;
    const expected=hashCanonical(canonicalize(body),"HauntedToaster-TransitionEnergy-v0");
    if(hash64(transitionHash,"transitionHash")!==expected)throw new TypeError("Transition hash mismatch.");
  }
  const sorted=[...field.transitions].sort((a,b)=>a.candidateId.localeCompare(b.candidateId));
  if(JSON.stringify(sorted)!==JSON.stringify(field.transitions))throw new TypeError("TransitionEnergyField candidates are not canonical.");
  const {fieldHash,...body}=field;
  const expected=hashCanonical(canonicalize(body),"HauntedToaster-TransitionEnergyField-v0");
  if(hash64(fieldHash,"fieldHash")!==expected)throw new TypeError("TransitionEnergyField hash mismatch.");
  return field;
}

module.exports={
  TRANSITION_FIELD_POLICY,
  TRANSITION_FIELD_SCHEMA,
  TRANSITION_KINDS,
  WEIGHTS,
  compileTransitionField,
  validateTransitionField,
};
