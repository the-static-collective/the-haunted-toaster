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
        digestPlacements:[],
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

  function defaultDigestPlacement(descendant,sceneId=null,ordinal=1){
    const scene=sceneId||SCENES[(Math.max(1,Number(descendant?.slot)||1)-1)%SCENES.length];
    const slot=Math.max(1,Number(descendant?.slot)||1);
    const n=Math.max(1,Number(ordinal)||1);
    return {
      placementId:`p-${String(descendant.roleId||"digest").replace(/[^A-Za-z0-9_-]/g,"-")}-${n}`,
      materialId:String(descendant.materialId),
      sceneId:scene,
      startOffsetFrames:48+((slot+n-2)%3)*72,
      sourceStartFrames:0,
      durationFrames:Math.max(1,Math.min(72,Number(descendant.sourceDurationFrames)||72)),
      transform:{
        x:[0.32,0.5,0.68][(slot+n-2)%3],
        y:(slot+n)%2===0?0.58:0.42,
        scale:0.86,
        rotationDegrees:(((slot+n-2)%3)-1)*5,
      },
      crop:null,
      opacity:0.64,
      blend:"screen",
      stackOrder:30+n,
    };
  }

  function placementsFor(state,materialId){
    return (state.edits.digestPlacements||[]).filter((placement)=>placement.materialId===materialId);
  }

  function placementFor(state,placementId){
    return (state.edits.digestPlacements||[]).find((placement)=>placement.placementId===placementId)||null;
  }

  function descendantFor(state,materialId){
    return (state.nextGen?.videoDigestion?.descendants||[]).find((descendant)=>descendant.materialId===materialId)||null;
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
          edits:{...state.edits,digestPlacements:[]},
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
      case "digest-place":
        if((state.edits.digestPlacements||[]).length>=12)throw new Error("Franken editor supports at most twelve digestion placements.");
        if(placementFor(state,action.placement.placementId))throw new Error("Digestion placement id must be unique.");
        return markDirty({
          ...state,
          edits:{
            ...state.edits,
            digestPlacements:[...(state.edits.digestPlacements||[]),action.placement],
          },
        });
      case "digest-remove":
        return markDirty({
          ...state,
          edits:{
            ...state.edits,
            digestPlacements:(state.edits.digestPlacements||[]).filter((placement)=>placement.placementId!==action.placementId),
          },
        });
      case "digest-edit":
        return markDirty({
          ...state,
          edits:{
            ...state.edits,
            digestPlacements:(state.edits.digestPlacements||[]).map((placement)=>placement.placementId===action.placementId
              ?{
                  ...placement,
                  ...action.patch,
                  transform:action.patch?.transform?{...placement.transform,...action.patch.transform}:placement.transform,
                  crop:Object.prototype.hasOwnProperty.call(action.patch||{},"crop")?action.patch.crop:placement.crop,
                }
              :placement),
          },
        });
      case "nextgen":
        return markDirty({
          ...state,
          nextGen:action.value||null,
          proposal:null,
          proposalIdentity:null,
          edits:{...applyNextGenPressure(state.edits,action.value),digestPlacements:[]},
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
            digestPlacements:[...(p.digestPlacements||[])],
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
        digestPlacements:[...(state.edits.digestPlacements||[])],
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
        item.className="franken-digest-card";
        item.draggable=true;
        item.dataset.materialId=descendant.materialId;
        item.addEventListener("dragstart",(event)=>{
          event.dataTransfer?.setData("text/x-franken-digest",descendant.materialId);
          if(event.dataTransfer)event.dataTransfer.effectAllowed="move";
        });

        const title=document.createElement("b");
        title.textContent=`#${descendant.slot} · ${descendant.roleId}`;
        const meta=document.createElement("small");
        meta.textContent=`${descendant.projectionClass} · ${descendant.planHash.slice(0,10)}`;

        const placement=placementFor(state,descendant.materialId);
        const toggle=document.createElement("button");
        toggle.type="button";
        toggle.className="franken-digest-toggle";
        toggle.textContent=placement?"REMOVE":"PLACE";
        toggle.addEventListener("click",()=>{
          state=placement
            ?reduceBenchState(state,{type:"digest-remove",materialId:descendant.materialId})
            :reduceBenchState(state,{type:"digest-place",placement:defaultDigestPlacement(descendant)});
          render();
        });
        item.append(title,meta,toggle);

        if(placement){
          item.classList.add("is-placed");
          const controls=document.createElement("div");
          controls.className="franken-digest-controls";

          const select=(label,value,options,onChange)=>{
            const wrap=document.createElement("label");
            wrap.textContent=label;
            const node=document.createElement("select");
            for(const optionValue of options){
              const option=document.createElement("option");
              option.value=optionValue;
              option.textContent=optionValue;
              option.selected=optionValue===value;
              node.append(option);
            }
            node.addEventListener("change",()=>onChange(node.value));
            wrap.append(node);
            return wrap;
          };
          const number=(label,value,min,max,step,onChange)=>{
            const wrap=document.createElement("label");
            wrap.textContent=label;
            const node=document.createElement("input");
            node.type="number";
            node.value=String(value);
            node.min=String(min);
            node.max=String(max);
            node.step=String(step);
            node.addEventListener("change",()=>onChange(Number(node.value)));
            wrap.append(node);
            return wrap;
          };
          const patch=(next)=>{state=reduceBenchState(state,{type:"digest-edit",materialId:descendant.materialId,patch:next});render();};

          controls.append(
            select("Scene",placement.sceneId,SCENES,(value)=>patch({sceneId:value})),
            number("Start",placement.startOffsetFrames,0,383,1,(value)=>patch({startOffsetFrames:value})),
            number("Frames",placement.durationFrames,1,Math.max(1,Math.min(Number(descendant.sourceDurationFrames)||384,384-placement.startOffsetFrames)),1,(value)=>patch({durationFrames:value})),
            number("Opacity",placement.opacity,0,1,0.05,(value)=>patch({opacity:value})),
            select("Blend",placement.blend,["normal","screen"],(value)=>patch({blend:value})),
          );
          item.append(controls);
        }
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
        section.dataset.sceneId=lane.sceneId;
        section.addEventListener("dragover",(event)=>{event.preventDefault();if(event.dataTransfer)event.dataTransfer.dropEffect="move";});
        section.addEventListener("drop",(event)=>{
          event.preventDefault();
          const materialId=event.dataTransfer?.getData("text/x-franken-digest")||"";
          const descendant=descendantFor(state,materialId);
          if(!descendant)return;
          const current=placementFor(state,materialId);
          state=current
            ?reduceBenchState(state,{type:"digest-edit",materialId,patch:{sceneId:lane.sceneId}})
            :reduceBenchState(state,{type:"digest-place",placement:defaultDigestPlacement(descendant,lane.sceneId)});
          render();
        });
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
    defaultDigestPlacement,
    descendantFor,
    canCompose,
    canFreeze,
    composeConfig,
    createBenchState,
    laneModel,
    moveCard,
    mount,
    placementFor,
    reduceBenchState,
  };
});
