(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root){
    root.FrankenComposerUI=api;
    if(root.document)root.addEventListener("DOMContentLoaded",()=>api.mount(root.document,root.fullMeasure));
  }
})(typeof window!=="undefined"?window:null,function(){
  "use strict";

  const SCENES=["ARRIVE","CROSS","ASSEMBLE"];
  const TRANSITIONS=["panel-wipe","radial-reveal","cut","hinge"];
  const WORLD_RULES=["manga-room","comic-page","wrong-medium"];

  function createBenchState(){
    return {
      paths:{
        deckPath:null,
        worldRulePath:null,
        playdeckAssetMapPath:null,
        blenderAcceptancePath:null,
        blenderReceiptPath:null,
        blenderVideoPath:null,
      },
      seed:"franken-001",
      edits:{
        cardOrder:null,
        sceneRoles:{},
        worldRule:null,
        movingTakeSceneId:"CROSS",
        transitions:{
          arriveCross:"panel-wipe",
          crossAssemble:"radial-reveal",
        },
        text:"THE ROOM REMEMBERS",
        variation:0,
      },
      nextGen:null,
      proposal:null,
      proposalIdentity:null,
      frozen:null,
      dirty:true,
    };
  }

  function canCompose(state){
    return [
      "deckPath",
      "worldRulePath",
      "blenderAcceptancePath",
      "blenderReceiptPath",
      "blenderVideoPath",
    ].every((key)=>Boolean(state.paths[key]));
  }

  function canFreeze(state){
    return !!state.proposal&&!!state.proposalIdentity&&!state.dirty;
  }

  function markDirty(state){
    return {...state,dirty:true,frozen:null};
  }

  function applyNextGenPressure(edits,crossing){
    const pressure=crossing?.frankenPressure?.edits;
    if(!pressure)return {...edits};
    return {
      ...edits,
      movingTakeSceneId:pressure.movingTakeSceneId||edits.movingTakeSceneId,
      transitions:{
        ...edits.transitions,
        ...(pressure.transitions||{}),
      },
      variation:Number.isSafeInteger(pressure.variation)
        ?pressure.variation
        :edits.variation,
    };
  }

  function reduceBenchState(state,action){
    switch(action.type){
      case "path":
        return markDirty({
          ...state,
          paths:{...state.paths,[action.key]:action.value||null},
          proposal:null,
          proposalIdentity:null,
        });
      case "seed":
        return markDirty({
          ...state,
          seed:String(action.value||"franken-001"),
          nextGen:null,
          proposal:null,
          proposalIdentity:null,
        });
      case "edit":
        return markDirty({
          ...state,
          edits:{...state.edits,[action.key]:action.value},
        });
      case "transition":
        return markDirty({
          ...state,
          edits:{
            ...state.edits,
            transitions:{...state.edits.transitions,[action.key]:action.value},
          },
        });
      case "card-order":
        return markDirty({
          ...state,
          edits:{...state.edits,cardOrder:[...action.value]},
        });
      case "scene-role":
        return markDirty({
          ...state,
          edits:{
            ...state.edits,
            sceneRoles:{...state.edits.sceneRoles,[action.cardId]:action.sceneId},
          },
        });
      case "nextgen":
        return markDirty({
          ...state,
          nextGen:action.value||null,
          proposal:null,
          proposalIdentity:null,
          edits:applyNextGenPressure(state.edits,action.value),
        });
      case "proposal":{
        const p=action.result.proposal;
        return {
          ...state,
          proposal:p,
          proposalIdentity:action.result.proposalIdentity,
          frozen:null,
          dirty:false,
          edits:{
            ...state.edits,
            cardOrder:[...p.cardOrder],
            sceneRoles:{...p.sceneRoles},
            worldRule:state.edits.worldRule,
            movingTakeSceneId:p.movingTakeSceneId,
            transitions:{...p.transitionChoices},
            text:p.text,
            variation:p.variation,
          },
        };
      }
      case "frozen":
        if(!canFreeze(state))throw new Error("Cannot freeze an unreviewed or dirty proposal.");
        return {...state,frozen:{planHash:action.planHash},dirty:false};
      default:
        return state;
    }
  }

  function composeConfig(state){
    return {
      deckPath:state.paths.deckPath,
      worldRulePath:state.paths.worldRulePath,
      playdeckAssetMapPath:state.paths.playdeckAssetMapPath,
      blenderAcceptancePath:state.paths.blenderAcceptancePath,
      blenderReceiptPath:state.paths.blenderReceiptPath,
      blenderVideoPath:state.paths.blenderVideoPath,
      seed:state.seed,
      nextGen:state.nextGen
        ?{
            enabled:true,
            expectedCrossingIdentity:state.nextGen.crossingIdentity,
            albumContext:{},
          }
        :null,
      edits:{
        cardOrder:state.edits.cardOrder||undefined,
        sceneRoles:Object.keys(state.edits.sceneRoles).length
          ?state.edits.sceneRoles
          :undefined,
        worldRule:state.edits.worldRule||undefined,
        movingTakeSceneId:state.edits.movingTakeSceneId,
        transitions:state.edits.transitions,
        text:state.edits.text,
        variation:Number(state.edits.variation),
      },
    };
  }

  function laneModel(proposal){
    if(!proposal)return SCENES.map((sceneId)=>({sceneId,cards:[],roles:[]}));
    return SCENES.map((sceneId)=>({
      sceneId,
      cards:proposal.cardOrder.filter((id)=>proposal.sceneRoles[id]===sceneId),
      roles:proposal.scenes.find((s)=>s.sceneId===sceneId)?.tracks.map((t)=>t.role)||[],
    }));
  }

  function moveCard(order,id,delta){
    const next=[...order];
    const i=next.indexOf(id),j=i+delta;
    if(i<0||j<0||j>=next.length)return next;
    [next[i],next[j]]=[next[j],next[i]];
    return next;
  }

  function filename(value){
    if(!value)return "Not chosen";
    return String(value).split(/[\\/]/).pop();
  }

  function mount(document,bridge){
    const root=document.getElementById("frankenComposerWindow");
    if(!root||!bridge)return;
    if(root.parentElement!==document.body)document.body.append(root);

    const view=document.defaultView;
    let state=createBenchState();
    const status=document.getElementById("frankenStatus");
    const compose=document.getElementById("frankenRecompose");
    const freeze=document.getElementById("frankenFreeze");
    const bundle=document.getElementById("frankenBundle");
    const lanes=document.getElementById("frankenLanes");
    const hash=document.getElementById("frankenPlanHash");
    const close=document.getElementById("frankenClose");
    const nextGenLoad=document.getElementById("frankenNextGenLoad");
    const nextGenStatus=document.getElementById("frankenNextGenStatus");
    const pressureRoot=document.getElementById("frankenPressureReadout");
    const reservoirRoot=document.getElementById("frankenDigestionReservoir");

    const pathMethods={
      deckPath:"chooseFrankenPlaydeckDeck",
      worldRulePath:"chooseFrankenWorldRule",
      playdeckAssetMapPath:"chooseFrankenPlaydeckAssetMap",
      blenderAcceptancePath:"chooseFrankenBlenderAcceptance",
      blenderReceiptPath:"chooseFrankenBlenderReceipt",
      blenderVideoPath:"chooseFrankenBlenderVideo",
    };

    const setOpen=(open)=>{
      root.hidden=!open;
      document.body.classList.toggle("franken-open",open);
    };

    const search=new URLSearchParams(view?.location?.search||"");
    setOpen(search.get("franken")==="1");

    view?.addEventListener("keydown",(event)=>{
      if(event.ctrlKey&&event.shiftKey&&String(event.key).toLowerCase()==="k"){
        event.preventDefault();
        setOpen(root.hidden);
      }
    });

    function syncControls(){
      const values={
        frankenSeed:state.seed,
        frankenMovingTake:state.edits.movingTakeSceneId,
        frankenTransitionA:state.edits.transitions.arriveCross,
        frankenTransitionB:state.edits.transitions.crossAssemble,
        frankenText:state.edits.text,
        frankenVariation:String(state.edits.variation),
      };
      for(const [id,value] of Object.entries(values)){
        const node=document.getElementById(id);
        if(node&&String(node.value)!==String(value))node.value=value;
      }
    }

    function renderNextGen(){
      if(!nextGenStatus||!pressureRoot||!reservoirRoot)return;
      const crossing=state.nextGen;
      pressureRoot.replaceChildren();
      reservoirRoot.replaceChildren();
      pressureRoot.hidden=!crossing;
      reservoirRoot.hidden=!crossing;

      if(!crossing){
        nextGenStatus.textContent="Not loaded. Human edits and FREEZE remain authoritative.";
        return;
      }

      const pressure=crossing.frankenPressure;
      const edits=pressure?.edits||{};
      nextGenStatus.textContent=
        `Loaded ${pressure?.dominantLens?.name||"Listening Eye"} pressure · crossing ${String(crossing.crossingIdentity||"").slice(0,12)} · RECOMPOSE required`;

      const pressureItems=[
        `LENS · ${pressure?.dominantLens?.name||"unknown"}`,
        `MOVING TAKE · ${edits.movingTakeSceneId||"unchanged"}`,
        `ARRIVE→CROSS · ${edits.transitions?.arriveCross||"unchanged"}`,
        `CROSS→ASSEMBLE · ${edits.transitions?.crossAssemble||"unchanged"}`,
        `VARIATION · ${Number.isSafeInteger(edits.variation)?edits.variation:"unchanged"}`,
      ];
      for(const text of pressureItems){
        const item=document.createElement("span");
        item.textContent=text;
        pressureRoot.append(item);
      }

      const descendants=crossing.videoDigestion?.descendants||[];
      if(!descendants.length){
        const item=document.createElement("span");
        item.innerHTML="<b>VIDEO RESERVOIR SLEEPING</b><small>Admit one video and generate Six-Up, then reload live organs.</small>";
        reservoirRoot.append(item);
        return;
      }
      for(const descendant of descendants){
        const item=document.createElement("span");
        const title=document.createElement("b");
        title.textContent=`#${descendant.slot} · ${descendant.roleId}`;
        const meta=document.createElement("small");
        meta.textContent=`${descendant.projectionClass} · ${descendant.planHash.slice(0,10)}`;
        item.append(title,meta);
        reservoirRoot.append(item);
      }
    }

    function render(){
      compose.disabled=!canCompose(state);
      freeze.disabled=!canFreeze(state);
      bundle.disabled=!state.frozen;
      hash.textContent=state.frozen?state.frozen.planHash:"No frozen plan";
      status.textContent=state.dirty
        ?(state.proposal?"Proposal changed · RECOMPOSE required":"Choose sources, then RECOMPOSE")
        :"Proposal reviewed · ready to freeze";

      for(const [key] of Object.entries(pathMethods)){
        const node=document.querySelector(`[data-franken-path-status="${key}"]`);
        if(node)node.textContent=filename(state.paths[key]);
      }

      lanes.replaceChildren(...laneModel(state.proposal).map((lane)=>{
        const section=document.createElement("section");
        section.className="franken-lane";
        const title=document.createElement("strong");
        title.textContent=lane.sceneId;
        section.append(title);

        for(const id of lane.cards){
          const row=document.createElement("div");
          row.className="franken-card-row";
          const label=document.createElement("span");
          label.textContent=id;

          const up=document.createElement("button");
          up.type="button";
          up.textContent="↑";
          up.setAttribute("aria-label",`Move ${id} earlier`);
          up.addEventListener("click",()=>{
            state=reduceBenchState(state,{
              type:"card-order",
              value:moveCard(state.edits.cardOrder||state.proposal.cardOrder,id,-1),
            });
            render();
          });

          const down=document.createElement("button");
          down.type="button";
          down.textContent="↓";
          down.setAttribute("aria-label",`Move ${id} later`);
          down.addEventListener("click",()=>{
            state=reduceBenchState(state,{
              type:"card-order",
              value:moveCard(state.edits.cardOrder||state.proposal.cardOrder,id,1),
            });
            render();
          });

          const select=document.createElement("select");
          select.setAttribute("aria-label",`${id} scene role`);
          for(const sceneId of SCENES){
            const option=document.createElement("option");
            option.value=sceneId;
            option.textContent=sceneId;
            option.selected=state.edits.sceneRoles[id]===sceneId;
            select.append(option);
          }
          select.addEventListener("change",()=>{
            state=reduceBenchState(state,{
              type:"scene-role",
              cardId:id,
              sceneId:select.value,
            });
            render();
          });
          row.append(label,up,down,select);
          section.append(row);
        }

        const roles=document.createElement("small");
        roles.textContent=lane.roles.filter((role)=>role!=="card").join(" · ");
        section.append(roles);
        return section;
      }));

      syncControls();
      renderNextGen();
    }

    async function loadNextGen(){
      if(typeof bridge.inspectNextGenCrossings!=="function"){
        nextGenStatus.textContent="This build has no live organ crossing bridge.";
        return;
      }
      try{
        nextGenLoad.disabled=true;
        nextGenStatus.textContent="Listening to the current Toaster state…";
        const crossing=await bridge.inspectNextGenCrossings({
          rootSeed:state.seed,
          albumContext:{},
        });
        state=reduceBenchState(state,{type:"nextgen",value:crossing});
        render();
      }catch(error){
        nextGenStatus.textContent=error?.message||String(error);
      }finally{
        nextGenLoad.disabled=false;
      }
    }

    document.addEventListener("fullmeasure:open-franken",(event)=>{
      setOpen(true);
      if(event.detail?.liveOrgans===true)loadNextGen();
    });
    close?.addEventListener("click",()=>setOpen(false));
    nextGenLoad?.addEventListener("click",loadNextGen);

    root.querySelectorAll("[data-franken-choose]").forEach((button)=>
      button.addEventListener("click",async()=>{
        const key=button.dataset.frankenChoose;
        const method=pathMethods[key];
        try{
          const chosen=await bridge[method]();
          if(chosen)state=reduceBenchState(state,{type:"path",key,value:chosen});
          render();
        }catch(error){
          status.textContent=error.message;
        }
      }),
    );

    const bind=(id,type,key,read=(node)=>node.value)=>{
      const node=document.getElementById(id);
      node.addEventListener("input",()=>{
        state=reduceBenchState(state,{type,key,value:read(node)});
        render();
      });
    };

    bind("frankenSeed","seed");
    bind("frankenWorldRule","edit","worldRule",(node)=>node.value||null);
    bind("frankenMovingTake","edit","movingTakeSceneId");
    bind("frankenText","edit","text");
    bind("frankenVariation","edit","variation",(node)=>Number(node.value));
    bind("frankenTransitionA","transition","arriveCross");
    bind("frankenTransitionB","transition","crossAssemble");

    compose.addEventListener("click",async()=>{
      try{
        status.textContent="Composing proposal…";
        const result=await bridge.composeFranken(composeConfig(state));
        state=reduceBenchState(state,{type:"proposal",result});
        render();
      }catch(error){
        status.textContent=error.message;
      }
    });

    freeze.addEventListener("click",async()=>{
      try{
        status.textContent="Revalidating donors and freezing…";
        const result=await bridge.freezeFranken({
          ...composeConfig(state),
          expectedProposalIdentity:state.proposalIdentity,
        });
        state=reduceBenchState(state,{type:"frozen",planHash:result.planHash});
        render();
      }catch(error){
        status.textContent=error.message;
      }
    });

    bundle.addEventListener("click",async()=>{
      try{
        const result=await bridge.writeFrankenProjectionBundle({
          ...composeConfig(state),
          expectedProposalIdentity:state.proposalIdentity,
        });
        status.textContent=`Renderer bundle prepared · ${result.directory}`;
      }catch(error){
        status.textContent=error.message;
      }
    });

    render();
  }

  return {
    SCENES,
    TRANSITIONS,
    WORLD_RULES,
    applyNextGenPressure,
    canCompose,
    canFreeze,
    composeConfig,
    createBenchState,
    laneModel,
    moveCard,
    mount,
    reduceBenchState,
  };
});
