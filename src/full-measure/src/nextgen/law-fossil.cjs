"use strict";

const {canonicalize,deepFreeze,hashCanonical}=require("../generation/canonical.cjs");
const {validateWeirdnessCompilation}=require("./weirdness-compiler.cjs");

const LAW_FOSSIL_SCHEMA="static-collective/law-fossil/v0";
const LAW_FOSSIL_POLICY="relaxed-world-provenance/v0";
const LAW_FOSSIL_REF_SCHEMA="static-collective/law-fossil-ref/v0";

function sha(value,label){
  const text=String(value||"").trim().toLowerCase();
  if(!/^[a-f0-9]{64}$/.test(text))throw new TypeError(`${label} must be 64 lowercase hex characters.`);
  return text;
}
function finite(value,label,min=0,max=1){
  const number=Number(value);
  if(!Number.isFinite(number)||number<min||number>max)throw new TypeError(`${label} must be finite in [${min}, ${max}].`);
  return number;
}
function normalizedAxes(axes=[]){
  if(!Array.isArray(axes)||axes.length<1)throw new TypeError("LawFossil requires at least one relaxed assumption.");
  const seen=new Set();
  return canonicalize(axes.map((axis,index)=>{
    if(!axis||typeof axis!=="object"||Array.isArray(axis))throw new TypeError(`LawFossil axis ${index} must be an object.`);
    const axisId=String(axis.axisId||"").trim();
    if(!axisId)throw new TypeError(`LawFossil axis ${index} requires axisId.`);
    if(seen.has(axisId))throw new TypeError(`LawFossil duplicate axis: ${axisId}.`);
    seen.add(axisId);
    return {
      axisId,
      amount:finite(axis.amount,`${axisId} amount`,0,1),
      assumption:String(axis.assumption||"").trim(),
      relaxationLaw:String(axis.relaxationLaw||"").trim(),
      output:String(axis.output||"").trim(),
    };
  }).sort((a,b)=>a.axisId.localeCompare(b.axisId)));
}
function createLawFossil(compilation){
  const source=validateWeirdnessCompilation(compilation);
  if(source.changed!==true||!Array.isArray(source.axes)||source.axes.length===0){
    throw new TypeError("LawFossil cannot be minted when there are no relaxed assumptions.");
  }
  const body=canonicalize({
    schema:LAW_FOSSIL_SCHEMA,
    policy:LAW_FOSSIL_POLICY,
    authority:"provenance-only",
    weirdnessCompilationHash:sha(source.compilationHash,"weirdnessCompilationHash"),
    sourceProgramHash:sha(source.sourceProgramHash,"sourceProgramHash"),
    compiledProgramHash:sha(source.compiledProgramHash,"compiledProgramHash"),
    axes:normalizedAxes(source.axes),
    laws:[
      "LAW FOSSIL != ACTIVE LAW",
      "INHERITED WEIRDNESS != REACTIVATED WEIRDNESS",
      "PROVENANCE != BEHAVIOR",
      "PAST RELAXATION != FUTURE AUTHORITY",
    ],
  });
  return deepFreeze(canonicalize({
    ...body,
    lawFossilHash:hashCanonical(body,"HauntedToaster-LawFossil-v0"),
  }));
}
function validateLawFossil(value){
  if(!value||typeof value!=="object"||Array.isArray(value))throw new TypeError("LawFossil must be an object.");
  if(value.schema!==LAW_FOSSIL_SCHEMA||value.policy!==LAW_FOSSIL_POLICY||value.authority!=="provenance-only")throw new TypeError("Unsupported LawFossil contract.");
  sha(value.weirdnessCompilationHash,"weirdnessCompilationHash");
  sha(value.sourceProgramHash,"sourceProgramHash");
  sha(value.compiledProgramHash,"compiledProgramHash");
  normalizedAxes(value.axes);
  const {lawFossilHash,...body}=value;
  const expected=hashCanonical(canonicalize(body),"HauntedToaster-LawFossil-v0");
  if(sha(lawFossilHash,"lawFossilHash")!==expected)throw new TypeError("LawFossil hash mismatch.");
  return deepFreeze(canonicalize(value));
}
function lawFossilRef(value){
  const fossil=validateLawFossil(value);
  return deepFreeze(canonicalize({
    schema:LAW_FOSSIL_REF_SCHEMA,
    authority:"provenance-only",
    lawFossilHash:fossil.lawFossilHash,
    weirdnessCompilationHash:fossil.weirdnessCompilationHash,
    sourceProgramHash:fossil.sourceProgramHash,
    compiledProgramHash:fossil.compiledProgramHash,
    axes:fossil.axes.map(axis=>({axisId:axis.axisId,amount:axis.amount})),
    laws:[
      "LAW FOSSIL REF != ACTIVE LAW",
      "ANCESTRY != REACTIVATION",
    ],
  }));
}

module.exports={
  LAW_FOSSIL_POLICY,
  LAW_FOSSIL_REF_SCHEMA,
  LAW_FOSSIL_SCHEMA,
  createLawFossil,
  lawFossilRef,
  validateLawFossil,
};
