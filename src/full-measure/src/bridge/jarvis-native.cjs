"use strict";
const crypto=require("node:crypto");
const fs=require("node:fs");
const path=require("node:path");
const {execFileSync}=require("node:child_process");

const JARVIS_PIN="b3c1ffeb77c5362aa735eb60b57dbe1e220ef904";
const JARVIS_REPOSITORY="https://github.com/the-static-collective/JAR-VIS";
const FILES=["src/cabaret/slots.mjs","src/cabaret/toaster-offer.mjs","tools/toaster-offer.mjs"];
const sha=bytes=>crypto.createHash("sha256").update(bytes).digest("hex");
function refuse(reason){throw Error("HOLD_"+reason)}
function sourceGit(root,...args){
 return execFileSync("git",["--no-replace-objects","-C",root,...args],
  {encoding:"utf8",timeout:15000,maxBuffer:1024*1024,
   env:{...process.env,GIT_NO_REPLACE_OBJECTS:"1"}}).trim();
}
function inspectJarvisRoot(input){
 const root=fs.realpathSync(path.resolve(input));
 if(sourceGit(root,"rev-parse","HEAD")!==JARVIS_PIN)refuse("JARVIS_EXACT_SOURCE_PIN");
 const origin=sourceGit(root,"remote","get-url","origin")
  .replace(/\.git$/,"").replace(/\/$/,"");
 if(origin!==JARVIS_REPOSITORY)refuse("JARVIS_ORIGIN_MISMATCH");
 const state=sourceGit(root,"status","--porcelain","--untracked-files=all");
 const untracked=state.split("\n").filter(Boolean);
 if(untracked.some(line=>!line.startsWith("?? node_modules/")&&!line.startsWith("?? .local/")))
  refuse("JARVIS_SOURCE_WORKTREE_CHANGED");
 for(const file of FILES){
  const expected=sourceGit(root,"rev-parse","HEAD:"+file);
  const live=path.join(root,file);
  if(!fs.statSync(live).isFile()||fs.realpathSync(live)!==live)refuse("JARVIS_NONREGULAR_SOURCE");
  const actual=sourceGit(root,"hash-object",live);
  if(expected!==actual)refuse("JARVIS_SOURCE_BYTES_CHANGED");
 }
 return {schema:"toaster.jarvis-source-observation/v1",
  repository:JARVIS_REPOSITORY,commit:JARVIS_PIN,
  verifiedSourceFiles:FILES,
  authority:"READ_ONLY_ORIGINAL_JARVIS_REPLAY",
  sourceRightsVerified:false};
}
function inspectOffer({jarvisRoot,offerPath}){
 const source=inspectJarvisRoot(jarvisRoot);
 const target=path.resolve(offerPath);
 if(!fs.statSync(target).isFile()||fs.statSync(target).size>65536)refuse("LOCAL_OFFER_SIZE");
 const output=execFileSync(process.execPath,[path.join(jarvisRoot,"tools/toaster-offer.mjs"),"verify-file",target],{
  encoding:"utf8",timeout:30000,maxBuffer:32768,stdio:["ignore","pipe","pipe"],
  env:{...process.env,NODE_OPTIONS:"",GIT_NO_REPLACE_OBJECTS:"1"}
 });
 const verification=JSON.parse(output);
 if(verification.schema!=="jarvis.toaster-native-offer-verification/v1"||
  verification.permissionToRender!==false||verification.toasterKeepAuthorized!==false||
  verification.mediaProvided!==false||verification.externalDispatch!==false)
  refuse("FOREIGN_VERIFIER_CLAIMS_TOO_MUCH");
 const offer=JSON.parse(fs.readFileSync(target,"utf8"));
 if(verification.offerDigest!==offer.offerDigest||
    verification.creatureDigest!==offer.selectedCreature?.creatureDigest)
  refuse("FOREIGN_VERIFIER_IDENTITY_MISMATCH");
 return {source,verification,offer};
}
function parseArgs(argv){
 const [action,...tail]=argv;
 if(!["inspect","preview","render"].includes(action)||tail.length%2)refuse("USAGE_INSPECT_PREVIEW_RENDER");
 const flags={};
 for(let i=0;i<tail.length;i+=2){
  const name=tail[i],value=tail[i+1];
  if(!["--jarvis","--offer","--audio","--out","--native-keep-index","--authorize"].includes(name)||
    typeof value!=="string"||!value||Object.hasOwn(flags,name))refuse("UNKNOWN_OR_DUPLICATE_FLAG");
  flags[name]=value;
 }
 const expected=action==="inspect"?["--jarvis","--offer"]:
  action==="preview"?["--jarvis","--offer","--audio","--out"]:
  ["--jarvis","--offer","--audio","--out","--native-keep-index","--authorize"];
 if(Object.keys(flags).sort().join("|")!==expected.sort().join("|"))refuse("ACTION_FLAG_SET");
 if(action==="render"&&
    flags["--authorize"]!=="I_KEEP_THIS_NATIVE_TOASTER_CANDIDATE")
  refuse("SECOND_NATIVE_KEEP_REQUIRED");
 if(action==="render"&& !/^[0-5]$/.test(flags["--native-keep-index"]))
  refuse("NATIVE_KEEP_INDEX_0_TO_5");
 return {action,flags};
}
function inputMedia(file){
 const resolved=fs.realpathSync(path.resolve(file));
 const st=fs.lstatSync(resolved);
 if(!st.isFile()||st.size>300*1024*1024||st.size<100)refuse("AUDIO_FILE_REQUIRED");
 return {path:resolved,bytes:st.size,sha256:sha(fs.readFileSync(resolved))};
}
function outputDir(requested,sourceRoot,jarvisRoot){
 const dest=path.resolve(requested);
 for(const root of [sourceRoot,jarvisRoot]){
  const rel=path.relative(path.resolve(root),dest);
  if(rel===""||(!rel.startsWith(".."+path.sep)&&rel!==".."&&!path.isAbsolute(rel)))
   refuse("OUTPUT_MUST_BE_OUTSIDE_SOURCE_ROOTS");
 }
 const parent=fs.realpathSync(path.dirname(dest));
 if(parent!==path.dirname(dest))refuse("OUTPUT_PARENT_SYMLINK");
 fs.mkdirSync(dest,{recursive:false,mode:0o700});
 return dest;
}
function describe(family){
 if(family.producedCount!==6||family.candidates.length!==6)refuse("NATIVE_SIX_UP_MISSING");
 return {schema:"toaster.native-six-up-observation/v1",
  familyHash:family.familyHash,
  candidates:family.candidates.map(c=>({
   index:c.index,scoreAddress:c.scoreAddress,timelineHash:c.timelineHash,
   previewPresent:typeof c.thumbnailDataUrl==="string"&&
     c.thumbnailDataUrl.startsWith("data:image/png;base64,")
  }))};
}
async function execute(options){
 const {action,flags}=parseArgs(options);
 const sourceRoot=path.resolve(__dirname,"../..");
 const jarvisRoot=fs.realpathSync(path.resolve(flags["--jarvis"]));
 const {source,verification,offer}=inspectOffer({jarvisRoot,offerPath:flags["--offer"]});
 if(action==="inspect")return {source,verification,
  status:"OFFER_REPLAYED_NO_MEDIA_OR_NATIVE_SCORE",externalDispatch:false};
 const audio=inputMedia(flags["--audio"]);
 // Native Toaster is responsible for VisualScore, timeline and render.
 // JAR;VIS seed only suggests a deterministic creative neighborhood.
 const {createCandidateSession}=require("../src/candidate-session.cjs");
 const {inspectAudio}=require("../src/render/analyze.cjs");
 const {renderVideo}=require("../src/render/render.cjs");
 const analysis=await inspectAudio(audio.path);
 const session=createCandidateSession();
 session.noteAudio(audio.path,analysis);
 const rootSeed=sha("toaster-stranger-v1|"+offer.offerDigest+"|"+offer.selectedCreature.seed);
 const presetId="wireOrchard";
 const title="GHOST COWBOY / "+offer.selectedCreature.species.slice(0,54);
 const artist="Static Collective / Fictional Local Experiment";
 const native=await session.generate({rootSeed,presetId,title,artist,lyrics:"",toastFeelId:"wire-heat"});
 const observed=describe(native);
 const dir=outputDir(flags["--out"],sourceRoot,jarvisRoot);
 for(let i=0;i<6;i++){
  const data=native.candidates[i].thumbnailDataUrl;
  if(!data?.startsWith("data:image/png;base64,"))refuse("NATIVE_PREVIEW_MISSING");
  fs.writeFileSync(path.join(dir,"native-"+i+".png"),Buffer.from(data.split(",")[1],"base64"),{flag:"wx"});
 }
 const metadata={
  schema:"toaster.stranger-native-crossing/v1",mode:action,
  jarvisSource:source,jarvisOfferDigest:verification.offerDigest,
  jarvisCreatureDigest:verification.creatureDigest,
  sourceRightStatus:"NOT_VERIFIED",
  audioSha256:"sha256:"+audio.sha256,
  nativeRootSeed:rootSeed,
  nativeFamily:observed,
  externalDispatch:false,
  humanOutcomeVerified:false
 };
 if(action==="preview"){
  const result={...metadata,rendered:false,nativeKeep:false,
   status:"NATIVE_TOASTER_SIX_UP_PREVIEWED_KEEP_NOT_GRANTED"};
  fs.writeFileSync(path.join(dir,"crossing-receipt.json"),JSON.stringify(result,null,2)+"\n",{flag:"wx"});
  return result;
 }
 const nativeIndex=Number(flags["--native-keep-index"]);
 const focused=session.select({familyHash:native.familyHash,index:nativeIndex});
 const kept=session.keep({familyHash:native.familyHash,index:nativeIndex});
 if(kept.scoreAddress!==focused.scoreAddress||kept.timelineHash!==focused.timelineHash||
   kept.continuationPermission!==true)refuse("NATIVE_KEEP_FAILED");
 const execution=session.executionForRender({audioPath:audio.path,imagePath:null,presetId,toastFeelId:"wire-heat"});
 if(!execution||execution.resolvedTimeline?.timelineHash!==kept.timelineHash)
  refuse("NATIVE_TIMELINE_IDENTITY_FAILED");
 const result=await renderVideo({...execution,audioPath:audio.path,
  outputPath:path.join(dir,"native-kept.mp4"),presetId,title,artist,
  width:640,height:360,fps:24,encoderPreset:"ultrafast",crf:28});
 if(!result.receipt?.validation?.accepted||
    result.receipt.canonicalExecution?.scoreAddress!==kept.scoreAddress||
    result.receipt.canonicalExecution?.timelineHash!==kept.timelineHash)
  refuse("NATIVE_PRODUCTION_RECEIPT_MISMATCH");
 const receipt={...metadata,rendered:true,nativeKeep:true,
  nativeKeptIndex:nativeIndex,nativeKeptScoreAddress:kept.scoreAddress,
  nativeKeptTimelineHash:kept.timelineHash,
  nativeRenderReceipt:result.receipt,
  status:"NATIVE_TOASTER_RENDERED_FROM_SEPARATE_EXPLICIT_KEEP",
  permissionToPublish:false,sourceRightsVerified:false};
 fs.writeFileSync(path.join(dir,"crossing-receipt.json"),JSON.stringify(receipt,null,2)+"\n",{flag:"wx"});
 return {...receipt,nativeRenderReceipt:{canonicalExecution:result.receipt.canonicalExecution,
  validation:result.receipt.validation},outputVideo:path.join(dir,"native-kept.mp4")};
}
module.exports={JARVIS_PIN,parseArgs,inspectJarvisRoot,inspectOffer,describe,execute};
