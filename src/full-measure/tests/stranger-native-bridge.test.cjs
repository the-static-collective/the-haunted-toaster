"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const os=require("node:os");
const {execFileSync}=require("node:child_process");
const bridge=require("../src/bridge/jarvis-native.cjs");
const pin="b3c1ffeb77c5362aa735eb60b57dbe1e220ef904";
const p={jarvis:"/tmp/jarvis",offer:"/tmp/offer.json",audio:"/tmp/tone.wav",out:"/tmp/output"};
test("source owner receiver pins an immutable original JAR;VIS source, not main",()=>{
 assert.equal(bridge.JARVIS_PIN,pin);
 assert.throws(()=>bridge.inspectJarvisRoot("/nothing/to-inspect"));
});
test("inspection cannot become a native KEEP through any extra flags",()=>{
 assert.deepEqual(bridge.parseArgs(["inspect","--jarvis",p.jarvis,"--offer",p.offer]).action,"inspect");
 for(const argv of [
  ["inspect","--jarvis",p.jarvis,"--offer",p.offer,"--authorize","I_KEEP_THIS_NATIVE_TOASTER_CANDIDATE"],
  ["preview","--jarvis",p.jarvis,"--offer",p.offer,"--audio",p.audio,"--out",p.out,"--native-keep-index","1"],
  ["render","--jarvis",p.jarvis,"--offer",p.offer,"--audio",p.audio,"--out",p.out,"--native-keep-index","0"],
  ["render","--jarvis",p.jarvis,"--offer",p.offer,"--audio",p.audio,"--out",p.out,"--native-keep-index","0","--authorize","JARVIS_KEEP"],
  ["render","--jarvis",p.jarvis,"--offer",p.offer,"--audio",p.audio,"--out",p.out,"--native-keep-index","7","--authorize","I_KEEP_THIS_NATIVE_TOASTER_CANDIDATE"],
  ["submit","--jarvis",p.jarvis,"--offer",p.offer],
 ]) assert.throws(()=>bridge.parseArgs(argv),/HOLD_/);
 const valid=bridge.parseArgs(["render","--jarvis",p.jarvis,"--offer",p.offer,"--audio",p.audio,"--out",p.out,
  "--native-keep-index","2","--authorize","I_KEEP_THIS_NATIVE_TOASTER_CANDIDATE"]);
 assert.equal(valid.action,"render");
});
test("native Toaster family inspection requires real six native candidates",()=>{
 assert.throws(()=>bridge.describe({producedCount:0,candidates:[]}),/HOLD_NATIVE_SIX_UP_MISSING/);
 const fake={producedCount:6,familyHash:"native-only",
  candidates:Array.from({length:6},(_,i)=>({index:i,
   scoreAddress:"native-score-"+i,timelineHash:"native-timeline-"+i,
   thumbnailDataUrl:"data:image/png;base64,AA=="}))};
 const described=bridge.describe(fake);
 assert.equal(described.candidates.length,6);
 assert.equal(described.candidates[3].previewPresent,true);
});
const source=process.env.JARVIS_ROOT;
test("original JAR;VIS code independently replays an offer; forged bytes fail",
 {skip:source?false:"JARVIS_ROOT exact source checkout needed"},()=>{
  const verified=bridge.inspectJarvisRoot(source);
  assert.equal(verified.commit,pin);
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"toaster-bridge-test-"));
  try{
   const program=`import {replaySlots} from '${source}/src/cabaret/slots.mjs';
import {createOffer} from '${source}/src/cabaret/toaster-offer.mjs';
const question="Can a ghost cowboy make a little movie?";
const answer="Original local attendant rules; no verified human effects.";
const first=replaySlots({question,answer});
process.stdout.write(JSON.stringify(createOffer({question,answer,intents:[{kind:"KEEP",candidateId:first.family.creatures[0].id}]})));`;
   const offer=JSON.parse(execFileSync(process.execPath,["--input-type=module","-e",program],{encoding:"utf8"}));
   const file=path.join(tmp,"offer.json");
   fs.writeFileSync(file,JSON.stringify(offer));
   const first=bridge.inspectOffer({jarvisRoot:source,offerPath:file});
   assert.equal(first.verification.offerDigest,offer.offerDigest);
   assert.equal(first.verification.permissionToRender,false);
   offer.selectedCreature.seed="sha256:"+"f".repeat(64);
   fs.writeFileSync(file,JSON.stringify(offer));
   assert.throws(()=>bridge.inspectOffer({jarvisRoot:source,offerPath:file}));
  }finally{fs.rmSync(tmp,{force:true,recursive:true})}
 });
