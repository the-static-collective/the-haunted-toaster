"use strict";
const fs=require("node:fs/promises");
const path=require("node:path");
const crypto=require("node:crypto");
const {pathToFileURL}=require("node:url");
const {canonicalBytes,canonicalize,hashCanonical}=require("../generation/canonical.cjs");
const {adaptPlaydeck}=require("./adapters/playdeck.cjs");
const {adaptAcceptedBlenderTake}=require("./adapters/blender-take.cjs");
const {frankenVideoDigestionReservoir}=require("../nextgen/live-crossings.cjs");
const {composeFrankenProposal,applyFrankenEdits,proposalToComposition}=require("./compose.cjs");
const {freezeFrankenComposition}=require("./freeze.cjs");
const {fingerprint256,stableStringify,normalizeSceneSpans}=require("../renderer/one-pass.js");
const {compilePerformanceTrace}=require("../nextgen/performance-trace.cjs");
const {compileResidueMemory}=require("../nextgen/residue-memory.cjs");
const {deriveFullSongForm,validateFullSongForm}=require("../nextgen/full-song-form.cjs");
const {deriveListeningField}=require("../nextgen/listening-field.cjs");

const JSON_EXTENSIONS=new Set([".json"]);
const VIDEO_EXTENSIONS=new Set([".mp4"]);
const URI_SCHEME=/^[a-z][a-z0-9+.-]*:\/\//i;

