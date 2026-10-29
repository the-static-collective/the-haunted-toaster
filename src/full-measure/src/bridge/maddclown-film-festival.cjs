"use strict";
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");
const {inspectOffer,describe}=require("./jarvis-native.cjs");
const {createCandidateSession}=require("../candidate-session.cjs");
const {inspectAudio}=require("../render/analyze.cjs");
const {renderVideo}=require("../render/render.cjs");
const {resolveFfmpeg,runProcess}=require("../render/tooling.cjs");

const ID="toaster.maddclown-six-film-cinema/v1";
const ROLES=Object.freeze([
 ["ANCHOR","THE GHOST'S FIRST TRANSMISSION"],
 ["WILDCARD","MIDNIGHT AT THE CROOKED ELEVATOR"],
 ["GHOST","THE PHANTOM IN THE RADIO"],
 ["STOMP","BRICK DUST ON THE MOON"],
 ["FRONTIER","THE BLUE ROSE ENGINE"],
 ["CROSSROADS","TOMORROW ARRIVED YESTERDAY"]
]);
const hex=x=>crypto.createHash("sha256").update(x).digest("hex");
function hold(message){throw Error("HOLD_"+message)}
function hashFile(p){
 const fd=fs.openSync(p,"r");try{
  const h=crypto.createHash("sha256"),buf=Buffer.alloc(1024*1024);
  let count;
  while((count=fs.readSync(fd,buf,0,buf.length,null))>0)h.update(buf.subarray(0,count));
  return "sha256:"+h.digest("hex");
 }finally{fs.closeSync(fd)}
}
function args(argv){
 const [action,...rest]=argv,flags={};
 if(action!=="festival"||rest.length%2)hold("FESTIVAL_ONLY");
 const allowed=["--jarvis","--offer","--audio","--out","--fixture-keeps"];
 for(let i=0;i<rest.length;i+=2){
  if(!allowed.includes(rest[i])||!rest[i+1]||Object.hasOwn(flags,rest[i]))
   hold("FESTIVAL_FLAG");
  flags[rest[i]]=rest[i+1];
 }
 if(Object.keys(flags).sort().join(",")!==allowed.sort().join(","))
  hold("FESTIVAL_REQUIRED_FIELDS");
 if(flags["--fixture-keeps"]!=="SYNTHETIC_SIX_KEEP_TEST_NOT_A_HUMAN")
  hold("NO_IMPLICIT_HUMAN_KEEP");
 return flags;
}
function assertOutput(requested,sourceDir,jarvisDir){
 const dest=path.resolve(requested);
 for(const root of [sourceDir,jarvisDir]){
  const rel=path.relative(root,dest);
  if(!rel||(!rel.startsWith(".."+path.sep)&&rel!==".."&&!path.isAbsolute(rel)))
   hold("OUTPUT_WITHIN_SOURCE_TREE");
 }
 const parent=path.dirname(dest);
 if(!fs.existsSync(parent)||fs.realpathSync(parent)!==parent)hold("OUTPUT_PARENT_REQUIRED_NON_SYMLINK");
 if(fs.existsSync(dest))hold("OUTPUT_ALREADY_EXISTS");
 return dest;
}
function fixtureKeep(session,original,index){
 const before=session.select({familyHash:original.familyHash,index});
 if(before.continuationPermission===true)hold("FOCUS_CONFERRED_AUTHORITY");
 const kept=session.keep({familyHash:original.familyHash,index});
 if(kept.verdict!=="KEEP"||kept.continuationPermission!==true||
    kept.scoreAddress!==before.scoreAddress||kept.timelineHash!==before.timelineHash)
  hold("NATIVE_KEEP_NOT_EXACT");
 return kept;
}
function filmMetadata(kept,result,index,fileName,outputDir){
 if(!result?.receipt?.validation?.accepted)hold("NATIVE_RENDER_NOT_ACCEPTED");
 const c=result.receipt.canonicalExecution;
 if(c?.scoreAddress!==kept.scoreAddress||c?.timelineHash!==kept.timelineHash)
  hold("NATIVE_VISUALSCORE_TIMELINE_MISMATCH");
 const p=path.join(outputDir,fileName);
 if(!fs.existsSync(p)||fs.statSync(p).size<100)hold("NATIVE_MP4_ABSENT");
 return {index,role:ROLES[index][0],title:ROLES[index][1],file:fileName,
  poster:"native-"+index+".png",sizeBytes:fs.statSync(p).size,sha256:hashFile(p),
  scoreAddress:kept.scoreAddress,timelineHash:kept.timelineHash,
  nativeKeepReceipt:kept.receipt,canonicalExecution:c,
  nativeReceiptFile:"film-"+index+".receipt.json",
  selectedBy:"SCRIPTED_SYNTHETIC_FIXTURE_KEEP_ONLY",
  rightsVerified:false,externalPublication:false};
}
function summary({offer,source,audioHash,native,films,reel=null}){
 const manifest={
  schema:ID,
  title:"MADDCL0WN / THE SIX UNBORN MOVIES",
  description:"Six distinct native Haunted Toaster films from one originally kept JAR;VIS radio creature",
  sourceOwner:"the-static-collective/the-haunted-toaster",
  jarvisSourceCommit:source.commit,
  jarvisOfferDigest:offer.offerDigest,
  jarvisCreatureDigest:offer.selectedCreature.creatureDigest,
  audioSha256:audioHash,
  nativeFamilyHash:native.familyHash,
  nativeCandidateCount:6,
  films,
  reel,
  proofScope:"ORIGINAL_SOFTWARE_AND_FICTIONAL_MEDIA_EXECUTION_ONLY",
  authorship:"FICTIONAL_SYNTHETIC_CREATIVE_TEST",
  nativeKeepMeaning:"SIX_SCRIPTED_FIXTURE_KEEPS_NOT_SIX_HUMAN_DECISIONS",
  userConsentNotAuthenticated:true,
  sourceRightsNotVerified:true,
  publicationAuthorized:false,
  externalDispatch:false,
  humanOutcomeVerified:false
 };
 return {...manifest,manifestDigest:"sha256:"+hex(JSON.stringify(manifest))};
}
function writeCinema(outputDir,manifest){
 const assets=path.resolve(__dirname,"../../cinema");
 for(const name of ["index.html","cinema.css","cinema.js"]){
  const src=path.join(assets,name);
  if(!fs.statSync(src).isFile())hold("CINEMA_ASSET_MISSING");
  fs.copyFileSync(src,path.join(outputDir,name),fs.constants.COPYFILE_EXCL);
 }
 // static external manifest file works from file:// without fetch/CORS
 const js="window.MADDCL0WN_CINEMA_MANIFEST = Object.freeze("+JSON.stringify(manifest)+");\n";
 fs.writeFileSync(path.join(outputDir,"manifest.js"),js,{flag:"wx",mode:0o600});
 fs.writeFileSync(path.join(outputDir,"manifest.json"),JSON.stringify(manifest,null,2)+"\n",{flag:"wx",mode:0o600});
}
async function makeReel(dir,films,audioHash){
 const inputs=path.join(dir,"reel-inputs.txt");
 // Inputs are fixed internal names; no arbitrary paths or shell expansion.
 fs.writeFileSync(inputs,films.map(({file})=>"file '"+file+"'").join("\n")+"\n",{flag:"wx"});
 const out=path.join(dir,"six-unborn-movies.mp4");
 await runProcess(resolveFfmpeg(),[
  "-hide_banner","-loglevel","error","-y",
  "-f","concat","-safe","0","-i",inputs,"-c","copy","-movflags","+faststart",out
 ]);
 if(!fs.statSync(out).size)hold("CONCAT_OUTPUT_EMPTY");
 return {file:"six-unborn-movies.mp4",sha256:hashFile(out),
  sizeBytes:fs.statSync(out).size,filmIndices:films.map(f=>f.index),
  mode:"VIDEO_SEQUENCE_CONCATENATION_NO_NEW_CREATIVE_AUTHORITY",
  audioSourceHash:audioHash};
}
async function perform(argv){
 const f=args(argv),ownerRoot=path.resolve(__dirname,"../..");
 const jarvisRoot=fs.realpathSync(path.resolve(f["--jarvis"]));
 const {source,verification,offer}=inspectOffer({jarvisRoot,offerPath:f["--offer"]});
 if(verification.permissionToRender!==false||offer.sourceMedia?.permissionForToasterKeep!==false)
  hold("RECEIVER_NOT_AUTHORIZED_BY_FOREIGN_KEEP");
 const audio=fs.realpathSync(path.resolve(f["--audio"]));
 const st=fs.statSync(audio);
 if(!st.isFile()||st.size<100||st.size>300*1024*1024)hold("BOUND_AUDIO_FILE");
 const audioHash=hashFile(audio);
 const dest=assertOutput(f["--out"],ownerRoot,jarvisRoot);
 const analysis=await inspectAudio(audio);
 const session=createCandidateSession();
 session.noteAudio(audio,analysis);
 const seed=hex("maddclown-six-film-v1|"+offer.offerDigest+"|"+offer.selectedCreature.seed);
 const presetId="wireOrchard",toastFeelId="wire-heat";
 const title="MADDCL0WN / SIX UNBORN MOVIES",artist="Static Collective / Fictional CI";
 const original=await session.generate({
  rootSeed:seed,presetId,title,artist,lyrics:"",toastFeelId
 });
 const native=describe(original);
 if(!native.candidates.every(c=>c.previewPresent)||new Set(native.candidates.map(c=>c.scoreAddress)).size!==6||
   new Set(native.candidates.map(c=>c.timelineHash)).size!==6)
  hold("SIX_DISTINCT_NATIVE_VISUALSCORES_REQUIRED");
 fs.mkdirSync(dest,{mode:0o700});
 const films=[];
 for(let i=0;i<6;i++){
  const data=original.candidates[i].thumbnailDataUrl;
  fs.writeFileSync(path.join(dest,"native-"+i+".png"),
   Buffer.from(data.slice("data:image/png;base64,".length),"base64"),{flag:"wx"});
 }
 for(let i=0;i<6;i++){
  const kept=fixtureKeep(session,original,i);
  const execution=session.executionForRender({audioPath:audio,imagePath:null,presetId,toastFeelId});
  if(execution?.resolvedTimeline?.timelineHash!==kept.timelineHash||
     execution?.candidateGenealogy?.scoreAddress!==kept.scoreAddress)
   hold("EXECUTION_NOT_KEPT_CANDIDATE");
  const file="film-"+i+".mp4";
  const result=await renderVideo({...execution,audioPath:audio,
   outputPath:path.join(dest,file),presetId,title:ROLES[i][1],artist,
   width:640,height:360,fps:24,encoderPreset:"ultrafast",crf:28});
  const info=filmMetadata(kept,result,i,file,dest);
  fs.writeFileSync(path.join(dest,info.nativeReceiptFile),
   JSON.stringify(result.receipt,null,2)+"\n",{flag:"wx"});
  films.push(info);
 }
 const reel=await makeReel(dest,films,audioHash);
 const manifest=summary({offer,source,audioHash,native,films,reel});
 writeCinema(dest,manifest);
 return {schema:ID,outputDir:dest,numberOfFilms:films.length,
  nativeFamilyHash:native.familyHash,manifestDigest:manifest.manifestDigest,
  audioSha256:audioHash,videoReel:reel.file,filmHashes:films.map(f=>f.sha256),
  proofScope:manifest.proofScope,fixtureOnly:true};
}
module.exports={ID,ROLES,args,fixtureKeep,filmMetadata,summary,perform};
