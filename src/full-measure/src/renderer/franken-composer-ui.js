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
  const SCENE_FRAMES=384;
  const TOTAL_FRAMES=1152;
  const SCENE_STARTS={ARRIVE:0,CROSS:384,ASSEMBLE:768};

  const clamp=(value,min,max)=>Math.min(max,Math.max(min,Number(value)||0));

  function globalFrameForPlacement(placement){
    return SCENE_STARTS[placement.sceneId]+Number(placement.startOffsetFrames||0);
  }

  function sceneAtGlobalFrame(frame){
    const value=Math.max(0,Math.min(TOTAL_FRAMES-1,Math.round(Number(frame)||0)));
    const index=Math.min(2,Math.floor(value/SCENE_FRAMES));
    const sceneId=SCENES[index];
    return {sceneId,startFrame:SCENE_STARTS[sceneId],offsetFrame:value-SCENE_STARTS[sceneId]};
  }

  function snapFrame(frame,landmarks=[],enabled=true,threshold=14){
    const value=Math.max(0,Math.min(TOTAL_FRAMES-1,Math.round(Number(frame)||0)));
    if(!enabled)return value;
    const candidates=[0,384,768,1151,...(Array.isArray(landmarks)?landmarks.map(mark=>Number(mark.compositionFrame)):[])].filter(Number.isFinite);
    let best=value,bestDistance=threshold+1;
    for(const candidate of candidates){
      const distance=Math.abs(candidate-value);
      if(distance<bestDistance){best=Math.round(candidate);bestDistance=distance;}
    }
    return bestDistance<=threshold?Math.max(0,Math.min(TOTAL_FRAMES-1,best)):value;
  }

  function movePlacementOnTimeline(placement,targetGlobalFrame,landmarks=[],snapEnabled=true){
    const snapped=snapFrame(targetGlobalFrame,landmarks,snapEnabled);
    const target=sceneAtGlobalFrame(snapped);
    const maxStart=Math.max(0,SCENE_FRAMES-Number(placement.durationFrames||1));
    return {
      sceneId:target.sceneId,
      startOffsetFrames:Math.max(0,Math.min(maxStart,target.offsetFrame)),
    };
  }

  function resizePlacementOnTimeline(placement,targetGlobalEndFrame,sourceDurationFrames,landmarks=[],snapEnabled=true){
    const start=globalFrameForPlacement(placement);
    const sceneEnd=SCENE_STARTS[placement.sceneId]+SCENE_FRAMES;
    const sourceRemaining=Math.max(1,Number(sourceDurationFrames||1)-Number(placement.sourceStartFrames||0));
    const snapped=snapFrame(targetGlobalEndFrame,landmarks,snapEnabled);
    const end=Math.max(start+1,Math.min(sceneEnd,snapped));
    return {durationFrames:Math.max(1,Math.min(end-start,sourceRemaining))};
  }

  function interpolateTransformAtFrame(base,keyframes=[],offsetFrame=0){
    const points=new Map([[0,{...base}]]);
    for(const keyframe of Array.isArray(keyframes)?keyframes:[])points.set(Number(keyframe.offsetFrames),{...keyframe.transform});
    const ordered=[...points.entries()].sort((a,b)=>a[0]-b[0]);
    const frame=Math.max(0,Number(offsetFrame)||0);
    if(ordered.length===1||frame<=ordered[0][0])return {...ordered[0][1]};
    if(frame>=ordered.at(-1)[0])return {...ordered.at(-1)[1]};
    for(let index=1;index<ordered.length;index++){
      const [rightFrame,right]=ordered[index];
      const [leftFrame,left]=ordered[index-1];
      if(frame>rightFrame)continue;
      const ratio=(frame-leftFrame)/Math.max(1,rightFrame-leftFrame);
      const lerp=(key)=>Number(left[key])+(Number(right[key])-Number(left[key]))*ratio;
      return {x:lerp("x"),y:lerp("y"),scale:lerp("scale"),rotationDegrees:lerp("rotationDegrees")};
    }
    return {...base};
  }
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
      transformKeyframes:[],
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
        if((state.edits.digestPlacements||[]).length>=96)throw new Error("Franken editor supports at most ninety-six digestion placements.");
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
    const previewRoot=document.getElementById("frankenProposalPreview");
    const timelineRoot=document.getElementById("frankenTimelineRuler");
    const playhead=document.getElementById("frankenPlayhead");
    const playheadReadout=document.getElementById("frankenPlayheadFrame");
    const snapToggle=document.getElementById("frankenSnapEnabled");
    let playheadFrame=0;
    let snapEnabled=true;
    let timelineGestureActive=false;

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
          if(event.dataTransfer)event.dataTransfer.effectAllowed="copy";
        });

        const title=document.createElement("b");
        title.textContent=`#${descendant.slot} · ${descendant.roleId}`;
        const meta=document.createElement("small");
        meta.textContent=`${descendant.projectionClass} · ${descendant.planHash.slice(0,10)} · ${descendant.sourceDurationFrames}f source`;
        const placements=placementsFor(state,descendant.materialId);
        if(placements.length)item.classList.add("is-placed");

        const add=document.createElement("button");
        add.type="button";
        add.className="franken-digest-toggle";
        add.textContent=placements.length?`ADD CLIP · ${placements.length} PLACED`:"ADD CLIP";
        add.addEventListener("click",()=>{
          let ordinal=placements.length+1;
          let candidate=defaultDigestPlacement(descendant,null,ordinal);
          while(placementFor(state,candidate.placementId)){ordinal+=1;candidate=defaultDigestPlacement(descendant,null,ordinal);}
          state=reduceBenchState(state,{type:"digest-place",placement:candidate});
          render();
        });
        item.append(title,meta,add);

        const select=(label,value,options,onChange)=>{
          const wrap=document.createElement("label");
          wrap.textContent=label;
          const node=document.createElement("select");
          for(const optionValue of options){
            const option=document.createElement("option");
            option.value=optionValue;
            option.textContent=optionValue;
            option.selected=String(optionValue)===String(value);
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

        for(const placement of placements){
          const editor=document.createElement("section");
          editor.className="franken-placement-editor";
          editor.dataset.placementId=placement.placementId;
          const head=document.createElement("div");
          head.className="franken-placement-head";
          const name=document.createElement("strong");
          name.textContent=`${placement.placementId} · ${placement.sceneId}`;
          const remove=document.createElement("button");
          remove.type="button";
          remove.textContent="REMOVE";
          remove.addEventListener("click",()=>{
            state=reduceBenchState(state,{type:"digest-remove",placementId:placement.placementId});
            render();
          });
          head.append(name,remove);

          const controls=document.createElement("div");
          controls.className="franken-digest-controls";
          const patch=(next)=>{state=reduceBenchState(state,{type:"digest-edit",placementId:placement.placementId,patch:next});render();};
          const maxSource=Math.max(1,Number(descendant.sourceDurationFrames)||1);
          const maxDuration=Math.max(1,Math.min(maxSource-placement.sourceStartFrames,384-placement.startOffsetFrames));

          controls.append(
            select("Scene",placement.sceneId,SCENES,(value)=>patch({sceneId:value})),
            number("Timeline",placement.startOffsetFrames,0,383,1,(value)=>patch({startOffsetFrames:value})),
            number("Source in",placement.sourceStartFrames,0,Math.max(0,maxSource-1),1,(value)=>{
              const durationFrames=Math.max(1,Math.min(placement.durationFrames,maxSource-value,384-placement.startOffsetFrames));
              patch({sourceStartFrames:value,durationFrames,transformKeyframes:(placement.transformKeyframes||[]).filter(keyframe=>keyframe.offsetFrames<durationFrames)});
            }),
            number("Frames",placement.durationFrames,1,maxDuration,1,(value)=>patch({
              durationFrames:value,
              transformKeyframes:(placement.transformKeyframes||[]).filter(keyframe=>keyframe.offsetFrames<value),
            })),
            number("X",placement.transform.x,-1,2,0.01,(value)=>patch({transform:{x:value}})),
            number("Y",placement.transform.y,-1,2,0.01,(value)=>patch({transform:{y:value}})),
            number("Scale",placement.transform.scale,0.05,8,0.05,(value)=>patch({transform:{scale:value}})),
            number("Rotate",placement.transform.rotationDegrees,-720,720,1,(value)=>patch({transform:{rotationDegrees:value}})),
            number("Opacity",placement.opacity,0,1,0.05,(value)=>patch({opacity:value})),
            select("Blend",placement.blend,["normal","screen"],(value)=>patch({blend:value})),
            number("Stack",placement.stackOrder,0,999,1,(value)=>patch({stackOrder:value})),
          );

          const cropButton=document.createElement("button");
          cropButton.type="button";
          cropButton.className="franken-crop-toggle";
          cropButton.textContent=placement.crop?"FULL FRAME":"ENABLE CROP";
          cropButton.addEventListener("click",()=>patch({crop:placement.crop?null:{x:0.1,y:0.1,width:0.8,height:0.8}}));
          controls.append(cropButton);
          if(placement.crop){
            controls.append(
              number("Crop X",placement.crop.x,0,Math.max(0,1-placement.crop.width),0.01,(value)=>patch({crop:{...placement.crop,x:value}})),
              number("Crop Y",placement.crop.y,0,Math.max(0,1-placement.crop.height),0.01,(value)=>patch({crop:{...placement.crop,y:value}})),
              number("Crop W",placement.crop.width,0.01,Math.max(0.01,1-placement.crop.x),0.01,(value)=>patch({crop:{...placement.crop,width:value}})),
              number("Crop H",placement.crop.height,0.01,Math.max(0.01,1-placement.crop.y),0.01,(value)=>patch({crop:{...placement.crop,height:value}})),
            );
          }
          const keyframeList=document.createElement("div");
          keyframeList.className="franken-keyframe-list";
          const replaceKeyframes=(next)=>patch({transformKeyframes:[...next].sort((a,b)=>a.offsetFrames-b.offsetFrames)});
          for(const [keyIndex,keyframe] of (placement.transformKeyframes||[]).entries()){
            const row=document.createElement("div");
            row.className="franken-keyframe-row";
            const updateKey=(next)=>replaceKeyframes((placement.transformKeyframes||[]).map((item,index)=>index===keyIndex
              ?{...item,...next,transform:next.transform?{...item.transform,...next.transform}:item.transform}
              :item));
            row.append(
              number("Frame",keyframe.offsetFrames,0,Math.max(0,placement.durationFrames-1),1,(value)=>updateKey({offsetFrames:value})),
              number("X",keyframe.transform.x,-1,2,0.01,(value)=>updateKey({transform:{x:value}})),
              number("Y",keyframe.transform.y,-1,2,0.01,(value)=>updateKey({transform:{y:value}})),
              number("Scale",keyframe.transform.scale,0.05,8,0.05,(value)=>updateKey({transform:{scale:value}})),
              number("Rotate",keyframe.transform.rotationDegrees,-720,720,1,(value)=>updateKey({transform:{rotationDegrees:value}})),
            );
            const removeKey=document.createElement("button");
            removeKey.type="button";
            removeKey.textContent="DELETE";
            removeKey.addEventListener("click",()=>replaceKeyframes((placement.transformKeyframes||[]).filter((_,index)=>index!==keyIndex)));
            row.append(removeKey);
            keyframeList.append(row);
          }
          const addKey=document.createElement("button");
          addKey.type="button";
          addKey.className="franken-add-keyframe";
          addKey.disabled=(placement.transformKeyframes||[]).length>=4;
          addKey.textContent="ADD TRANSFORM KEYFRAME @ PLAYHEAD";
          addKey.addEventListener("click",()=>{
            const globalStart=globalFrameForPlacement(placement);
            let offset=Math.round(clamp(playheadFrame-globalStart,0,Math.max(0,placement.durationFrames-1)));
            const used=new Set((placement.transformKeyframes||[]).map(keyframe=>keyframe.offsetFrames));
            while(used.has(offset)&&offset<placement.durationFrames-1)offset+=1;
            while(used.has(offset)&&offset>0)offset-=1;
            if(used.has(offset))return;
            const transform=interpolateTransformAtFrame(placement.transform,placement.transformKeyframes,offset);
            replaceKeyframes([...(placement.transformKeyframes||[]),{offsetFrames:offset,transform}]);
          });
          keyframeList.append(addKey);
          controls.append(keyframeList);

          editor.append(head,controls);
          item.append(editor);
        }
        reservoirRoot.append(item);
      }
    }

    function renderTimeline(){
      if(!timelineRoot)return;
      timelineRoot.replaceChildren();
      const landmarks=state.nextGen?.snapLandmarks||[];
      const frameFromClientX=(clientX)=>{
        const rect=timelineRoot.getBoundingClientRect();
        if(!rect.width)return 0;
        return Math.max(0,Math.min(TOTAL_FRAMES-1,Math.round(((clientX-rect.left)/rect.width)*TOTAL_FRAMES)));
      };
      const beginTimelineGesture=(event,finish)=>{
        if(timelineGestureActive)return;
        timelineGestureActive=true;
        event.preventDefault();
        const complete=(upEvent)=>{
          if(!timelineGestureActive)return;
          timelineGestureActive=false;
          document.removeEventListener("pointerup",complete);
          document.removeEventListener("mouseup",complete);
          document.removeEventListener("pointercancel",cancel);
          finish(upEvent);
        };
        const cancel=()=>{
          timelineGestureActive=false;
          document.removeEventListener("pointerup",complete);
          document.removeEventListener("mouseup",complete);
          document.removeEventListener("pointercancel",cancel);
        };
        document.addEventListener("pointerup",complete);
        document.addEventListener("mouseup",complete);
        document.addEventListener("pointercancel",cancel,{once:true});
      };
      const setPlayhead=(frame)=>{
        playheadFrame=Math.max(0,Math.min(TOTAL_FRAMES-1,Math.round(Number(frame)||0)));
        if(playhead)playhead.value=String(playheadFrame);
        if(playheadReadout)playheadReadout.textContent=`Frame ${playheadFrame}`;
        renderPreview();
        renderTimeline();
      };

      for(const sceneId of SCENES){
        const band=document.createElement("div");
        band.className="franken-timeline-scene";
        band.dataset.sceneId=sceneId;
        band.style.left=`${(SCENE_STARTS[sceneId]/TOTAL_FRAMES)*100}%`;
        band.style.width=`${(SCENE_FRAMES/TOTAL_FRAMES)*100}%`;
        const label=document.createElement("span");
        label.textContent=sceneId;
        band.append(label);
        timelineRoot.append(band);
      }

      for(const mark of landmarks){
        const line=document.createElement("i");
        line.className="franken-timeline-landmark";
        line.dataset.kind=mark.kind;
        line.dataset.frame=String(mark.compositionFrame);
        line.style.left=`${(Number(mark.compositionFrame)/TOTAL_FRAMES)*100}%`;
        line.title=`${mark.kind} · ${mark.label} · frame ${mark.compositionFrame}`;
        timelineRoot.append(line);
      }

      const placements=state.edits.digestPlacements||[];
      for(const [index,placement] of placements.entries()){
        const descendant=descendantFor(state,placement.materialId);
        const clip=document.createElement("div");
        clip.className="franken-timeline-clip";
        clip.dataset.placementId=placement.placementId;
        clip.style.left=`${(globalFrameForPlacement(placement)/TOTAL_FRAMES)*100}%`;
        clip.style.width=`${Math.max(0.8,(Number(placement.durationFrames)/TOTAL_FRAMES)*100)}%`;
        clip.style.top=`${36+(index%3)*28}px`;
        clip.style.height="22px";
        clip.style.zIndex=String(100+index);
        const label=document.createElement("span");
        label.textContent=`${placement.placementId} · ${String(placement.materialId).split(":")[1]}`;
        const resize=document.createElement("button");
        resize.type="button";
        resize.className="franken-timeline-resize";
        resize.setAttribute("aria-label",`Resize ${placement.placementId}`);

        const beginMove=(event)=>{
          if(event.target===resize)return;
          const pointerOffset=frameFromClientX(event.clientX)-globalFrameForPlacement(placement);
          beginTimelineGesture(event,(upEvent)=>{
            const target=frameFromClientX(upEvent.clientX)-pointerOffset;
            const patch=movePlacementOnTimeline(placement,target,landmarks,snapEnabled);
            state=reduceBenchState(state,{type:"digest-edit",placementId:placement.placementId,patch});
            render();
          });
        };
        clip.addEventListener("pointerdown",beginMove);
        clip.addEventListener("mousedown",beginMove);

        const beginResize=(event)=>{
          event.stopPropagation();
          beginTimelineGesture(event,(upEvent)=>{
            const patch=resizePlacementOnTimeline(
              placement,
              frameFromClientX(upEvent.clientX),
              descendant?.sourceDurationFrames,
              landmarks,
              snapEnabled,
            );
            patch.transformKeyframes=(placement.transformKeyframes||[]).filter(keyframe=>keyframe.offsetFrames<patch.durationFrames);
            state=reduceBenchState(state,{type:"digest-edit",placementId:placement.placementId,patch});
            render();
          });
        };
        resize.addEventListener("pointerdown",beginResize);
        resize.addEventListener("mousedown",beginResize);
        clip.append(label,resize);
        timelineRoot.append(clip);
      }

      const line=document.createElement("i");
      line.className="franken-timeline-playhead-line";
      line.style.left=`${(playheadFrame/TOTAL_FRAMES)*100}%`;
      timelineRoot.append(line);

      timelineRoot.onpointerdown=(event)=>{
        if(event.target.closest?.(".franken-timeline-clip"))return;
        setPlayhead(frameFromClientX(event.clientX));
      };
      if(playhead)playhead.value=String(playheadFrame);
      if(playheadReadout)playheadReadout.textContent=`Frame ${playheadFrame}`;
      if(snapToggle)snapToggle.checked=snapEnabled;
    }

    function renderPreview(){
      if(!previewRoot)return;
      previewRoot.replaceChildren();
      const proposal=state.proposal;
      if(!proposal){
        const empty=document.createElement("p");
        empty.textContent="RECOMPOSE to build the proposal geometry preview.";
        previewRoot.append(empty);
        return;
      }
      for(const scene of proposal.scenes||[]){
        const card=document.createElement("section");
        card.className="franken-preview-scene";
        const title=document.createElement("strong");
        title.textContent=scene.sceneId;
        const viewport=document.createElement("div");
        viewport.className="franken-preview-viewport";
        for(const track of scene.tracks||[]){
          for(const clip of track.clips||[]){
            const node=document.createElement("div");
            node.className=`franken-preview-clip role-${String(track.role||"unknown").replace(/[^A-Za-z0-9_-]/g,"-")}`;
            node.dataset.clipId=clip.clipId;
            node.title=`${track.role} · ${clip.materialId} · f${clip.startFrame}+${clip.durationFrames}`;
            node.textContent=track.role==="video-digestion-placement"
              ?String(clip.materialId).split(":")[1]
              :track.role;
            const active=playheadFrame>=Number(clip.startFrame)&&playheadFrame<Number(clip.startFrame)+Number(clip.durationFrames);
            const localFrame=clamp(playheadFrame-Number(clip.startFrame),0,Math.max(0,Number(clip.durationFrames)-1));
            const transform=interpolateTransformAtFrame(clip.transform,clip.transformKeyframes||[],localFrame);
            const scale=Math.max(0.15,Math.min(2,Number(transform.scale)||1));
            node.dataset.active=String(active);
            node.style.left=`${(Number(transform.x)||0.5)*100}%`;
            node.style.top=`${(Number(transform.y)||0.5)*100}%`;
            node.style.width=`${Math.min(92,26*scale)}%`;
            node.style.height=`${Math.min(92,18*scale)}%`;
            node.style.opacity=String(active?Math.max(0.2,Number(clip.opacity)||1):0.13);
            node.style.transform=`translate(-50%,-50%) rotate(${Number(transform.rotationDegrees)||0}deg)`;
            node.style.zIndex=String(Number(clip.stackOrder)||0);
            if(clip.crop)node.dataset.cropped="true";
            viewport.append(node);
          }
        }
        const meta=document.createElement("small");
        meta.textContent=`${scene.tracks.reduce((sum,track)=>sum+(track.clips?.length||0),0)} clips · proposal @ frame ${playheadFrame}`;
        card.append(title,viewport,meta);
        previewRoot.append(card);
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
          let ordinal=placementsFor(state,materialId).length+1;
          let candidate=defaultDigestPlacement(descendant,lane.sceneId,ordinal);
          while(placementFor(state,candidate.placementId)){ordinal+=1;candidate=defaultDigestPlacement(descendant,lane.sceneId,ordinal);}
          state=reduceBenchState(state,{type:"digest-place",placement:candidate});
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
      renderTimeline();
      renderPreview();
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
    playhead?.addEventListener("input",()=>{
      playheadFrame=Math.max(0,Math.min(TOTAL_FRAMES-1,Number(playhead.value)||0));
      renderTimeline();
      renderPreview();
    });
    snapToggle?.addEventListener("change",()=>{snapEnabled=Boolean(snapToggle.checked);renderTimeline();});

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
    globalFrameForPlacement,
    interpolateTransformAtFrame,
    movePlacementOnTimeline,
    resizePlacementOnTimeline,
    sceneAtGlobalFrame,
    snapFrame,
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
    placementsFor,
    reduceBenchState,
  };
});
