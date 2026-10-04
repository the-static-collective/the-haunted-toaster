"use strict";
const fs=require("node:fs/promises");
const path=require("node:path");
const crypto=require("node:crypto");
const {canonicalBytes,canonicalize,hashCanonical}=require("../generation/canonical.cjs");
const {adaptPlaydeck}=require("./adapters/playdeck.cjs");
const {adaptAcceptedBlenderTake}=require("./adapters/blender-take.cjs");
const {composeFrankenProposal,applyFrankenEdits,proposalToComposition}=require("./compose.cjs");
const {freezeFrankenComposition}=require("./freeze.cjs");

const JSON_EXTENSIONS=new Set([".json"]);
const VIDEO_EXTENSIONS=new Set([".mp4"]);

function sha256(bytes){return crypto.createHash("sha256").update(bytes).digest("hex");}
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
async function playdeckInputs(deckPath,worldRulePath){
  const deckRecord=await readJson(deckPath,"Playdeck deck JSON");
  const worldRecord=await readJson(worldRulePath,"Playdeck world-rule JSON");
  const deckDir=path.dirname(deckRecord.resolved);
  const sourceDigests={};
  const sourcePaths={};
  for(const card of deckRecord.value.cards||[]){
    if(typeof card?.source!=="string"||!card.source.trim())throw new TypeError("Every Playdeck card requires a local source path.");
    const source=path.resolve(deckDir,card.source);
    if(!inside(deckDir,source))throw new TypeError("Playdeck card sources must stay inside the selected deck folder.");
    const stat=await fs.stat(source);
    if(!stat.isFile())throw new TypeError(`Playdeck source is not a file: ${card.source}`);
    sourceDigests[card.source]=sha256(await fs.readFile(source));
    sourcePaths[`playdeck:${card.id}`]=source;
  }
  return {playdeck:adaptPlaydeck({deck:deckRecord.value,worldRule:worldRecord.value,sourceDigests}),sourcePaths};
}
async function blenderInputs(acceptancePath,admissionReceiptPath,videoPath){
  const acceptance=await readJson(acceptancePath,"Blender acceptance JSON");
  const receipt=await readJson(admissionReceiptPath,"Blender admission receipt JSON");
  const video=await assertLocalFile(videoPath,VIDEO_EXTENSIONS,"Blender accepted take");
  const blenderTake=adaptAcceptedBlenderTake({acceptance:acceptance.value,admissionReceipt:receipt.value,videoPath:video});
  return {blenderTake,videoPath:video};
}
function publicProposal(proposal){const {_donor,...safe}=proposal;return canonicalize(safe);}
function proposalIdentity(proposal){return hashCanonical(publicProposal(proposal),"HauntedToaster-FrankenProposalPreview-v0");}
async function buildProposal(config){
  const {playdeck,sourcePaths}=await playdeckInputs(config?.deckPath,config?.worldRulePath);
  const {blenderTake,videoPath}=await blenderInputs(config?.blenderAcceptancePath,config?.blenderReceiptPath,config?.blenderVideoPath);
  let proposal=composeFrankenProposal({playdeck,blenderTake,seed:String(config?.seed||"franken-001")});
  if(config?.edits)proposal=applyFrankenEdits(proposal,config.edits);
  return {proposal,assetBindings:{...sourcePaths,[blenderTake.material.materialId]:videoPath}};
}
function createFrankenComposerService({rootDir}={}){
  const outputRoot=path.resolve(rootDir||path.join(process.cwd(),"FrankenComposer"));
  return Object.freeze({
    async compose(config){const {proposal}=await buildProposal(config);return {proposalIdentity:proposalIdentity(proposal),proposal:publicProposal(proposal)};},
    async freeze(config){const {proposal,assetBindings}=await buildProposal(config);const identity=proposalIdentity(proposal);if(typeof config?.expectedProposalIdentity!=="string"||config.expectedProposalIdentity!==identity)throw new TypeError("Franken freeze refuses stale or unreviewed proposal identity.");const frozen=freezeFrankenComposition(proposalToComposition(proposal));return {...frozen,assetBindings};},
    async writeProjectionBundle(config){const frozen=await this.freeze(config);const dir=path.join(outputRoot,frozen.planHash);await fs.mkdir(dir,{recursive:true});const planPath=path.join(dir,"franken-composition.json"),bindingsPath=path.join(dir,"asset-bindings.json");for(const [file,bytes] of [[planPath,canonicalBytes(frozen.plan)],[bindingsPath,Buffer.from(JSON.stringify(frozen.assetBindings,null,2)+"\n","utf8")]]){try{await fs.writeFile(file,bytes,{flag:"wx"});}catch(error){if(error?.code==="EEXIST")throw new Error("Franken projection bundle already exists; refusing overwrite.");throw error;}}return {directory:dir,planPath,assetBindingsPath:bindingsPath,planHash:frozen.planHash};}
  });
}
function registerFrankenComposerIpc(ipcMain,{dialog,getWindow,rootDir,assertAvailable=()=>{}}={}){
  const service=createFrankenComposerService({rootDir});
  const choose=async(title,extensions)=>{assertAvailable();const result=await dialog.showOpenDialog(getWindow(),{title,properties:["openFile"],filters:[{name:title,extensions}]});return result.canceled?null:result.filePaths[0];};
  ipcMain.handle("franken:choose-deck",()=>choose("Choose Playdeck deck JSON",["json"]));
  ipcMain.handle("franken:choose-world-rule",()=>choose("Choose Playdeck world-rule JSON",["json"]));
  ipcMain.handle("franken:choose-blender-acceptance",()=>choose("Choose Blender accepted-take JSON",["json"]));
  ipcMain.handle("franken:choose-blender-receipt",()=>choose("Choose Blender admission receipt JSON",["json"]));
  ipcMain.handle("franken:choose-blender-video",()=>choose("Choose Blender accepted take",["mp4"]));
  ipcMain.handle("franken:compose",async(_event,config)=>{assertAvailable();return service.compose(config);});
  ipcMain.handle("franken:freeze",async(_event,config)=>{assertAvailable();const result=await service.freeze(config);return {plan:result.plan,planHash:result.planHash};});
  ipcMain.handle("franken:write-projection-bundle",async(_event,config)=>{assertAvailable();return service.writeProjectionBundle(config);});
  return service;
}
module.exports={JSON_EXTENSIONS,VIDEO_EXTENSIONS,assertLocalFile,createFrankenComposerService,proposalIdentity,registerFrankenComposerIpc};