function sha256(bytes){return crypto.createHash("sha256").update(bytes).digest("hex");}
function validateOnePassReceipt(receipt){
  if(!receipt||typeof receipt!=="object"||Array.isArray(receipt))throw new TypeError("ONE PASS receipt must be an object.");
  if(receipt.schema!=="static-collective/one-pass-performance-receipt/v0")throw new TypeError("Unsupported ONE PASS receipt schema.");
  if(receipt.authority!=="witness-only")throw new TypeError("ONE PASS receipt must remain witness-only.");
  if(!/^[a-f0-9]{64}$/.test(String(receipt.performanceHash||"")))throw new TypeError("ONE PASS performance hash must be 64 lowercase hex characters.");
  const {performanceHash,...witness}=receipt;
  if(fingerprint256(stableStringify(witness))!==performanceHash)throw new TypeError("ONE PASS receipt fingerprint mismatch.");
  if(!Array.isArray(receipt.events)||receipt.events.length>4096)throw new TypeError("ONE PASS receipt events are outside the bounded full-song performance envelope.");
  if(!Array.isArray(receipt.placements)||receipt.placements.length>2048)throw new TypeError("ONE PASS receipt placements are outside the bounded full-song performance envelope.");
  if(receipt.spatialSamples!==undefined&&!Array.isArray(receipt.spatialSamples))throw new TypeError("ONE PASS receipt spatial samples must be an array when present.");
  const spatialSamples=receipt.spatialSamples||[];
  if(spatialSamples.length>16384)throw new TypeError("ONE PASS receipt spatial samples are outside the bounded full-song performance envelope.");
  if(receipt.sceneSpans!==undefined){
    if(!Array.isArray(receipt.sceneSpans)||receipt.sceneSpans.length!==3)throw new TypeError("ONE PASS receipt sceneSpans must contain three macro scenes when present.");
    normalizeSceneSpans(receipt.sceneSpans,Math.floor(Number(receipt.totalFrames)));
  }
  if(receipt.eventCount!==receipt.events.length||receipt.placementCount!==receipt.placements.length)throw new TypeError("ONE PASS receipt counts do not match its body.");
  if(receipt.spatialSampleCount!==undefined&&receipt.spatialSampleCount!==spatialSamples.length)throw new TypeError("ONE PASS receipt spatial sample count does not match its body.");
  return canonicalize(receipt);
}
async function assertLocalFile(filePath,extensions,label){
  if(typeof filePath!=="string"||!filePath.trim())throw new TypeError(`Choose a ${label} first.`);
  const resolved=path.resolve(filePath);
  if(!extensions.has(path.extname(resolved).toLowerCase()))throw new TypeError(`That ${label} format is not supported.`);
  const stat=await fs.stat(resolved);
  if(!stat.isFile())throw new TypeError(`The selected ${label} is not a file.`);
  return resolved;
}
async function readJson(filePath,label){
  const resolved=await assertLocalFile(filePath,JSON_EXTENSIONS,label);
  const stat=await fs.stat(resolved);
  if(stat.size>2_000_000)throw new RangeError(`${label} is larger than the 2 MB safety limit.`);
  return {resolved,value:JSON.parse(await fs.readFile(resolved,"utf8"))};
}
function inside(base,target){const relative=path.relative(base,target);return relative!==""&&!relative.startsWith("..")&&!path.isAbsolute(relative);}
async function playdeckInputs(deckPath,worldRulePath,assetMapPath=null){
  const deckRecord=await readJson(deckPath,"Playdeck deck JSON");
  const worldRecord=await readJson(worldRulePath,"Playdeck world-rule JSON");
  const assetRecord=assetMapPath?await readJson(assetMapPath,"Playdeck local asset map JSON"):null;
  if(assetRecord&&(!assetRecord.value||typeof assetRecord.value!=="object"||Array.isArray(assetRecord.value)))throw new TypeError("Playdeck local asset map must be a JSON object.");
  const deckDir=path.dirname(deckRecord.resolved);
  const assetDir=assetRecord?path.dirname(assetRecord.resolved):null;
  const sourceDigests={};
  const sourcePathByIdentity={};
  for(const card of deckRecord.value.cards||[]){
    if(typeof card?.source!=="string"||!card.source.trim())throw new TypeError("Every Playdeck card requires a source identity.");
    if(sourcePathByIdentity[card.source])continue;
    let source;
    if(card.source.startsWith("asset://")){
      if(!assetRecord)throw new TypeError("Playdeck logical asset sources require an explicit local asset map.");
      const binding=assetRecord.value[card.source];
      if(typeof binding!=="string"||!binding.trim())throw new TypeError(`Local asset map has no binding for ${card.source}.`);
      if(URI_SCHEME.test(binding.trim()))throw new TypeError("Playdeck local asset map refuses remote or URI-scheme bindings.");
      source=path.resolve(assetDir,binding.trim());
      if(!inside(assetDir,source))throw new TypeError("Playdeck local asset bindings must stay inside the selected asset-map folder.");
    }else{
      source=path.resolve(deckDir,card.source);
      if(!inside(deckDir,source))throw new TypeError("Playdeck card sources must stay inside the selected deck folder.");
    }
    const stat=await fs.stat(source);
    if(!stat.isFile())throw new TypeError(`Playdeck source is not a file: ${card.source}`);
    sourceDigests[card.source]=sha256(await fs.readFile(source));
    sourcePathByIdentity[card.source]=source;
  }
  const playdeck=adaptPlaydeck({deck:deckRecord.value,worldRule:worldRecord.value,sourceDigests});
  const sourcePaths=Object.fromEntries(playdeck.cards.map(card=>[card.materialId,sourcePathByIdentity[card.source]]));
  return {playdeck,sourcePaths};
}
async function blenderInputs(acceptancePath,admissionReceiptPath,videoPath){
  const acceptance=await readJson(acceptancePath,"Blender acceptance JSON");
  const receipt=await readJson(admissionReceiptPath,"Blender admission receipt JSON");
  const video=await assertLocalFile(videoPath,VIDEO_EXTENSIONS,"Blender accepted take");
  const blenderTake=adaptAcceptedBlenderTake({acceptance:acceptance.value,acceptancePath:acceptance.resolved,admissionReceipt:receipt.value,videoPath:video});
  return {blenderTake,videoPath:video};
}
function publicProposal(proposal){const {_donor,...safe}=proposal;return canonicalize(safe);}
function proposalIdentity(proposal){return hashCanonical(publicProposal(proposal),proposal?.fullSongForm?"HauntedToaster-FrankenProposalPreview-v1":"HauntedToaster-FrankenProposalPreview-v0");}
function previewAssets(proposal,assetBindings={}){
  const byId=new Map((proposal?.materials||[]).map(material=>[material.materialId,material]));
  return canonicalize(Object.fromEntries(
    Object.entries(assetBindings)
      .filter(([materialId,filePath])=>["image","video"].includes(byId.get(materialId)?.kind)&&typeof filePath==="string"&&filePath)
      .map(([materialId,filePath])=>[materialId,{
        kind:byId.get(materialId).kind,
        url:pathToFileURL(path.resolve(filePath)).href,
      }]),
  ));
}
async function buildProposal(config,{getNextGenContext=null}={}){
  const {playdeck,sourcePaths}=await playdeckInputs(config?.deckPath,config?.worldRulePath,config?.playdeckAssetMapPath);
  const {blenderTake,videoPath}=await blenderInputs(config?.blenderAcceptancePath,config?.blenderReceiptPath,config?.blenderVideoPath);
  const fullSongForm=config?.fullSongForm?validateFullSongForm(config.fullSongForm):null;
  let nextGenContext=null;
  if(config?.nextGen?.enabled===true){
    if(typeof getNextGenContext!=="function")throw new TypeError("NextGen organ crossing is unavailable in this Franken service.");
    nextGenContext=await getNextGenContext({
      rootSeed:String(config?.seed||"franken-001"),
      albumContext:structuredClone(config.nextGen.albumContext||{}),
    });
    const expected=String(config.nextGen.expectedCrossingIdentity||"").trim();
    if(!expected||expected!==nextGenContext.crossingIdentity){
      throw new TypeError("Franken composition refuses stale or unreviewed NextGen organ crossing identity.");
    }
  }
  let proposal=composeFrankenProposal({
    playdeck,
    blenderTake,
    seed:String(config?.seed||"franken-001"),
    nextGenContext,
    fullSongForm,
  });
  if(config?.edits)proposal=applyFrankenEdits(proposal,config.edits);
  const reservoir=nextGenContext?frankenVideoDigestionReservoir(nextGenContext):{bindings:{}};
  return {
    proposal,
    assetBindings:{
      ...sourcePaths,
      [blenderTake.material.materialId]:videoPath,
      ...reservoir.bindings,
    },
  };
}
function createFrankenComposerService({rootDir,getNextGenContext=null}={}){
  const outputRoot=path.resolve(rootDir||path.join(process.cwd(),"FrankenComposer"));
  return Object.freeze({
    deriveFullSongForm(input){return deriveFullSongForm(input);},
    deriveListeningField(input){return deriveListeningField(input);},
    async compose(config){const {proposal,assetBindings}=await buildProposal(config,{getNextGenContext});return {proposalIdentity:proposalIdentity(proposal),proposal:publicProposal(proposal),previewAssets:previewAssets(proposal,assetBindings)};},
    async freeze(config){const {proposal,assetBindings}=await buildProposal(config,{getNextGenContext});const identity=proposalIdentity(proposal);if(typeof config?.expectedProposalIdentity!=="string"||config.expectedProposalIdentity!==identity)throw new TypeError("Franken freeze refuses stale or unreviewed proposal identity.");const frozen=freezeFrankenComposition(proposalToComposition(proposal));return {...frozen,assetBindings};},
    async derivePerformanceEcology(receipt){
      const validated=validateOnePassReceipt(receipt);
      const trace=compilePerformanceTrace(validated);
      const residueMemory=compileResidueMemory(trace);
      return canonicalize({
        schema:"static-collective/performance-ecology-preview/v0",
        authority:"proposal-preview-only",
        performanceHash:validated.performanceHash,
        trace,
        residueMemory,
      });
    },
    async writeOnePassReceipt(receipt){
      const validated=validateOnePassReceipt(receipt);
      const dir=path.join(outputRoot,"one-pass");
      const receiptPath=path.join(dir,`${validated.performanceHash}.one-pass.json`);
      const bytes=canonicalBytes(validated);
      await fs.mkdir(dir,{recursive:true});
      try{
        await fs.writeFile(receiptPath,bytes,{flag:"wx"});
        return {path:receiptPath,performanceHash:validated.performanceHash,existing:false};
      }catch(error){
        if(error?.code!=="EEXIST")throw error;
        const existing=await fs.readFile(receiptPath);
        if(!existing.equals(bytes))throw new Error("Existing ONE PASS receipt bytes do not match the sealed witness.");
        return {path:receiptPath,performanceHash:validated.performanceHash,existing:true};
      }
    },
    async writeProjectionBundle(config){const frozen=await this.freeze(config);const dir=path.join(outputRoot,frozen.planHash);await fs.mkdir(dir,{recursive:true});const planPath=path.join(dir,"franken-composition.json"),bindingsPath=path.join(dir,"asset-bindings.json");for(const [file,bytes] of [[planPath,canonicalBytes(frozen.plan)],[bindingsPath,Buffer.from(JSON.stringify(frozen.assetBindings,null,2)+"\n","utf8")]]){try{await fs.writeFile(file,bytes,{flag:"wx"});}catch(error){if(error?.code==="EEXIST")throw new Error("Franken projection bundle already exists; refusing overwrite.");throw error;}}return {directory:dir,planPath,assetBindingsPath:bindingsPath,planHash:frozen.planHash};}
  });
}
function registerFrankenComposerIpc(ipcMain,{dialog,getWindow,rootDir,assertAvailable=()=>{},getNextGenContext=null}={}){
  const service=createFrankenComposerService({rootDir,getNextGenContext});
  const choose=async(title,extensions)=>{assertAvailable();const result=await dialog.showOpenDialog(getWindow(),{title,properties:["openFile"],filters:[{name:title,extensions}]});return result.canceled?null:result.filePaths[0];};
  ipcMain.handle("franken:choose-deck",()=>choose("Choose Playdeck deck JSON",["json"]));
  ipcMain.handle("franken:choose-world-rule",()=>choose("Choose Playdeck world-rule JSON",["json"]));
  ipcMain.handle("franken:choose-playdeck-asset-map",()=>choose("Choose Playdeck local asset map",["json"]));
  ipcMain.handle("franken:choose-blender-acceptance",()=>choose("Choose Blender accepted-take JSON",["json"]));
  ipcMain.handle("franken:choose-blender-receipt",()=>choose("Choose Blender admission receipt JSON",["json"]));
  ipcMain.handle("franken:choose-blender-video",()=>choose("Choose Blender accepted take",["mp4"]));
  ipcMain.handle("franken:derive-full-song-form",(_event,input)=>{assertAvailable();return service.deriveFullSongForm(input);});
  ipcMain.handle("franken:derive-listening-field",(_event,input)=>{assertAvailable();return service.deriveListeningField(input);});
  ipcMain.handle("franken:compose",async(_event,config)=>{assertAvailable();return service.compose(config);});
  ipcMain.handle("franken:freeze",async(_event,config)=>{assertAvailable();const result=await service.freeze(config);return {plan:result.plan,planHash:result.planHash};});
  ipcMain.handle("franken:derive-performance-ecology",async(_event,receipt)=>{assertAvailable();return service.derivePerformanceEcology(receipt);});
  ipcMain.handle("franken:write-one-pass-receipt",async(_event,receipt)=>{assertAvailable();return service.writeOnePassReceipt(receipt);});
  ipcMain.handle("franken:write-projection-bundle",async(_event,config)=>{assertAvailable();return service.writeProjectionBundle(config);});
  return service;
}
module.exports={JSON_EXTENSIONS,VIDEO_EXTENSIONS,assertLocalFile,createFrankenComposerService,previewAssets,proposalIdentity,registerFrankenComposerIpc,validateOnePassReceipt};
