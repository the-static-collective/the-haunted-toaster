"use strict";

const {canonicalize,deepFreeze,hashCanonical}=require("../generation/canonical.cjs");
const {compileResidueMemory}=require("./residue-memory.cjs");
const {validatePerformanceProgram}=require("./performance-program.cjs");

const WEIRDNESS_COMPILATION_SCHEMA="static-collective/weirdness-compilation/v0";
const WEIRDNESS_BINDING_SCHEMA="static-collective/weirdness-binding/v0";
const WEIRDNESS_POLICY="selective-relation-relaxation/v0";

const AXIS_IDS=Object.freeze({
  COORDINATE_AGREEMENT:"coordinate-agreement",
  EXPERIENCED_TIME_AGREEMENT:"experienced-time-agreement",
  HISTORY_DECAY_AGREEMENT:"history-decay-agreement",
});
const AXIS_ORDER=Object.freeze([
  AXIS_IDS.COORDINATE_AGREEMENT,
  AXIS_IDS.EXPERIENCED_TIME_AGREEMENT,
  AXIS_IDS.HISTORY_DECAY_AGREEMENT,
]);
const AXIS_SET=new Set(AXIS_ORDER);

function finite(value,label,min=-Infinity,max=Infinity){
  const number=Number(value);
  if(!Number.isFinite(number)||number<min||number>max)throw new TypeError(`${label} must be finite in [${min}, ${max}].`);
  return number;
}
function quantize(value){
  return Math.round(Number(value)*1_000_000)/1_000_000;
}
function normalizeAxes(axes=[]){
  if(!Array.isArray(axes))throw new TypeError("weirdness axes must be an array.");
  const seen=new Set();
  const normalized=[];
  for(const [index,axis] of axes.entries()){
    if(!axis||typeof axis!=="object"||Array.isArray(axis))throw new TypeError(`weirdness axis ${index} must be an object.`);
    const axisId=String(axis.axisId||"").trim();
    if(!AXIS_SET.has(axisId))throw new TypeError(`Unsupported weirdness axis: ${axisId||"(missing)"}.`);
    if(seen.has(axisId))throw new TypeError(`Duplicate weirdness axis: ${axisId}.`);
    seen.add(axisId);
    const amount=quantize(finite(axis.amount,`${axisId} amount`,0,1));
    normalized.push({axisId,amount});
  }
  return canonicalize(normalized.sort((left,right)=>AXIS_ORDER.indexOf(left.axisId)-AXIS_ORDER.indexOf(right.axisId)));
}
function axisAmount(axes,axisId){
  return Number(axes.find(axis=>axis.axisId===axisId)?.amount||0);
}
function rotateProjectedPosition(transform,amount){
  const source=transform||{};
  const x=Number(source.x);
  const y=Number(source.y);
  const theta=(Math.PI/2)*amount;
  const cos=Math.cos(theta);
  const sin=Math.sin(theta);
  const dx=x-.5;
  const dy=y-.5;
  return canonicalize({
    ...source,
    x:quantize(.5+(dx*cos)-(dy*sin)),
    y:quantize(.5+(dx*sin)+(dy*cos)),
  });
}
function relaxCoordinateAgreement(actions,amount){
  if(amount<=0)return canonicalize(actions);
  return canonicalize(actions.map(action=>({
    ...action,
    transform:rotateProjectedPosition(action.transform,amount),
    transformKeyframes:(action.transformKeyframes||[]).map(keyframe=>({
      ...keyframe,
      transform:rotateProjectedPosition(keyframe.transform,amount),
    })),
  })));
}
function relaxExperiencedTime(actions,amount){
  if(amount<=0)return canonicalize(actions);
  const exponent=quantize(1+(amount*3));
  return canonicalize(actions.map(action=>({
    ...action,
    experiencedTime:{
      schema:"static-collective/experienced-time-map/v0",
      authority:"compiled-relation-only",
      law:"ease-in-power",
      exponent,
      amount,
      commonAddressClock:"audio-frame",
    },
  })));
}
function relaxHistoryDecay(program,amount){
  if(amount<=0)return canonicalize(program.residueMemory);
  const base=finite(program.residueMemory?.decayPolicy?.perFrame,"source residue decayPerFrame",0.000001,1);
  const multiplier=1-(amount*.95);
  const decayPerFrame=Math.max(.000001,quantize(base*multiplier));
  return compileResidueMemory(program.performanceTrace,{
    decayPerFrame,
    carryAcrossScenes:program.residueMemory?.decayPolicy?.carryAcrossScenes!==false,
  });
}
function axisDescriptions(axes){
  return canonicalize(axes.map(axis=>{
    if(axis.axisId===AXIS_IDS.COORDINATE_AGREEMENT)return {
      ...axis,
      assumption:"performed position agrees with projected position",
      relaxationLaw:"rotate projected coordinate field around frame center",
      output:"timeline action transforms",
    };
    if(axis.axisId===AXIS_IDS.EXPERIENCED_TIME_AGREEMENT)return {
      ...axis,
      assumption:"internal material time agrees linearly with audio time",
      relaxationLaw:"ease-in power time map inside unchanged action span",
      output:"experienced-time map",
    };
    return {
      ...axis,
      assumption:"historical residue decays at its inherited rate",
      relaxationLaw:"reduce explicit residue decay rate",
      output:"ResidueMemoryV0",
    };
  }));
}
function weirdnessBinding(sourceProgramHash,axes){
  return canonicalize({
    schema:WEIRDNESS_BINDING_SCHEMA,
    policy:WEIRDNESS_POLICY,
    authority:"proposal-only",
    sourceProgramHash,
    axes:axisDescriptions(axes),
    laws:[
      "STRANGENESS != RANDOMNESS",
      "RELAXATION != SOURCE MUTATION",
      "AUDIO CLOCK = COMMON ADDRESS",
      "EXPERIENCED CLOCK != AUDIO CLOCK",
      "PERFORMED SPACE != PROJECTED SPACE",
      "HISTORY PERSISTENCE != HISTORY AUTHORITY",
    ],
  });
}
function derivedProgram(source,axes){
  const coordinate=axisAmount(axes,AXIS_IDS.COORDINATE_AGREEMENT);
  const experienced=axisAmount(axes,AXIS_IDS.EXPERIENCED_TIME_AGREEMENT);
  const history=axisAmount(axes,AXIS_IDS.HISTORY_DECAY_AGREEMENT);
  let timelineActions=relaxCoordinateAgreement(source.timelineActions||[],coordinate);
  timelineActions=relaxExperiencedTime(timelineActions,experienced);
  const residueMemory=relaxHistoryDecay(source,history);
  const binding=weirdnessBinding(source.programHash,axes);
  const {programHash:_sourceProgramHash,...sourceBody}=canonicalize(source);
  const body=canonicalize({
    ...sourceBody,
    timelineActions,
    residueMemory,
    weirdness:binding,
    replaySemantics:{
      produces:"deterministic consequences of the sealed take after explicit weirdness compilation",
      doesNotProduce:"a new human performance witness or a claim that the relaxed world was performed",
    },
    laws:[
      ...(Array.isArray(source.laws)?source.laws:[]),
      "WEIRDNESS PROGRAM != HUMAN PERFORMANCE",
      "RELAXATION != SOURCE MUTATION",
      "STRANGENESS != RANDOMNESS",
      "PROGRAM DERIVATION != FREEZE",
    ],
  });
  return deepFreeze(canonicalize({
    ...body,
    programHash:hashCanonical(body,"HauntedToaster-PerformanceProgram-v0"),
  }));
}
function compileWeirdness(program,{axes=[]}={}){
  const source=validatePerformanceProgram(program);
  const normalizedAxes=normalizeAxes(axes);
  const activeAxes=normalizedAxes.filter(axis=>axis.amount>0);
  const changed=activeAxes.length>0;
  const compiledProgram=changed?derivedProgram(source,activeAxes):source;
  const body=canonicalize({
    schema:WEIRDNESS_COMPILATION_SCHEMA,
    policy:WEIRDNESS_POLICY,
    authority:"proposal-only",
    sourceProgramHash:source.programHash,
    changed,
    axes:axisDescriptions(activeAxes),
    compiledProgramHash:compiledProgram.programHash,
    compiledProgram,
    laws:[
      "STRANGENESS != RANDOMNESS",
      "RELAXATION != SOURCE MUTATION",
      "ZERO RELAXATION = SOURCE PROGRAM",
      "WEIRDNESS COMPILATION != FREEZE",
      "PIXEL DIFFERENCE != CREATIVE VALUE",
    ],
  });
  return deepFreeze(canonicalize({
    ...body,
    compilationHash:hashCanonical(body,"HauntedToaster-WeirdnessCompilation-v0"),
  }));
}
function validateWeirdnessCompilation(value){
  if(!value||typeof value!=="object"||Array.isArray(value))throw new TypeError("WeirdnessCompilation must be an object.");
  if(value.schema!==WEIRDNESS_COMPILATION_SCHEMA||value.policy!==WEIRDNESS_POLICY||value.authority!=="proposal-only")throw new TypeError("Unsupported WeirdnessCompilation contract.");
  if(!/^[a-f0-9]{64}$/.test(String(value.sourceProgramHash||"")))throw new TypeError("WeirdnessCompilation sourceProgramHash is invalid.");
  const axes=normalizeAxes((value.axes||[]).map(axis=>({axisId:axis.axisId,amount:axis.amount})));
  if(axes.some(axis=>axis.amount<=0))throw new TypeError("WeirdnessCompilation stores active axes only.");
  const compiled=validatePerformanceProgram(value.compiledProgram);
  if(compiled.programHash!==value.compiledProgramHash)throw new TypeError("WeirdnessCompilation compiled program hash mismatch.");
  if(value.changed!==Boolean(axes.length))throw new TypeError("WeirdnessCompilation changed flag mismatch.");
  if(!value.changed&&compiled.programHash!==value.sourceProgramHash)throw new TypeError("Zero-relaxation WeirdnessCompilation must preserve the source program.");
  if(value.changed){
    if(compiled.weirdness?.sourceProgramHash!==value.sourceProgramHash)throw new TypeError("WeirdnessCompilation derived program lineage mismatch.");
    const programAxes=normalizeAxes((compiled.weirdness?.axes||[]).map(axis=>({axisId:axis.axisId,amount:axis.amount})));
    if(JSON.stringify(programAxes)!==JSON.stringify(axes))throw new TypeError("WeirdnessCompilation axis lineage mismatch.");
  }
  const {compilationHash,...body}=value;
  const expected=hashCanonical(canonicalize(body),"HauntedToaster-WeirdnessCompilation-v0");
  if(compilationHash!==expected)throw new TypeError("WeirdnessCompilation hash mismatch.");
  return value;
}

module.exports={
  AXIS_IDS,
  AXIS_ORDER,
  WEIRDNESS_BINDING_SCHEMA,
  WEIRDNESS_COMPILATION_SCHEMA,
  WEIRDNESS_POLICY,
  compileWeirdness,
  normalizeAxes,
  relaxCoordinateAgreement,
  relaxExperiencedTime,
  relaxHistoryDecay,
  rotateProjectedPosition,
  validateWeirdnessCompilation,
};
