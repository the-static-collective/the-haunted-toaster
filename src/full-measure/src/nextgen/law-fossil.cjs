"use strict";

const {canonicalize,deepFreeze,hashCanonical}=require("../generation/canonical.cjs");
const {validateWeirdnessCompilation}=require("./weirdness-compiler.cjs");

const LAW_FOSSIL_SCHEMA="static-collective/law-fossil/v0";
const LAW_FOSSIL_POLICY="relaxed-world-provenance/v0";
const LAW_FOSSIL_REF_SCHEMA="static-collective/law-fossil-ref/v0";
const WORLD_LAW_RENDER_CAUSE_SCHEMA="static-collective/world-law-render-cause/v0";
const WHOLE_RENDER_RECEIPT_SCHEMA="static-collective/performance-program-whole-render-receipt/v0";

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
function validateWholeRenderReceipt(receipt){
  if(!receipt||typeof receipt!=="object"||Array.isArray(receipt))throw new TypeError("World-law render cause requires a whole-render receipt.");
  if(receipt.schema!==WHOLE_RENDER_RECEIPT_SCHEMA||receipt.authority!=="witness-only")throw new TypeError("Unsupported whole-render receipt.");
  const programHash=sha(receipt.programHash,"wholeRenderReceipt.programHash");
  const frameGraphHash=sha(receipt.frameGraphHash,"wholeRenderReceipt.frameGraphHash");
  const renderer=String(receipt.renderer||"").trim();
  if(!renderer)throw new TypeError("wholeRenderReceipt.renderer is required.");
  if(!Array.isArray(receipt.frames)||receipt.frames.length!==Number(receipt.frameCount))throw new TypeError("Whole-render frame inventory mismatch.");
  for(const [index,frame] of receipt.frames.entries()){
    if(Number(frame?.frame)!==index)throw new TypeError("Whole-render frames must be contiguous from zero.");
    sha(frame?.sha256,`wholeRenderReceipt.frames[${index}].sha256`);
  }
  const expectedFrameGraph=hashCanonical(canonicalize({
    programHash,
    renderer,
    frames:receipt.frames.map(frame=>({frame:frame.frame,sha256:frame.sha256})),
  }),"HauntedToaster-PerformanceProgram-FrameGraph-v0");
  if(frameGraphHash!==expectedFrameGraph)throw new TypeError("Whole-render frame graph hash mismatch.");
  const {receiptHash,...body}=receipt;
  const expectedReceipt=hashCanonical(canonicalize(body),"HauntedToaster-PerformanceProgram-WholeRenderReceipt-v0");
  if(sha(receiptHash,"wholeRenderReceipt.receiptHash")!==expectedReceipt)throw new TypeError("Whole-render receipt hash mismatch.");
  return receipt;
}
function createWorldLawRenderCause({lawFossil,weirdnessCompilation,wholeRenderReceipt}={}){
  const fossil=validateLawFossil(lawFossil);
  const compilation=validateWeirdnessCompilation(weirdnessCompilation);
  const receipt=validateWholeRenderReceipt(wholeRenderReceipt);
  if(fossil.weirdnessCompilationHash!==compilation.compilationHash)throw new TypeError("LawFossil/WeirdnessCompilation lineage mismatch.");
  if(fossil.compiledProgramHash!==compilation.compiledProgramHash)throw new TypeError("LawFossil compiled program mismatch.");
  if(receipt.programHash!==compilation.compiledProgramHash)throw new TypeError("Whole-render receipt did not render the compiled weirdness program.");
  const body=canonicalize({
    schema:WORLD_LAW_RENDER_CAUSE_SCHEMA,
    authority:"render-cause-reference",
    lawFossilHash:fossil.lawFossilHash,
    weirdnessCompilationHash:compilation.compilationHash,
    sourceProgramHash:compilation.sourceProgramHash,
    compiledProgramHash:compilation.compiledProgramHash,
    renderer:receipt.renderer,
    wholeRenderReceiptHash:receipt.receiptHash,
    frameGraphHash:receipt.frameGraphHash,
    laws:[
      "RELAXED LAW CAUSE != FUTURE LAW",
      "FRAME GRAPH PROVES CONSEQUENCE, NOT CREATIVE VALUE",
      "PAST WORLD != CURRENT WORLD",
    ],
  });
  return deepFreeze(canonicalize({
    ...body,
    causeHash:hashCanonical(body,"HauntedToaster-WorldLawRenderCause-v0"),
  }));
}
function validateWorldLawRenderCause(value){
  if(!value||typeof value!=="object"||Array.isArray(value))throw new TypeError("WorldLawRenderCause must be an object.");
  if(value.schema!==WORLD_LAW_RENDER_CAUSE_SCHEMA||value.authority!=="render-cause-reference")throw new TypeError("Unsupported WorldLawRenderCause contract.");
  sha(value.lawFossilHash,"lawFossilHash");
  sha(value.weirdnessCompilationHash,"weirdnessCompilationHash");
  sha(value.sourceProgramHash,"sourceProgramHash");
  sha(value.compiledProgramHash,"compiledProgramHash");
  sha(value.wholeRenderReceiptHash,"wholeRenderReceiptHash");
  sha(value.frameGraphHash,"frameGraphHash");
  if(!String(value.renderer||"").trim())throw new TypeError("WorldLawRenderCause renderer is required.");
  const {causeHash,...body}=value;
  const expected=hashCanonical(canonicalize(body),"HauntedToaster-WorldLawRenderCause-v0");
  if(sha(causeHash,"causeHash")!==expected)throw new TypeError("WorldLawRenderCause hash mismatch.");
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
  WORLD_LAW_RENDER_CAUSE_SCHEMA,
  createLawFossil,
  createWorldLawRenderCause,
  lawFossilRef,
  validateLawFossil,
  validateWholeRenderReceipt,
  validateWorldLawRenderCause,
};
