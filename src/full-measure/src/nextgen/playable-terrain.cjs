"use strict";

const {canonicalize,deepFreeze,hashCanonical}=require("../generation/canonical.cjs");
const {validatePerformanceProgram}=require("./performance-program.cjs");
const {
  compilePossibilityMap,
  uniformSampleFrames,
  validatePossibilityMap,
}=require("./possibility-map.cjs");
const {renderPossibilityMapSvg}=require("./possibility-map-svg.cjs");

const PLAYABLE_TERRAIN_SCHEMA="static-collective/playable-possibility-terrain/v0";
const PLAYABLE_TERRAIN_POLICY="all-residue-scar-wake-maps/v0";

function whole(value,label,min,max){
  const number=Number(value);
  if(!Number.isSafeInteger(number)||number<min||number>max)throw new TypeError(`${label} must be an integer in [${min}, ${max}].`);
  return number;
}
function finite(value,label,min,max){
  const number=Number(value);
  if(!Number.isFinite(number)||number<min||number>max)throw new TypeError(`${label} must be finite in [${min}, ${max}].`);
  return Math.round(number*1_000_000)/1_000_000;
}
function compileResidueTerrain(program,{maxSamples=64,baseEnergy=.8}={}){
  const source=validatePerformanceProgram(program);
  const samples=whole(maxSamples,"maxSamples",2,256);
  const base=finite(baseEnergy,"baseEnergy",0,1);
  const sampleFrames=uniformSampleFrames({
    totalFrames:source.totalFrames,
    maxSamples:samples,
  });
  const residues=[...(source.residueMemory?.residues||[])]
    .sort((a,b)=>String(a.residueId).localeCompare(String(b.residueId)));
  const maps=residues.map((residue,index)=>{
    const targetResidueId=String(residue.residueId||"").trim();
    if(!targetResidueId)throw new TypeError(`residue ${index} is missing residueId.`);
    const candidateId=`scar-wake:${targetResidueId}`;
    const map=compilePossibilityMap(source,{
      candidate:{
        candidateId,
        kind:"scar-wake",
        fromState:"dormant-scar",
        toState:"awake-scar",
        baseEnergy:base,
        targetResidueId,
      },
      sampleFrames,
    });
    return canonicalize({
      terrainEntryId:`terrain:${targetResidueId}`,
      candidateId,
      targetResidueId,
      sourcePaintEventId:residue.sourcePaintEventId||null,
      map,
    });
  });
  const body=canonicalize({
    schema:PLAYABLE_TERRAIN_SCHEMA,
    policy:PLAYABLE_TERRAIN_POLICY,
    authority:"observational-only",
    sourceProgramHash:source.programHash,
    sourcePerformanceHash:source.sourcePerformanceHash,
    sourceResidueMemoryHash:source.residueMemory.memoryHash,
    fps:source.fps,
    totalFrames:source.totalFrames,
    samplePolicy:{
      kind:"uniform-endpoint-inclusive",
      maxSamples:samples,
      actualSampleCount:sampleFrames.length,
      sampleFrames,
    },
    baseEnergy:base,
    mapCount:maps.length,
    maps,
    laws:[
      "ALL ELIGIBLE RESIDUES EXPOSED != RANKED",
      "TERRAIN != SELECTION",
      "MAP != SELECTION",
      "LOWER TRANSITION COST != TAKE TRANSITION",
      "OBSERVATION != EDIT",
    ],
  });
  return deepFreeze(canonicalize({
    ...body,
    terrainHash:hashCanonical(body,"HauntedToaster-PlayablePossibilityTerrain-v0"),
  }));
}
function validatePlayableTerrain(terrain){
  if(!terrain||typeof terrain!=="object"||Array.isArray(terrain))throw new TypeError("PlayableTerrain must be an object.");
  if(terrain.schema!==PLAYABLE_TERRAIN_SCHEMA||terrain.policy!==PLAYABLE_TERRAIN_POLICY||terrain.authority!=="observational-only"){
    throw new TypeError("Unsupported PlayableTerrain contract.");
  }
  if(!/^[a-f0-9]{64}$/.test(String(terrain.sourceProgramHash||"")))throw new TypeError("PlayableTerrain sourceProgramHash is invalid.");
  if(!/^[a-f0-9]{64}$/.test(String(terrain.sourcePerformanceHash||"")))throw new TypeError("PlayableTerrain sourcePerformanceHash is invalid.");
  if(!/^[a-f0-9]{64}$/.test(String(terrain.sourceResidueMemoryHash||"")))throw new TypeError("PlayableTerrain sourceResidueMemoryHash is invalid.");
  whole(terrain.fps,"PlayableTerrain fps",1,240);
  whole(terrain.totalFrames,"PlayableTerrain totalFrames",1,1_000_000);
  finite(terrain.baseEnergy,"PlayableTerrain baseEnergy",0,1);
  if(!Array.isArray(terrain.maps)||terrain.maps.length!==terrain.mapCount||terrain.maps.length>96){
    throw new TypeError("PlayableTerrain map count mismatch.");
  }
  let prior="";
  for(const entry of terrain.maps){
    const id=String(entry.terrainEntryId||"");
    if(!id)throw new TypeError("PlayableTerrain entry ID is required.");
    if(prior&&id.localeCompare(prior)<0)throw new TypeError("PlayableTerrain entries are not canonical.");
    prior=id;
    const map=validatePossibilityMap(entry.map);
    if(map.sourceProgramHash!==terrain.sourceProgramHash)throw new TypeError("PlayableTerrain map/program lineage mismatch.");
    if(map.sourceCandidateId!==entry.candidateId)throw new TypeError("PlayableTerrain candidate identity mismatch.");
    if(map.candidateSpec?.kind!=="scar-wake"||map.candidateSpec?.targetResidueId!==entry.targetResidueId){
      throw new TypeError("PlayableTerrain scar-wake target mismatch.");
    }
    if(map.candidateSpec?.baseEnergy!==terrain.baseEnergy)throw new TypeError("PlayableTerrain base-energy policy mismatch.");
  }
  const {terrainHash,...body}=terrain;
  const expected=hashCanonical(canonicalize(body),"HauntedToaster-PlayablePossibilityTerrain-v0");
  if(terrainHash!==expected)throw new TypeError("PlayableTerrain hash mismatch.");
  return deepFreeze(canonicalize(terrain));
}
function projectResidueTerrain(terrain){
  const source=validatePlayableTerrain(terrain);
  return deepFreeze(canonicalize({
    schema:"static-collective/playable-possibility-terrain-projection/v0",
    authority:"observational-projection-only",
    terrainHash:source.terrainHash,
    sourceProgramHash:source.sourceProgramHash,
    maps:source.maps.map(entry=>({
      terrainEntryId:entry.terrainEntryId,
      candidateId:entry.candidateId,
      targetResidueId:entry.targetResidueId,
      mapHash:entry.map.mapHash,
      svg:renderPossibilityMapSvg(entry.map),
    })),
    laws:[
      "SVG != PHYSICS AUTHORITY",
      "PROJECTION != SELECTION",
    ],
  }));
}

module.exports={
  PLAYABLE_TERRAIN_POLICY,
  PLAYABLE_TERRAIN_SCHEMA,
  compileResidueTerrain,
  projectResidueTerrain,
  validatePlayableTerrain,
};
