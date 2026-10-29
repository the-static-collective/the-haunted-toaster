(()=>{"use strict";
const $=id=>document.getElementById(id);
const data=window.MADDCL0WN_CINEMA_MANIFEST;
const grid=$("grid"),player=$("player"),response=$("response");
let focused=null,decision=null,selectionCounter=0;
const el=(tag,content,cls)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(content!==undefined&&content!==null)node.textContent=String(content);return node};
function valid(){
 if(!data||data.schema!=="toaster.maddclown-six-film-cinema/v1"||
    !Array.isArray(data.films)||data.films.length!==6||
    data.nativeKeepMeaning!=="SIX_SCRIPTED_FIXTURE_KEEPS_NOT_SIX_HUMAN_DECISIONS"||
    data.publicationAuthorized!==false||data.externalDispatch!==false||
    data.userConsentNotAuthenticated!==true)return false;
 return data.films.every((f,i)=>f.index===i&&
   f.file==="film-"+i+".mp4"&&f.poster==="native-"+i+".png"&&
   f.selectedBy==="SCRIPTED_SYNTHETIC_FIXTURE_KEEP_ONLY"&&
   /^sha256:[a-f0-9]{64}$/.test(f.sha256)&&typeof f.scoreAddress==="string"&&typeof f.timelineHash==="string");
}
if(!valid()){
 response.textContent="HOLD: THE SIX-FILM MANIFEST IS MISSING OR HAS AN UNEXPECTED SHAPE.";
 $("surprise").disabled=$("playAll").disabled=$("scrape").disabled=true;return;
}
const films=data.films;
const safeFile=file=>/^(?:film-[0-5]|six-unborn-movies)\.mp4$/.test(file)?file:null;
function status(text){response.textContent=text}
function stop(){player.pause();player.removeAttribute("src");player.removeAttribute("poster");player.load()}
function focus(index){
 const f=films[index];if(!f)return;
 focused=index;decision=null;player.pause();
 player.src=safeFile(f.file);player.poster=f.poster;player.load();
 $("nowTitle").textContent=f.title;
 $("nowRole").textContent=f.role+" / FILM "+String(index+1).padStart(2,"0");
 $("score").textContent=f.scoreAddress;
 $("timeline").textContent=f.timelineHash;
 $("filmhash").textContent=f.sha256;
 $("keep").disabled=false;
 $("exportVerdict").disabled=true;
 for(const card of grid.children)card.setAttribute("aria-pressed",String(Number(card.dataset.index)===index));
 status("FOCUS ONLY: PLAY, INSPECT, OR KEEP THIS EXACT NATIVE FILM. NO PREFERENCE DATA IS SAVED.");
 $("screening").scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion:reduce)").matches?"auto":"smooth",block:"start"});
}
function card(f){
 const b=el("button",null,"film");b.type="button";b.dataset.index=String(f.index);
 b.setAttribute("aria-pressed","false");
 const img=el("img");img.src=f.poster;img.loading="lazy";img.alt="Actual Haunted Toaster preview of film "+String(f.index+1);
 const caption=el("div",null,"caption");
 caption.append(el("span",String(f.index+1).padStart(2,"0")+" / "+f.role,"role"),
   el("strong",f.title,"title"),
   el("span","NATIVE VISUALSCORE • 640×360 • LOCAL PROOF","under"));
 b.append(img,caption);b.addEventListener("click",()=>focus(f.index));return b;
}
for(const f of films)grid.append(card(f));
$("manifest").textContent=JSON.stringify(data,null,2);
$("surprise").addEventListener("click",()=>{
 let n;
 if(window.crypto?.getRandomValues){const buffer=new Uint32Array(1);crypto.getRandomValues(buffer);n=buffer[0]%6}
 else n=Math.floor(Math.random()*6);
 selectionCounter++;focus(n);
 status("THE CLOWN FOCUSED FILM "+(n+1)+". FOCUS IS NOT KEEP. RANDOMNESS IS NOT EVIDENCE OR PREFERENCE LEARNING.");
});
$("playAll").addEventListener("click",()=>{
 focused=null;decision=null;$("keep").disabled=true;$("exportVerdict").disabled=true;
 for(const card of grid.children)card.setAttribute("aria-pressed","false");
 player.pause();player.src=safeFile("six-unborn-movies.mp4");player.removeAttribute("poster");player.load();
 $("nowTitle").textContent="ALL SIX / THE UNBORN MOVIE REEL";
 $("nowRole").textContent="FULL FAMILY / PREVIEW ONLY";
 $("score").textContent="SIX DISTINCT NATIVE VISUALSCORES";
 $("timeline").textContent="SIX DISTINCT NATIVE TIMELINES";
 $("filmhash").textContent=data.reel?.sha256||"—";
 status("PLAYING THE COMPOSED SIX-FILM REEL. TO KEEP ONE, FOCUS THAT FILM EXACTLY.");
 $("screening").scrollIntoView({behavior:"smooth",block:"start"});
});
function verdict(kind){
 if(kind==="KEEP"&&focused===null){status("HOLD: FOCUS A SPECIFIC FILM FIRST");return}
 decision={schema:"maddclown.local-cinema-review/v1",kind,
  manifestDigest:data.manifestDigest,
  familyDigest:data.nativeFamilyHash,
  filmIndex:kind==="KEEP"?focused:null,
  chosenFilmHash:kind==="KEEP"?films[focused].sha256:null,
  chosenNativeScore:kind==="KEEP"?films[focused].scoreAddress:null,
  choiceMadeIn:"LOCAL_OFFLINE_BROWSER_ONLY",
  identityVerified:false,humanWitnessVerified:false,originSigned:false,
  actualSourceOwnerContinuationPermission:false,publicationAuthorized:false,
  externalDispatch:false,submitted:false};
 $("exportVerdict").disabled=false;
 if(kind==="SCRAPE"){
  stop();focused=null;$("keep").disabled=true;
  for(const card of grid.children)card.setAttribute("aria-pressed","false");
  status("SCRAPED THIS EXHIBITION FAMILY LOCALLY. NO NATIVE MEDIA WAS DELETED, NO FEATURE DISLIKE WAS LEARNED. EXPORT YOUR REVIEW IF YOU WISH.");
 }else status("KEPT FILM "+(focused+1)+" IN A LOCAL SELF-DECLARED REVIEW CARD ONLY. NO NATIVE KEEP, PUBLICATION OR OTHER EFFECT.");
}
$("keep").addEventListener("click",()=>verdict("KEEP"));
$("scrape").addEventListener("click",()=>verdict("SCRAPE"));
$("revisit").addEventListener("click",()=>{
 decision=null;$("exportVerdict").disabled=true;
 focus(0);status("SIX ORIGINAL MOVIES RESURRECTED. THE RECEIPTS AND MEDIA REMAIN UNCHANGED.");
});
$("exportVerdict").addEventListener("click",()=>{
 if(!decision)return;
 const blob=new Blob([JSON.stringify(decision,null,2)+"\n"],{type:"application/json"});
 const url=URL.createObjectURL(blob);const a=document.createElement("a");
 a.download="maddclown-local-"+decision.kind.toLowerCase()+"-review.json";a.href=url;a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
});
window.addEventListener("pagehide",()=>player.pause());
})();