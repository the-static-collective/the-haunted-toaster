"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const {ID,ROLES,args,fixtureKeep,filmMetadata,summary}=require("../src/bridge/maddclown-film-festival.cjs");

const flags=[
 "--jarvis","/tmp/synthetic-jarvis",
 "--offer","/tmp/synthetic-offer.json",
 "--audio","/tmp/synthetic.wav",
 "--out","/tmp/six-movies",
 "--fixture-keeps","SYNTHETIC_SIX_KEEP_TEST_NOT_A_HUMAN"
];
test("six-film exhibition permits only explicitly marked synthetic fixture KEEPs",()=>{
 const v=args(["festival",...flags]);
 assert.equal(v["--fixture-keeps"],"SYNTHETIC_SIX_KEEP_TEST_NOT_A_HUMAN");
 assert.equal(ROLES.length,6);
 assert.equal(new Set(ROLES.map(x=>x[0])).size,6);
 assert.equal(new Set(ROLES.map(x=>x[1])).size,6);
 for(const candidate of [
 ["festival",...flags.slice(0,-2)],
 ["festival",...flags.slice(0,-1),"YES_DO_ALL"],
 ["festival",...flags,"--publish","true"],
 ["festival",...flags,"--audio","/tmp/other.wav"],
 ["render",...flags],
 ])assert.throws(()=>args(candidate),/HOLD_/);
});
test("focus remains non-authoritative and each synthetic KEEP must match its exact native candidate",()=>{
 const family={familyHash:"native-parent"};
 const session={
  select:({index})=>({index,scoreAddress:"vs-"+index,timelineHash:"tm-"+index,continuationPermission:false}),
  keep:({index})=>({index,verdict:"KEEP",continuationPermission:true,scoreAddress:"vs-"+index,timelineHash:"tm-"+index})
 };
 for(let i=0;i<6;i++){
  const kept=fixtureKeep(session,family,i);
  assert.equal(kept.scoreAddress,"vs-"+i);
  assert.equal(kept.timelineHash,"tm-"+i);
 }
 assert.throws(()=>fixtureKeep({...session,select:()=>({continuationPermission:true})},family,0),/HOLD_FOCUS_/);
 assert.throws(()=>fixtureKeep({...session,keep:()=>({verdict:"KEEP",continuationPermission:false})},family,0),/HOLD_NATIVE_KEEP_/);
});
test("each actual MP4 needs accepted production receipt and the exact kept source",()=>{
 const tmp=fs.mkdtempSync(path.join(require("node:os").tmpdir(),"six-film-check-"));
 try{
  fs.writeFileSync(path.join(tmp,"film-0.mp4"),Buffer.alloc(180,1));
  const kept={scoreAddress:"htvs1_original",timelineHash:"native-timeline",receipt:{verdict:"KEEP"}};
  const actual={receipt:{validation:{accepted:true},canonicalExecution:{
   scoreAddress:kept.scoreAddress,timelineHash:kept.timelineHash}}};
  const info=filmMetadata(kept,actual,0,"film-0.mp4",tmp);
  assert.equal(info.selectedBy,"SCRIPTED_SYNTHETIC_FIXTURE_KEEP_ONLY");
  assert.equal(info.rightsVerified,false);
  assert.equal(info.externalPublication,false);
  assert.match(info.sha256,/^sha256:[a-f0-9]{64}$/);
  assert.throws(()=>filmMetadata(kept,{receipt:{validation:{accepted:false}}},0,"film-0.mp4",tmp),/HOLD_/);
  assert.throws(()=>filmMetadata(kept,{receipt:{validation:{accepted:true},canonicalExecution:{
   scoreAddress:"injected",timelineHash:kept.timelineHash}}},0,"film-0.mp4",tmp),/HOLD_/);
 }finally{fs.rmSync(tmp,{recursive:true,force:true})}
});
test("manifest advertises real software output but never invented permission or field success",()=>{
 const films=ROLES.map(([role,title],index)=>({index,role,title,sha256:"sha256:"+String(index).repeat(64)}));
 const source={commit:"a".repeat(40)},offer={offerDigest:"sha256:"+"b".repeat(64),
  selectedCreature:{creatureDigest:"sha256:"+"c".repeat(64)}};
 const native={familyHash:"ht-family"},audioHash="sha256:"+"d".repeat(64);
 const result=summary({offer,source,audioHash,native,films});
 assert.equal(result.schema,ID);
 assert.equal(result.films.length,6);
 assert.equal(result.nativeCandidateCount,6);
 assert.equal(result.nativeKeepMeaning,"SIX_SCRIPTED_FIXTURE_KEEPS_NOT_SIX_HUMAN_DECISIONS");
 assert.equal(result.userConsentNotAuthenticated,true);
 assert.equal(result.sourceRightsNotVerified,true);
 assert.equal(result.publicationAuthorized,false);
 assert.equal(result.humanOutcomeVerified,false);
 assert.equal(result.externalDispatch,false);
 assert.deepEqual(result,summary({offer,source,audioHash,native,films}));
});
test("offline cinema has real source assets, six-up controls, no remote scripts and syntax-valid JS",()=>{
 const root=path.join(__dirname,"../cinema");
 const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
 const js=fs.readFileSync(path.join(root,"cinema.js"),"utf8");
 const css=fs.readFileSync(path.join(root,"cinema.css"),"utf8");
 assert.ok(html.includes('id="player"'));
 assert.ok(html.includes('id="keep"'));
 assert.ok(html.includes('id="scrape"'));
 assert.ok(html.includes('id="exportVerdict"'));
 assert.match(html,/manifest.js/);
 assert.doesNotMatch(html,/https:\/\/|http:\/\//);
 assert.doesNotMatch(css,/@import|url\(https?:/);
 assert.doesNotThrow(()=>new vm.Script(js,{filename:"cinema.js"}));
 assert.match(js,/LOCAL_OFFLINE_BROWSER_ONLY/);
 assert.match(js,/actualSourceOwnerContinuationPermission:false/);
 assert.match(js,/identityVerified:false/);
 assert.match(js,/publicationAuthorized:false/);
});
