(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root){root.NextGenLabUI=api;if(root.document)root.addEventListener("DOMContentLoaded",()=>api.mount(root.document,root.fullMeasure));}
})(typeof window!=="undefined"?window:null,function(){
  "use strict";

  const PHASES=Object.freeze([
    {id:"hear",label:"HEAR",detail:"song admitted"},
    {id:"dream",label:"DREAM",detail:"six-up proposed"},
    {id:"compose",label:"COMPOSE",detail:"plan frozen"},
    {id:"render",label:"RENDER",detail:"witness emitted"},
  ]);

  function present(node){return !!node&&!node.classList?.contains("is-hidden")&&!node.hidden;}
  function deriveState(document){
    const songFacts=document.getElementById("songFacts");
    const grid=document.getElementById("betaSixUpGrid");
    const planHash=String(document.getElementById("frankenPlanHash")?.textContent||"").trim();
    const result=document.getElementById("resultCard");
    return Object.freeze({
      hear:present(songFacts),
      dream:!!grid&&grid.children.length>0,
      compose:!!planHash&&planHash!=="No frozen plan",
      render:present(result),
    });
  }

  function nextAction(state){
    if(!state.hear)return "hear";
    if(!state.dream)return "dream";
    if(!state.compose)return "compose";
    if(!state.render)return "render";
    return "complete";
  }

  function organRows(profile){
    if(!profile?.organs||!Array.isArray(profile.pipeline))return [];
    return profile.pipeline.map((key)=>({
      key,
      phase:profile.organs[key]?.phase||"unknown",
      authority:profile.organs[key]?.authority||"unknown",
      ref:profile.organs[key]?.ref||"",
      sha:profile.organs[key]?.sha||"",
    }));
  }

  function mount(document,bridge){
    const rail=document.getElementById("nextgenLab");
    const toggle=document.getElementById("nextgenLabToggle");
    if(!rail||!toggle||!bridge)return;

    const phaseRoot=document.getElementById("nextgenPhases");
    const status=document.getElementById("nextgenStatus");
    const profileRoot=document.getElementById("nextgenOrgans");
    const profileToggle=document.getElementById("nextgenProfileToggle");
    const profilePanel=document.getElementById("nextgenProfilePanel");
    let profile=null;

    const setOpen=(open)=>{
      rail.hidden=!open;
      toggle.setAttribute("aria-expanded",String(open));
      if(open)refresh();
    };

    function renderPhases(){
      const state=deriveState(document);
      const next=nextAction(state);
      phaseRoot.replaceChildren(...PHASES.map((phase)=>{
        const button=document.createElement("button");
        button.type="button";
        button.className="nextgen-phase";
        button.dataset.phase=phase.id;
        button.dataset.state=state[phase.id]?"complete":phase.id===next?"current":"waiting";
        button.setAttribute("aria-label",phase.label+" · "+phase.detail);
        const label=document.createElement("b");
        label.textContent=phase.label;
        const detail=document.createElement("small");
        detail.textContent=state[phase.id]?"witnessed":phase.detail;
        button.append(label,detail);
        button.addEventListener("click",()=>activate(phase.id));
        return button;
      }));
      status.textContent=next==="complete"
        ?"NEXTGEN PATH COMPLETE · render witness present"
        :("NEXT DOOR · "+next.toUpperCase());
    }

    function activate(phase){
      if(phase==="hear"){
        document.getElementById("audioDrop")?.focus();
        document.getElementById("audioDrop")?.scrollIntoView({behavior:"smooth",block:"center"});
      }else if(phase==="dream"){
        const target=document.getElementById("betaSixUpGenerate")||document.getElementById("betaSixUpWindow");
        target?.scrollIntoView({behavior:"smooth",block:"center"});
        target?.focus?.();
      }else if(phase==="compose"){
        document.dispatchEvent(new CustomEvent("fullmeasure:open-franken"));
      }else if(phase==="render"){
        const target=document.getElementById("renderButton");
        target?.scrollIntoView({behavior:"smooth",block:"center"});
        target?.focus?.();
      }
    }

    async function loadProfile(){
      try{
        profile=await bridge.getNextGenProfile();
        const rows=organRows(profile);
        profileRoot.replaceChildren(...rows.map((row)=>{
          const item=document.createElement("li");
          const head=document.createElement("div");
          const name=document.createElement("b");
          name.textContent=row.key;
          const authority=document.createElement("span");
          authority.textContent=row.authority;
          head.append(name,authority);
          const meta=document.createElement("code");
          meta.textContent=row.ref+" @ "+row.sha.slice(0,10);
          item.append(head,meta);
          return item;
        }));
        document.getElementById("nextgenProfileName").textContent=profile.name||"Haunted Toaster NextGen";
      }catch(error){
        profileRoot.textContent=error?.message||"NextGen profile unavailable.";
      }
    }

    function refresh(){renderPhases();}

    toggle.addEventListener("click",()=>setOpen(rail.hidden));
    document.getElementById("nextgenClose")?.addEventListener("click",()=>setOpen(false));
    document.querySelectorAll("[data-nextgen-action]").forEach((button)=>{
      button.addEventListener("click",()=>activate(button.dataset.nextgenAction));
    });
    profileToggle?.addEventListener("click",()=>{
      const open=profilePanel.hidden;
      profilePanel.hidden=!open;
      profileToggle.setAttribute("aria-expanded",String(open));
    });

    const observer=new MutationObserver(refresh);
    ["songFacts","betaSixUpGrid","frankenPlanHash","resultCard"].forEach((id)=>{
      const node=document.getElementById(id);
      if(node)observer.observe(node,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["class","hidden"]});
    });

    document.addEventListener("fullmeasure:nextgen-refresh",refresh);
    loadProfile();
    renderPhases();
    setOpen(new URLSearchParams(document.defaultView?.location?.search||"").get("nextgen")==="1");

    return {refresh,destroy:()=>observer.disconnect()};
  }

  return {PHASES,deriveState,nextAction,organRows,mount};
});
