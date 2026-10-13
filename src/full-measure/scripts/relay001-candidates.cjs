#!/usr/bin/env node
"use strict";
// RELAY-001 organ 8. Native Toaster, source-locked six-up; no KEEP, render or publication.
const fs=require("node:fs");
const fsp=require("node:fs/promises");
const path=require("node:path");
const crypto=require("node:crypto");
const {createCandidateSession}=require("../src/candidate-session.cjs");
const {inspectAudio}=require("../src/render/analyze.cjs");

function fail(message){throw new Error(message);}
function sha(bytes){return crypto.createHash("sha256").update(bytes).digest("hex");}
async function fileSha(p){const h=crypto.createHash("sha256");for await(const c of fs.createReadStream(p))h.update(c);return h.digest("hex");}
function canonical(v){if(v===null||typeof v!=="object")return JSON.stringify(v);if(Array.isArray(v))return "["+v.map(canonical).join(",")+"]";return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}";}
function options(args){const a={};for(let i=0;i<args.length;i+=2){const k=args[i];if(!k.startsWith("--")||!args[i+1]||args[i+1].startsWith("--"))fail("Usage: --audio FILE --out DIR [--mission planZ.json] [--artwork FILE] [--lyrics FILE]");a[k.slice(2)]=args[i+1];}return a;}
const EXPECTED_ORIGINAL="6ae3a6916c6214f7582da048246596d36a6cf355effe1dd68c47d685fef3acc6";

async function produce(a){
  if(!a.audio||!a.out)fail("--audio and --out required");
  const media=path.resolve(a.audio);
  const sourceHash=await fileSha(media);
  let plan=null;
  if(a.mission){
    plan=JSON.parse(await fsp.readFile(a.mission,"utf8"));
    const {id,...body}=plan;
    if(plan.schema!=="planz/relay-mission-offer/v0"||
       id!=="sha256:"+sha(Buffer.from("planz-RelayMissionOffer-v0|"+canonical(body)))||
       plan.source_particular_sha256!=="sha256:"+sourceHash||
       plan.selection_policy?.next_offer!=="the-haunted-toaster"||
       plan.shortlist?.[0]?.candidate!=="the-haunted-toaster"||
       plan.shortlist[0].status!=="PROPOSED_NOT_EXECUTED"||
       plan.shortlist[0].execution_authorized!==false||
       plan.required_next_gate?.render_authorized!==false||
       plan.no_canon_admission!==true)
      fail("PLANZ_MISSION_INVALID_OR_NOT_THIS_SOURCE");
    if(sourceHash!==EXPECTED_ORIGINAL)fail("RELAY001_ORIGINAL_SONG_DIGEST_MISMATCH");
  }
  const out=path.resolve(a.out);
  if(fs.existsSync(out)&&fs.readdirSync(out).length)fail("OUTPUT_NOT_EMPTY");
  const artwork=a.artwork?path.resolve(a.artwork):null;
  const lyrics=a.lyrics?await fsp.readFile(a.lyrics,"utf8"):"";
  const artSha=artwork?await fileSha(artwork):null;
  const lyricSha=a.lyrics?sha(Buffer.from(lyrics,"utf8")):null;
  const analysis=await inspectAudio(media);
  if(!analysis?.audio||!Number.isFinite(analysis.duration)||analysis.duration<1)fail("AUDIO_PROBE_REFUSED");
  const session=createCandidateSession();
  session.noteAudio(media,analysis);
  if(artwork)session.noteImage(artwork);
  const config={rootSeed:"relay001-blue-night:"+sourceHash,presetId:"porchlight",
    title:"Blue Night Morning Bloom",artist:"The Static Collective",
    lyrics,toastFeelId:"porch-ghost"};
  const family=await session.generate(config);
  if(family.producedCount!==6||family.candidates?.length!==6||family.forcedWitness===true)
    fail("NOT_AN_ORDINARY_SIX_UP");
  if(new Set(family.candidates.map(c=>c.scoreAddress)).size!==6)fail("NON_UNIQUE_SCORES");
  // Do not select, KEEP, SCRAPE, invoke final render, or call a public service.
  await fsp.mkdir(out,{recursive:true});
  const candidates=[];
  for(const [i,c] of family.candidates.entries()){
    const match=/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(c.thumbnailDataUrl);
    if(!match)fail("NATIVE_PREVIEW_NOT_PNG");
    const img=Buffer.from(match[1],"base64");
    if(img.length<100||!img.subarray(0,8).equals(Buffer.from("89504e470d0a1a0a","hex")))fail("PREVIEW_PNG_CORRUPT");
    const filename="candidate-"+String(i+1).padStart(2,"0")+".png";
    await fsp.writeFile(path.join(out,filename),img,{flag:"wx"});
    const {thumbnailDataUrl,...nativeCandidate}=c;
    candidates.push({index:i+1,role:c.role,signature:c.signature,scoreAddress:c.scoreAddress,
      timelineHash:c.timelineHash,preview:filename,previewSha256:"sha256:"+sha(img),
      nativeCandidate});
  }
  const body={schema:"static-relay/haunted-toaster-six-up/v0",
    mission:"relay-001-blue-night-morning-bloom",organ:"the-haunted-toaster",
    sourceMediaSha256:"sha256:"+sourceHash,planZOfferId:plan?.id??null,
    exactPlanOfferValidated:!!plan,artworkSha256:artSha?"sha256:"+artSha:null,
    lyricsSha256:lyricSha?"sha256:"+lyricSha:null,
    sourceRepo:"the-static-collective/the-haunted-toaster",sourceRef:process.env.RELAY_TOASTER_SOURCE_REF||"unspecified-local-revision",
    conditions:{rootSeed:config.rootSeed,presetId:config.presetId,toastFeelId:config.toastFeelId,
      usesOriginalAudio:true,usesEmbeddedCover:!!artwork,
      lyricsTiming:lyrics?"untimed supplied text, approximate":"none"},
    analysis:{durationSeconds:analysis.duration,audio:analysis.audio,
      sections:analysis.sections?.map(s=>({start:s.start,end:s.end,energy:s.energy,label:s.label}))??[]},
    familyHash:family.familyHash,producedCount:family.producedCount,
    candidates:candidates,
    humanDecision:null,renderAuthorized:false,finalRenderPerformed:false,
    canonAdmitted:false,published:false,rightsTransferred:false,
    verificationScope:"actual native candidate session and PNG previews; no KEEP/SCRAPE, no final render"};
  // Hash exactly the JSON-serializable representation that will be written.
  // Native optional undefined fields must not silently change the signed address.
  const serialized=JSON.parse(JSON.stringify(body));
  const result={...serialized,reportSha256:"sha256:"+sha(Buffer.from(canonical(serialized)))};
  await fsp.writeFile(path.join(out,"six-up.json"),JSON.stringify(result,null,2)+"\n",{flag:"wx"});
  console.log(JSON.stringify({result:"SIX_NATIVE_CANDIDATES_HELD",familyHash:family.familyHash,
    sourceSha256:sourceHash,candidates:candidates.map(x=>({index:x.index,role:x.role,score:x.scoreAddress,
      previewSha256:x.previewSha256})),noRender:true,out},null,2));
}
produce(options(process.argv.slice(2))).catch(err=>{console.error("RELAY001_TOASTER_REFUSED: "+err.stack);process.exitCode=1;});
