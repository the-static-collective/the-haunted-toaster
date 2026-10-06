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

  function transportFrameForSeconds(seconds,durationSeconds){
    const duration=Number(durationSeconds);
    if(!Number.isFinite(duration)||duration<=0)return 0;
    const ratio=clamp(Number(seconds)||0,0,duration)/duration;
    return Math.max(0,Math.min(TOTAL_FRAMES-1,Math.round(ratio*(TOTAL_FRAMES-1))));
  }

  function previewMediaTime(clip,globalFrame,fps=24){
    const start=Number(clip?.startFrame)||0;
    const duration=Math.max(1,Number(clip?.durationFrames)||1);
    const local=clamp((Number(globalFrame)||0)-start,0,duration-1);
    const sourceStart=Number(clip?.sourceWindow?.startSeconds)||0;
    return sourceStart+local/Math.max(1,Number(fps)||24);
  }

  function residueStrengthAtFrame(residue,frame){
    const target=Math.floor(Number(frame));
    if(!Number.isFinite(target)||!residue)return 0;
    const birth=Number(residue.birthFrame);
    const death=Number(residue.deathFrame);
    if(target<birth)return 0;
    if(Number.isSafeInteger(death)&&target>=death)return 0;
    const initial=Number(residue.initialStrength)||0;
    const perFrame=Number(residue.decay?.perFrame)||0;
    const floor=Number(residue.decay?.floor)||0;
    const raw=initial-((target-birth)*perFrame);
    if(raw<=floor)return 0;
    return Math.max(0,Math.min(1,Math.round(raw*1_000_000)/1_000_000));
  }

  function residuePathPoints(path=[]){
    if(!Array.isArray(path))return "";
    return path
      .filter(point=>Number.isFinite(Number(point?.x))&&Number.isFinite(Number(point?.y)))
      .map(point=>`${Math.round(Number(point.x)*1000)},${Math.round(Number(point.y)*1000)}`)
      .join(" ");
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
      promotedMaterials:[],
      proposal:null,
      proposalIdentity:null,
      previewAssets:{},
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
    return [
      ...(state.nextGen?.videoDigestion?.descendants||[]),
      ...(state.promotedMaterials||[]).map(entry=>entry.descriptor),
    ].find((descendant)=>descendant.materialId===materialId)||null;
  }

  function reduceBenchState(state,action){
    switch(action.type){
      case "path":
        return markDirty({
          ...state,
          paths:{...state.paths,[action.key]:action.value||null},
          proposal:null,
          proposalIdentity:null,
          previewAssets:{},
        });
      case "seed":
        return markDirty({
          ...state,
          seed:String(action.value||"franken-001"),
          nextGen:null,
          proposal:null,
          proposalIdentity:null,
          previewAssets:{},
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
      case "digest-replace":
        if(!Array.isArray(action.value)||action.value.length>96)throw new Error("Franken editor supports at most ninety-six digestion placements.");
        return markDirty({
          ...state,
          edits:{
            ...state.edits,
            digestPlacements:[...action.value],
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
      case "promoted-material-admit":{
        const value=action.value;
        if(!value?.admissionPath||!value?.descriptor?.materialId)throw new Error("Adopted material admission requires a package path and descriptor.");
        const existing=(state.promotedMaterials||[]).find(entry=>entry.descriptor.materialId===value.descriptor.materialId);
        if(existing){
          if(existing.admissionHash!==value.admissionHash)throw new Error("Adopted material identity collides with a different admission.");
          return state;
        }
        const descriptor={
          ...value.descriptor,
          slot:7+(state.promotedMaterials||[]).length,
          isAdoptedArtifact:true,
        };
        return {
          ...state,
          promotedMaterials:[...(state.promotedMaterials||[]),{...value,descriptor}],
        };
      }
      case "nextgen":
        return markDirty({
          ...state,
          nextGen:action.value||null,
          proposal:null,
          proposalIdentity:null,
          previewAssets:{},
          edits:{...applyNextGenPressure(state.edits,action.value),digestPlacements:[]},
        });
      case "proposal":{
        const p=action.result.proposal;
        return {
          ...state,
          proposal:p,
          proposalIdentity:action.result.proposalIdentity,
          previewAssets:{...(action.result.previewAssets||{})},
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
      adoptedArtifactAdmissionPaths:(state.promotedMaterials||[]).map(entry=>entry.admissionPath),
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
    const timelineScroll=document.getElementById("frankenTimelineScroll");
    const timelineZoomControl=document.getElementById("frankenTimelineZoom");
    const transportAudio=document.getElementById("frankenTransportAudio");
    const transportPlay=document.getElementById("frankenTransportPlay");
    const transportPause=document.getElementById("frankenTransportPause");
    const transportStatus=document.getElementById("frankenTransportStatus");
    const onePassBegin=document.getElementById("frankenOnePassBegin");
    const onePassStatus=document.getElementById("frankenOnePassStatus");
    const onePassProgress=document.getElementById("frankenOnePassProgress");
    const onePassLanes=document.getElementById("frankenOnePassLanes");
    const onePassReceipt=document.getElementById("frankenOnePassReceipt");
    const onePassCompile=document.getElementById("frankenCompileTake");
    const onePassProgram=document.getElementById("frankenPerformanceProgram");
    const buildGenealogy=document.getElementById("frankenBuildGenealogy");
    const genealogyReadout=document.getElementById("frankenGenerationalEcology");
    const terrainBuild=document.getElementById("frankenTerrainBuild");
    const terrainStatus=document.getElementById("frankenTerrainStatus");
    const terrainSelect=document.getElementById("frankenTerrainSelect");
    const terrainCanvas=document.getElementById("frankenTerrainCanvas");
    const terrainPoint=document.getElementById("frankenTerrainPoint");
    const terrainProposal=document.getElementById("frankenTerrainProposal");
    const terrainBinding=document.getElementById("frankenTerrainBinding");
    const terrainAccept=document.getElementById("frankenTerrainAccept");
    const prepareScope=document.getElementById("frankenPrepareScope");
    const approveScope=document.getElementById("frankenApproveScope");
    const executeScope=document.getElementById("frankenExecuteScope");
    const scopeProposalReadout=document.getElementById("frankenScopeProposal");
    const scopeRegions=document.getElementById("frankenScopeRegions");
    const scopeApprovalReadout=document.getElementById("frankenScopeApproval");
    const executionResultReadout=document.getElementById("frankenExecutionResult");
    const buildReview=document.getElementById("frankenBuildReview");
    const adoptReview=document.getElementById("frankenAdoptReview");
    const rejectReview=document.getElementById("frankenRejectReview");
    const candidateReviewVideo=document.getElementById("frankenCandidateReviewVideo");
    const candidateGraphReadout=document.getElementById("frankenCandidateGraph");
    const reviewMediaReadout=document.getElementById("frankenReviewMedia");
    const artifactDispositionReadout=document.getElementById("frankenArtifactDisposition");
    const proposeArtifactImport=document.getElementById("frankenProposeArtifactImport");
    const admitArtifactMaterial=document.getElementById("frankenAdmitArtifactMaterial");
    const artifactImportStatus=document.getElementById("frankenArtifactImportStatus");
    const performanceAudio=document.getElementById("syncAudio");
    const onePassApi=view?.OnePass||null;
    const ONE_PASS_KEYS=["a","s","d","j","k","l"];
    let onePassSession=null;
    let onePassConsumed=false;
    let onePassAnimation=null;
    let onePassReceiptPath=null;
    let onePassPersistenceError=null;
    let onePassEcology=null;
    let onePassEcologyError=null;
    let onePassProgramBundle=null;
    let onePassProgramError=null;
    let generationalEcology=null;
    let generationalEcologyError=null;
    let possibilityTerrain=null;
    let possibilityTerrainError=null;
    let activeTerrainEntryId=null;
    let possibilityProposal=null;
    let possibilityBinding=null;
    let crossingExecutionScope=null;
    let crossingScopeApproval=null;
    let crossingExecutionResult=null;
    let executionCustodyError=null;
    let candidateArtifactReview=null;
    let artifactDisposition=null;
    let artifactReviewError=null;
    let artifactImportProposal=null;
    let artifactMaterialAdmission=null;
    let artifactPromotionError=null;
    let playheadFrame=0;
    let snapEnabled=true;
    let timelineGestureActive=false;
    let timelineZoom=1;
    let transportMeta=null;
    let transportRaf=null;
    let previewClipIndex=new Map();
    let timelinePlayheadLine=null;

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
      const promoted=(state.promotedMaterials||[]).map(entry=>entry.descriptor);
      pressureRoot.replaceChildren();
      reservoirRoot.replaceChildren();
      pressureRoot.hidden=!crossing;
      reservoirRoot.hidden=!crossing&&!promoted.length;

      if(!crossing&&!promoted.length){
        nextGenStatus.textContent="Not loaded. Human edits and FREEZE remain authoritative.";
        return;
      }

      if(crossing){
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
      }else{
        nextGenStatus.textContent=`${promoted.length} adopted material${promoted.length===1?"":"s"} admitted · no placement yet · FREEZE remains authoritative`;
      }

      const descendants=[
        ...(crossing?.videoDigestion?.descendants||[]),
        ...promoted,
      ];
      if(!descendants.length){
        const item=document.createElement("span");
        item.innerHTML="<b>VIDEO RESERVOIR SLEEPING</b><small>Admit one video and generate Six-Up, or ADOPT + ADMIT a reviewed world.</small>";
        reservoirRoot.append(item);
        return;
      }

      for(const descendant of descendants){
        const adopted=descendant.isAdoptedArtifact===true;
        const item=document.createElement("span");
        item.className="franken-digest-card";
        item.draggable=true;
        item.dataset.materialId=descendant.materialId;
        item.dataset.materialClass=adopted?"adopted-artifact":"video-digestion";
        item.addEventListener("dragstart",(event)=>{
          event.dataTransfer?.setData("text/x-franken-digest",descendant.materialId);
          if(event.dataTransfer)event.dataTransfer.effectAllowed="copy";
        });

        const title=document.createElement("b");
        title.textContent=adopted
          ?`#${descendant.slot} · ADOPTED WORLD`
          :`#${descendant.slot} · ${descendant.roleId}`;

        if(!adopted&&onePassEcology?.trace&&onePassEcology?.residueMemory){
          const residueNote=document.createElement("small");
          residueNote.className="franken-residue-label";
          residueNote.textContent=`${onePassEcology.residueMemory.residues?.length||0} witnessed residue memories available in live preview`;
          item.append(residueNote);
        }

        const meta=document.createElement("small");
        meta.textContent=adopted
          ?`ADOPTED · ${String(descendant.admissionHash||descendant.planHash||"").slice(0,10)} · ${descendant.sourceDurationFrames}f source · placement authority NONE`
          :`${descendant.projectionClass} · ${descendant.planHash.slice(0,10)} · ${descendant.sourceDurationFrames}f source`;
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

    function transportSecondsForFrame(frame){
      if(!transportMeta?.duration)return 0;
      return (clamp(frame,0,TOTAL_FRAMES-1)/(TOTAL_FRAMES-1))*transportMeta.duration;
    }

    function updateTimelinePlayhead(){
      if(timelinePlayheadLine)timelinePlayheadLine.style.left=`${(playheadFrame/TOTAL_FRAMES)*100}%`;
      if(playhead)playhead.value=String(playheadFrame);
      if(playheadReadout)playheadReadout.textContent=`Frame ${playheadFrame}`;
    }

    function updateTransportStatus(){
      if(!transportStatus)return;
      if(!transportMeta){
        transportStatus.textContent="Choose a song in Full Measure to enable synchronized transport.";
        return;
      }
      const current=transportSecondsForFrame(playheadFrame);
      const mode=transportAudio&&!transportAudio.paused?"PLAYING":"PAUSED";
      transportStatus.textContent=`${mode} · ${transportMeta.filename||"song"} · ${current.toFixed(2)}s / ${Number(transportMeta.duration).toFixed(2)}s`;
    }

    function updateResiduePreview(){
      if(!previewRoot)return;
      const memory=onePassEcology?.residueMemory;
      if(!memory)return;
      const activeScene=sceneAtGlobalFrame(playheadFrame).sceneId;
      for(const layer of previewRoot.querySelectorAll(".franken-residue-layer")){
        const sceneId=layer.closest(".franken-preview-scene")?.dataset?.sceneId||"";
        const active=sceneId===activeScene;
        let visible=0;
        for(const mark of layer.querySelectorAll("[data-residue-id]")){
          const residue=(memory.residues||[]).find(item=>item.residueId===mark.dataset.residueId);
          const strength=active?residueStrengthAtFrame(residue,playheadFrame):0;
          mark.style.opacity=String(strength);
          if(strength>0)visible+=1;
        }
        layer.dataset.active=String(active&&visible>0);
        const label=layer.querySelector(".franken-residue-label");
        if(label)label.textContent=visible?`RESIDUE MEMORY · ${visible} scar${visible===1?"":"s"}`:"";
      }
    }

    function updatePreviewFrame(){
      for(const entry of previewClipIndex.values()){
        const {clip,node,media}=entry;
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
        if(media?.tagName==="VIDEO"){
          const target=previewMediaTime(clip,playheadFrame,24);
          if(Number.isFinite(target)&&Math.abs(Number(media.currentTime||0)-target)>0.08){
            try{media.currentTime=target;}catch(_error){}
          }
        }
      }
      previewRoot?.querySelectorAll(".franken-preview-scene").forEach((scene)=>{
        const meta=scene.querySelector(":scope > small");
        if(meta)meta.dataset.playheadFrame=String(playheadFrame);
      });
      if(playhead)playhead.value=String(playheadFrame);
      if(playheadReadout)playheadReadout.textContent=`Frame ${playheadFrame}`;
      updateTransportStatus();
      updateResiduePreview();
    }

    function setPlayhead(frame,{seekAudio=true}={}){
      playheadFrame=Math.max(0,Math.min(TOTAL_FRAMES-1,Math.round(Number(frame)||0)));
      if(seekAudio&&transportMeta&&transportAudio){
        const seconds=transportSecondsForFrame(playheadFrame);
        if(Number.isFinite(seconds)){
          try{transportAudio.currentTime=seconds;}catch(_error){}
        }
      }
      updateTimelinePlayhead();
      updatePreviewFrame();
    }

    async function ensureTransportReady(){
      if(!transportAudio||!transportMeta)return false;
      if(transportAudio.readyState>0)return true;
      return new Promise((resolve,reject)=>{
        const ready=()=>{cleanup();resolve(true);};
        const failed=()=>{cleanup();reject(new Error("Song transport could not load this audio source."));};
        const cleanup=()=>{
          transportAudio.removeEventListener("loadedmetadata",ready);
          transportAudio.removeEventListener("error",failed);
        };
        transportAudio.addEventListener("loadedmetadata",ready,{once:true});
        transportAudio.addEventListener("error",failed,{once:true});
        transportAudio.load();
      });
    }

    function stopTransportLoop(){
      if(transportRaf&&view?.cancelAnimationFrame)view.cancelAnimationFrame(transportRaf);
      transportRaf=null;
    }

    function runTransportLoop(){
      stopTransportLoop();
      const tick=()=>{
        if(!transportAudio||transportAudio.paused||!transportMeta){transportRaf=null;updateTransportStatus();return;}
        playheadFrame=transportFrameForSeconds(transportAudio.currentTime,transportMeta.duration);
        updateTimelinePlayhead();
        updatePreviewFrame();
        transportRaf=view?.requestAnimationFrame?view.requestAnimationFrame(tick):null;
      };
      tick();
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
      timelinePlayheadLine=line;
      timelineRoot.append(line);
      updateTimelinePlayhead();

      timelineRoot.onpointerdown=(event)=>{
        if(event.target.closest?.(".franken-timeline-clip"))return;
        setPlayhead(frameFromClientX(event.clientX));
      };
      timelineRoot.style.width=`${timelineZoom*100}%`;
      if(snapToggle)snapToggle.checked=snapEnabled;
    }

    function renderPreview(){
      if(!previewRoot)return;
      previewRoot.replaceChildren();
      previewClipIndex=new Map();
      const proposal=state.proposal;
      if(!proposal){
        const empty=document.createElement("p");
        empty.textContent="RECOMPOSE to build the proposal media preview.";
        previewRoot.append(empty);
        return;
      }
      for(const scene of proposal.scenes||[]){
        const card=document.createElement("section");
        card.className="franken-preview-scene";
        card.dataset.sceneId=scene.sceneId;
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
            node.style.zIndex=String(Number(clip.stackOrder)||0);
            if(clip.crop)node.dataset.cropped="true";

            const asset=state.previewAssets?.[clip.materialId]||null;
            let media=null;
            if(asset?.url&&["image","video"].includes(asset.kind)){
              media=document.createElement(asset.kind==="video"?"video":"img");
              media.className="franken-preview-media";
              media.src=asset.url;
              if(asset.kind==="video"){
                media.muted=true;
                media.playsInline=true;
                media.preload="metadata";
                media.addEventListener("loadedmetadata",()=>updatePreviewFrame(),{once:true});
              }else{
                media.alt="";
              }
              if(clip.crop){
                media.style.inset="auto";
                media.style.width=`${100/clip.crop.width}%`;
                media.style.height=`${100/clip.crop.height}%`;
                media.style.left=`${-(clip.crop.x/clip.crop.width)*100}%`;
                media.style.top=`${-(clip.crop.y/clip.crop.height)*100}%`;
              }
              node.classList.add("has-media");
              node.append(media);
            }

            const label=document.createElement("span");
            label.className="franken-preview-label";
            label.textContent=track.role==="video-digestion-placement"
              ?String(clip.materialId).split(":")[1]
              :track.role;
            node.append(label);
            viewport.append(node);
            previewClipIndex.set(clip.clipId,{clip,node,media});
          }
        }
        const meta=document.createElement("small");
        meta.textContent=`${scene.tracks.reduce((sum,track)=>sum+(track.clips?.length||0),0)} clips · proposal media preview`;
        card.append(title,viewport,meta);
        previewRoot.append(card);
      }
      updatePreviewFrame();
    }

    function resetArtifactPromotion(){
      artifactImportProposal=null;
      artifactMaterialAdmission=null;
      artifactPromotionError=null;
    }

    function resetArtifactReview(){
      candidateArtifactReview=null;
      artifactDisposition=null;
      artifactReviewError=null;
      resetArtifactPromotion();
      delete root.dataset.candidateGraphHash;
      delete root.dataset.artifactDispositionHash;
      if(candidateReviewVideo){
        candidateReviewVideo.pause?.();
        candidateReviewVideo.removeAttribute("src");
        candidateReviewVideo.load?.();
      }
    }

    function resetExecutionCustody(){
      crossingExecutionScope=null;
      crossingScopeApproval=null;
      crossingExecutionResult=null;
      executionCustodyError=null;
      resetArtifactReview();
      delete root.dataset.crossingScopeProposalHash;
      delete root.dataset.crossingScopeApprovalHash;
      delete root.dataset.crossingExecutionResultHash;
    }

    function resetPossibilityTerrain(){
      possibilityTerrain=null;
      possibilityTerrainError=null;
      activeTerrainEntryId=null;
      possibilityProposal=null;
      possibilityBinding=null;
      resetExecutionCustody();
      delete root.dataset.possibilityProposalHash;
      delete root.dataset.possibilityBindingHash;
    }

    function activeTerrainEntry(){
      const maps=possibilityTerrain?.terrain?.maps||[];
      return maps.find(entry=>entry.terrainEntryId===activeTerrainEntryId)||maps[0]||null;
    }

    function terrainProjectionFor(entry){
      return (possibilityTerrain?.projection?.maps||[]).find(item=>item.terrainEntryId===entry?.terrainEntryId)||null;
    }

    function inspectTerrainFrame(frame,point){
      const exactFrame=Math.max(0,Math.round(Number(frame)||0));
      setPlayhead(exactFrame,{seekAudio:false});
      const exactSeconds=exactFrame/24;
      for(const audio of [transportAudio,performanceAudio]){
        if(!audio)continue;
        const duration=Number(audio.duration);
        const target=Number.isFinite(duration)&&duration>0?Math.min(duration,exactSeconds):exactSeconds;
        try{audio.currentTime=Math.max(0,target);}catch(_error){}
      }
      if(terrainPoint&&point){
        const kinds=(point.contributionKinds||[]).length?(point.contributionKinds||[]).join(" + "):"base energy only";
        terrainPoint.textContent=`FRAME ${point.frame} · ENERGY ${point.energy} · Δ ${point.totalDelta} · ${kinds}`;
        terrainPoint.title=point.transitionHash||"";
      }
    }

    async function proposeTerrainPoint(frame){
      const entry=activeTerrainEntry();
      if(!entry||typeof bridge.proposePossibilityCrossing!=="function")return;
      const point=(entry.map?.points||[]).find(item=>item.frame===Number(frame));
      if(!point)return;
      possibilityTerrainError=null;
      try{
        possibilityProposal=await bridge.proposePossibilityCrossing(entry.map,point.frame);
        possibilityBinding=null;
        resetExecutionCustody();
        root.dataset.possibilityProposalHash=possibilityProposal.proposalHash||"";
        delete root.dataset.possibilityBindingHash;
      }catch(error){
        possibilityTerrainError=error?.message||String(error);
      }
      renderTerrain();
    }

    async function acceptTerrainProposal(){
      if(!possibilityProposal||typeof bridge.acceptPossibilityCrossing!=="function")return;
      possibilityTerrainError=null;
      if(terrainAccept){
        terrainAccept.disabled=true;
        terrainAccept.textContent="ACCEPTING…";
      }
      try{
        possibilityBinding=await bridge.acceptPossibilityCrossing(
          possibilityProposal,
          possibilityProposal.proposalHash,
        );
        resetExecutionCustody();
        root.dataset.possibilityBindingHash=possibilityBinding?.binding?.bindingHash||"";
      }catch(error){
        possibilityTerrainError=error?.message||String(error);
      }
      renderTerrain();
    }

    async function prepareAcceptedCrossingScope(){
      if(!possibilityBinding?.binding||onePassSession?.status!=="finished"||typeof bridge.prepareCrossingExecution!=="function")return;
      executionCustodyError=null;
      crossingScopeApproval=null;
      crossingExecutionResult=null;
      resetArtifactReview();
      try{
        crossingExecutionScope=await bridge.prepareCrossingExecution(
          onePassSession.receipt,
          possibilityBinding.binding,
          {wakeStrength:1},
        );
        root.dataset.crossingScopeProposalHash=crossingExecutionScope?.scopeProposal?.scopeProposalHash||"";
        delete root.dataset.crossingScopeApprovalHash;
        delete root.dataset.crossingExecutionResultHash;
      }catch(error){
        crossingExecutionScope=null;
        executionCustodyError=error?.message||String(error);
      }
      renderExecutionCustody();
    }

    async function approveAcceptedCrossingScope(){
      if(!crossingExecutionScope?.scopeProposal||!possibilityBinding?.binding||typeof bridge.approveCrossingExecutionScope!=="function")return;
      executionCustodyError=null;
      crossingExecutionResult=null;
      resetArtifactReview();
      try{
        crossingScopeApproval=await bridge.approveCrossingExecutionScope(
          onePassSession.receipt,
          possibilityBinding.binding,
          crossingExecutionScope.scopeProposal,
          crossingExecutionScope.scopeProposal.scopeProposalHash,
        );
        root.dataset.crossingScopeApprovalHash=crossingScopeApproval?.approval?.scopeApprovalHash||"";
        delete root.dataset.crossingExecutionResultHash;
      }catch(error){
        crossingScopeApproval=null;
        executionCustodyError=error?.message||String(error);
      }
      renderExecutionCustody();
    }

    async function executeAcceptedCrossingScope(){
      if(!crossingExecutionScope?.scopeProposal||!crossingScopeApproval?.approval||!possibilityBinding?.binding||typeof bridge.executeApprovedCrossing!=="function")return;
      executionCustodyError=null;
      resetArtifactReview();
      if(executeScope){
        executeScope.disabled=true;
        executeScope.textContent="EXECUTING…";
      }
      try{
        crossingExecutionResult=await bridge.executeApprovedCrossing(
          onePassSession.receipt,
          possibilityBinding.binding,
          crossingExecutionScope.scopeProposal,
          crossingScopeApproval.approval,
          {localExecutionAuthorized:true},
        );
        root.dataset.crossingExecutionResultHash=crossingExecutionResult?.result?.resultHash||"";
      }catch(error){
        crossingExecutionResult=null;
        executionCustodyError=error?.message||String(error);
      }
      renderExecutionCustody();
    }

    async function buildCandidateReview(){
      if(!crossingExecutionResult?.result||!crossingExecutionScope?.scopeProposal||!crossingScopeApproval?.approval||!possibilityBinding?.binding||typeof bridge.prepareCandidateArtifactReview!=="function")return;
      artifactReviewError=null;
      artifactDisposition=null;
      if(buildReview){
        buildReview.disabled=true;
        buildReview.textContent="BUILDING REVIEW…";
      }
      try{
        candidateArtifactReview=await bridge.prepareCandidateArtifactReview(
          onePassSession.receipt,
          possibilityBinding.binding,
          crossingExecutionScope.scopeProposal,
          crossingScopeApproval.approval,
          crossingExecutionResult,
        );
        root.dataset.candidateGraphHash=candidateArtifactReview?.graph?.candidateGraphHash||"";
        delete root.dataset.artifactDispositionHash;
      }catch(error){
        candidateArtifactReview=null;
        artifactReviewError=error?.message||String(error);
      }
      renderArtifactReview();
    }

    async function decideArtifactReview(decision){
      if(!candidateArtifactReview?.graph||!candidateArtifactReview?.reviewReceipt||typeof bridge.decideCandidateArtifact!=="function")return;
      artifactReviewError=null;
      try{
        artifactDisposition=await bridge.decideCandidateArtifact(
          candidateArtifactReview.graph,
          candidateArtifactReview.reviewReceipt,
          decision,
          candidateArtifactReview.graph.candidateGraphHash,
        );
        resetArtifactPromotion();
        root.dataset.artifactDispositionHash=artifactDisposition?.disposition?.dispositionHash||"";
      }catch(error){
        artifactDisposition=null;
        artifactReviewError=error?.message||String(error);
      }
      renderArtifactReview();
    }

    async function proposeCurrentArtifactImport(){
      if(artifactDisposition?.disposition?.decision!=="ADOPT"||!candidateArtifactReview?.graph||!candidateArtifactReview?.reviewReceipt||!candidateArtifactReview?.mediaPath||typeof bridge.proposeAdoptedArtifactImport!=="function")return;
      artifactPromotionError=null;
      artifactMaterialAdmission=null;
      try{
        artifactImportProposal=await bridge.proposeAdoptedArtifactImport(
          candidateArtifactReview.graph,
          candidateArtifactReview.reviewReceipt,
          artifactDisposition.disposition,
          candidateArtifactReview.mediaPath,
        );
      }catch(error){
        artifactImportProposal=null;
        artifactPromotionError=error?.message||String(error);
      }
      renderArtifactPromotion();
    }

    async function admitCurrentArtifactMaterial(){
      if(!artifactImportProposal?.proposal||!candidateArtifactReview?.mediaPath||typeof bridge.admitAdoptedArtifactImport!=="function")return;
      artifactPromotionError=null;
      try{
        artifactMaterialAdmission=await bridge.admitAdoptedArtifactImport(
          artifactImportProposal.proposal,
          artifactImportProposal.proposal.importProposalHash,
          candidateArtifactReview.mediaPath,
        );
        state=reduceBenchState(state,{
          type:"promoted-material-admit",
          value:{
            admissionPath:artifactMaterialAdmission.admissionPath,
            admissionHash:artifactMaterialAdmission.admission?.admissionHash,
            descriptor:artifactMaterialAdmission.descriptor,
            materialUrl:artifactMaterialAdmission.materialUrl,
          },
        });
      }catch(error){
        artifactMaterialAdmission=null;
        artifactPromotionError=error?.message||String(error);
      }
      render();
    }

    function renderArtifactPromotion(){
      if(!proposeArtifactImport||!admitArtifactMaterial||!artifactImportStatus)return;
      const adopted=artifactDisposition?.disposition?.decision==="ADOPT";
      proposeArtifactImport.disabled=!adopted||Boolean(artifactImportProposal?.proposal)||typeof bridge.proposeAdoptedArtifactImport!=="function";
      admitArtifactMaterial.disabled=!artifactImportProposal?.proposal||Boolean(artifactMaterialAdmission?.admission)||typeof bridge.admitAdoptedArtifactImport!=="function";

      if(artifactPromotionError){
        artifactImportStatus.textContent=`PROMOTION ERROR · ${artifactPromotionError}`;
        artifactImportStatus.title=artifactPromotionError;
      }else if(artifactMaterialAdmission?.admission){
        artifactImportStatus.textContent=`ADMITTED MATERIAL · ${artifactMaterialAdmission.descriptor?.materialId||""} · NO PLACEMENT YET · ${filename(artifactMaterialAdmission.admissionPath)}`;
        artifactImportStatus.title=artifactMaterialAdmission.admission.admissionHash||"";
      }else if(artifactImportProposal?.proposal){
        artifactImportStatus.textContent=`IMPORT PROPOSAL · ${String(artifactImportProposal.proposal.importProposalHash||"").slice(0,16)} · material admission still required`;
        artifactImportStatus.title=artifactImportProposal.proposal.importProposalHash||"";
      }else if(adopted){
        artifactImportStatus.textContent="ADOPTED · PROPOSE IMPORT to return this exact reviewed world as ordinary material.";
        artifactImportStatus.title=artifactDisposition.disposition.dispositionHash||"";
      }else if(artifactDisposition?.disposition?.decision==="REJECT"){
        artifactImportStatus.textContent="REJECTED · import unavailable; evidence remains preserved.";
        artifactImportStatus.title=artifactDisposition.disposition.dispositionHash||"";
      }else{
        artifactImportStatus.textContent="No material import proposed";
        artifactImportStatus.title="";
      }

      proposeArtifactImport.textContent=artifactImportProposal?.proposal?"IMPORT PROPOSED":"PROPOSE IMPORT";
      admitArtifactMaterial.textContent=artifactMaterialAdmission?.admission?"MATERIAL ADMITTED":"ADMIT AS MATERIAL";
    }

    function renderArtifactReview(){
      renderArtifactPromotion();
      if(!buildReview||!adoptReview||!rejectReview||!candidateReviewVideo||!candidateGraphReadout||!reviewMediaReadout||!artifactDispositionReadout)return;
      const executable=Boolean(crossingExecutionResult?.result);
      buildReview.disabled=!executable||typeof bridge.prepareCandidateArtifactReview!=="function";
      buildReview.textContent=candidateArtifactReview?"REBUILD REVIEW":"BUILD REVIEW";
      const reviewReady=Boolean(candidateArtifactReview?.graph&&candidateArtifactReview?.reviewReceipt);
      const decided=Boolean(artifactDisposition?.disposition);
      adoptReview.disabled=!reviewReady||decided;
      rejectReview.disabled=!reviewReady||decided;

      if(artifactReviewError){
        candidateGraphReadout.textContent=`REVIEW ERROR · ${artifactReviewError}`;
        candidateGraphReadout.title=artifactReviewError;
      }else if(candidateArtifactReview?.graph){
        const graph=candidateArtifactReview.graph;
        candidateGraphReadout.textContent=`CANDIDATE GRAPH · ${graph.changedFrameCount} derived frames / ${graph.frameCount} total · ${String(graph.candidateGraphHash||"").slice(0,16)}`;
        candidateGraphReadout.title=graph.candidateGraphHash||"";
      }else{
        candidateGraphReadout.textContent=executable
          ?"Execution witnessed · BUILD REVIEW to assemble exact source + derived pixels."
          :"No candidate derived frame graph";
        candidateGraphReadout.title="";
      }

      if(candidateArtifactReview?.reviewReceipt){
        const receipt=candidateArtifactReview.reviewReceipt;
        reviewMediaReadout.textContent=`REVIEW MP4 · ${receipt.mediaByteLength} bytes · sha256 ${String(receipt.mediaSha256||"").slice(0,16)}`;
        reviewMediaReadout.title=receipt.mediaSha256||"";
        if(candidateReviewVideo.src!==candidateArtifactReview.mediaUrl){
          candidateReviewVideo.src=candidateArtifactReview.mediaUrl||"";
          candidateReviewVideo.load?.();
        }
      }else{
        reviewMediaReadout.textContent="No review media";
        reviewMediaReadout.title="";
        if(candidateReviewVideo.getAttribute("src")){
          candidateReviewVideo.pause?.();
          candidateReviewVideo.removeAttribute("src");
          candidateReviewVideo.load?.();
        }
      }

      if(artifactDisposition?.disposition){
        const disposition=artifactDisposition.disposition;
        artifactDispositionReadout.textContent=`${disposition.decision} · ${String(disposition.dispositionHash||"").slice(0,16)} · ${filename(artifactDisposition.path)}`;
        artifactDispositionReadout.title=disposition.dispositionHash||"";
        adoptReview.textContent=disposition.decision==="ADOPT"?"ADOPTED":"ADOPT";
        rejectReview.textContent=disposition.decision==="REJECT"?"REJECTED":"REJECT";
      }else{
        artifactDispositionReadout.textContent="No artifact disposition";
        artifactDispositionReadout.title="";
        adoptReview.textContent="ADOPT";
        rejectReview.textContent="REJECT";
      }
      renderArtifactPromotion();
    }

    function renderExecutionCustody(){
      renderArtifactReview();
      if(!prepareScope||!approveScope||!executeScope||!scopeProposalReadout||!scopeRegions||!scopeApprovalReadout||!executionResultReadout)return;
      const accepted=possibilityBinding?.binding||null;
      prepareScope.disabled=!accepted||typeof bridge.prepareCrossingExecution!=="function";
      prepareScope.textContent=crossingExecutionScope?"SCOPE PREPARED":"PREPARE SCOPE";
      approveScope.disabled=!crossingExecutionScope?.scopeProposal||Boolean(crossingScopeApproval?.approval)||typeof bridge.approveCrossingExecutionScope!=="function";
      approveScope.textContent=crossingScopeApproval?.approval?"SCOPE APPROVED":"APPROVE SCOPE";
      executeScope.disabled=!crossingScopeApproval?.approval||Boolean(crossingExecutionResult?.result)||typeof bridge.executeApprovedCrossing!=="function";
      executeScope.textContent=crossingExecutionResult?.result?"EXECUTED · WITNESS ONLY":"AUTHORIZE LOCAL EXECUTION";

      scopeRegions.replaceChildren();
      if(executionCustodyError){
        scopeProposalReadout.textContent=`CUSTODY ERROR · ${executionCustodyError}`;
        scopeProposalReadout.title=executionCustodyError;
      }else if(crossingExecutionScope?.scopeProposal){
        const scope=crossingExecutionScope.scopeProposal;
        scopeProposalReadout.textContent=`SCOPE PROPOSAL · ${scope.changedFrameCount} changed frames · ${scope.affectedRegionCount} exact regions · ${String(scope.scopeProposalHash||"").slice(0,16)}`;
        scopeProposalReadout.title=scope.scopeProposalHash||"";
        for(const region of scope.affectedRegions||[]){
          const item=document.createElement("span");
          item.textContent=`${region.regionId} · ${region.startFrame}–${region.endFrameExclusive-1}`;
          scopeRegions.append(item);
        }
      }else{
        scopeProposalReadout.textContent=accepted
          ?"Accepted relation · PREPARE SCOPE to derive exact changed regions."
          :"No affected-region proposal";
        scopeProposalReadout.title="";
      }

      if(crossingScopeApproval?.approval){
        scopeApprovalReadout.textContent=`SCOPE APPROVED · ${crossingScopeApproval.approval.approvedRegionIds.length} regions · ${String(crossingScopeApproval.approval.scopeApprovalHash||"").slice(0,16)} · ${filename(crossingScopeApproval.path)}`;
        scopeApprovalReadout.title=crossingScopeApproval.approval.scopeApprovalHash||"";
      }else{
        scopeApprovalReadout.textContent="No scope approval";
        scopeApprovalReadout.title="";
      }

      if(crossingExecutionResult?.result){
        executionResultReadout.textContent=`EXECUTION WITNESS · ${crossingExecutionResult.receiptCount} regions · parcel ${String(crossingExecutionResult.parcel?.parcelHash||"").slice(0,12)} · result ${String(crossingExecutionResult.result.resultHash||"").slice(0,12)} · ${crossingExecutionResult.directory||""}`;
        executionResultReadout.title=crossingExecutionResult.result.resultHash||"";
      }else{
        executionResultReadout.textContent="No execution authorized";
        executionResultReadout.title="";
      }
    }

    async function buildPossibilityTerrain(){
      if(onePassSession?.status!=="finished"||!onePassProgramBundle||typeof bridge.derivePlayableTerrain!=="function")return;
      possibilityTerrainError=null;
      possibilityProposal=null;
      possibilityBinding=null;
      resetExecutionCustody();
      if(terrainBuild){
        terrainBuild.disabled=true;
        terrainBuild.textContent="BUILDING…";
      }
      try{
        possibilityTerrain=await bridge.derivePlayableTerrain(onePassSession.receipt,{
          maxSamples:64,
          baseEnergy:.8,
        });
        activeTerrainEntryId=possibilityTerrain?.terrain?.maps?.[0]?.terrainEntryId||null;
      }catch(error){
        possibilityTerrain=null;
        possibilityTerrainError=error?.message||String(error);
      }
      renderTerrain();
    }

    function renderTerrain(){
      if(!terrainBuild||!terrainStatus||!terrainSelect||!terrainCanvas||!terrainPoint||!terrainProposal||!terrainBinding||!terrainAccept)return;
      renderExecutionCustody();
      const canBuild=onePassSession?.status==="finished"&&Boolean(onePassProgramBundle)&&typeof bridge.derivePlayableTerrain==="function";
      terrainBuild.disabled=!canBuild;
      terrainBuild.textContent=possibilityTerrain?"REBUILD TERRAIN":"BUILD TERRAIN";
      terrainSelect.replaceChildren();

      if(possibilityTerrainError){
        terrainStatus.textContent=`Terrain error · ${possibilityTerrainError}`;
      }else if(!onePassProgramBundle){
        terrainStatus.textContent="Compile a sealed ONE PASS take to expose its residue terrain.";
      }else if(!possibilityTerrain){
        terrainStatus.textContent="Program compiled · BUILD TERRAIN to map every residue scar.";
      }else{
        const maps=possibilityTerrain.terrain?.maps||[];
        terrainStatus.textContent=maps.length
          ?`Terrain ${String(possibilityTerrain.terrain.terrainHash||"").slice(0,12)} · ${maps.length} scar map${maps.length===1?"":"s"} · observation only`
          :"Terrain contains no residue scars. Nothing is ranked or invented.";
      }

      const maps=possibilityTerrain?.terrain?.maps||[];
      if(!maps.length){
        const option=document.createElement("option");
        option.value="";
        option.textContent="No terrain";
        terrainSelect.append(option);
        terrainSelect.disabled=true;
        terrainCanvas.replaceChildren();
        terrainPoint.textContent="No point inspected";
        terrainProposal.textContent="No crossing proposed";
        terrainBinding.textContent="No crossing accepted";
        terrainAccept.disabled=true;
        terrainAccept.textContent="ACCEPT CROSSING";
        renderExecutionCustody();
        return;
      }

      terrainSelect.disabled=false;
      if(!maps.some(entry=>entry.terrainEntryId===activeTerrainEntryId))activeTerrainEntryId=maps[0].terrainEntryId;
      for(const entry of maps){
        const option=document.createElement("option");
        option.value=entry.terrainEntryId;
        option.textContent=`WAKE · ${entry.targetResidueId}`;
        option.selected=entry.terrainEntryId===activeTerrainEntryId;
        terrainSelect.append(option);
      }

      const entry=activeTerrainEntry();
      const projection=terrainProjectionFor(entry);
      terrainCanvas.innerHTML=projection?.svg||"";
      const proposedFrame=possibilityProposal?.sourceMapHash===entry?.map?.mapHash?possibilityProposal.frame:null;
      const acceptedFrame=possibilityBinding?.binding?.sourceMapHash===entry?.map?.mapHash?possibilityBinding.binding.frame:null;
      for(const node of terrainCanvas.querySelectorAll(".possibility-point")){
        const frame=Number(node.dataset.frame);
        const point=(entry?.map?.points||[]).find(item=>item.frame===frame);
        if(frame===proposedFrame)node.classList.add("is-proposed");
        if(frame===acceptedFrame)node.classList.add("is-accepted");
        node.addEventListener("pointerenter",()=>inspectTerrainFrame(frame,point));
        node.addEventListener("focus",()=>inspectTerrainFrame(frame,point));
        node.addEventListener("click",()=>{inspectTerrainFrame(frame,point);proposeTerrainPoint(frame);});
      }

      if(possibilityProposal?.sourceMapHash===entry?.map?.mapHash){
        terrainProposal.textContent=`PROPOSAL · frame ${possibilityProposal.frame} · energy ${possibilityProposal.energy} · ${String(possibilityProposal.proposalHash||"").slice(0,16)}`;
        terrainProposal.title=possibilityProposal.proposalHash||"";
      }else{
        terrainProposal.textContent="No crossing proposed";
        terrainProposal.title="";
      }

      if(possibilityBinding?.binding){
        terrainBinding.textContent=`ACCEPTED · frame ${possibilityBinding.binding.frame} · ${String(possibilityBinding.binding.bindingHash||"").slice(0,16)} · ${filename(possibilityBinding.path)}`;
        terrainBinding.title=possibilityBinding.binding.bindingHash||"";
      }else{
        terrainBinding.textContent="No crossing accepted";
        terrainBinding.title="";
      }
      terrainAccept.disabled=!possibilityProposal||possibilityProposal.sourceMapHash!==entry?.map?.mapHash||Boolean(possibilityBinding?.binding);
      terrainAccept.textContent=possibilityBinding?.binding?"BOUND · SCOPE REQUIRED":"ACCEPT CROSSING";
      renderExecutionCustody();
    }

    const mutationInspector=view?.MutationMap?.createMutationInspector({document,bridge});

    function renderGenerationalEcology(){
      mutationInspector?.update({ecology:generationalEcology?.ecology||null,receipt:onePassSession?.receipt||null});
      if(!buildGenealogy||!genealogyReadout)return;
      const finished=onePassSession?.status==="finished";
      buildGenealogy.disabled=!finished||typeof bridge.deriveGenerationalEcology!=="function";
      buildGenealogy.textContent=generationalEcology?.ecology?"FAMILY TREE BUILT":"BUILD FAMILY TREE";
      if(generationalEcologyError){
        genealogyReadout.textContent=`GENEALOGY ERROR · ${generationalEcologyError}`;
        genealogyReadout.title=generationalEcologyError;
        return;
      }
      const ecology=generationalEcology?.ecology;
      if(!ecology){
        genealogyReadout.textContent=finished
          ?"Sealed take ready · genealogy reads only performed history."
          :"No generational ecology compiled";
        genealogyReadout.title="";
        return;
      }
      const current=ecology.performances?.find(item=>item.performanceHash===onePassSession?.receipt?.performanceHash)||ecology.performances?.[0];
      const fossils=ecology.lawFossils?.length||0;
      const adoptions=ecology.adoptionEvidence?.length||0;
      const unresolved=(ecology.adoptionEvidence||[]).filter(item=>item.matchBasis!=="exact-media-sha256").length;
      genealogyReadout.textContent=
        `GEN ${current?.generation||"?"} · ${current?.directParentCount||0} performed parent${current?.directParentCount===1?"":"s"} · ${ecology.historyNodeCount||0} history nodes · ${fossils} law fossil${fossils===1?"":"s"} · ${adoptions} adoption evidence${unresolved?` (${unresolved} unresolved)`:""} · ${filename(generationalEcology.path)}`;
      genealogyReadout.title=ecology.ecologyHash||"";
    }

    async function buildCurrentGenerationalEcology(){
      if(onePassSession?.status!=="finished"||typeof bridge.deriveGenerationalEcology!=="function")return;
      generationalEcologyError=null;
      try{
        generationalEcology=await bridge.deriveGenerationalEcology(
          [onePassSession.receipt],
          (state.promotedMaterials||[]).map(entry=>entry.admissionPath),
        );
      }catch(error){
        generationalEcology=null;
        generationalEcologyError=error?.message||String(error);
      }
      renderGenerationalEcology();
    }

    function renderOnePass(){
      renderGenerationalEcology();
      if(!onePassBegin||!onePassStatus||!onePassProgress||!onePassLanes||!onePassReceipt)return;
      const descendants=state.nextGen?.videoDigestion?.descendants||[];
      const running=onePassSession?.status==="running";
      const finished=onePassSession?.status==="finished";
      const hasAudio=Boolean(performanceAudio?.src);
      const ready=Boolean(onePassApi)&&hasAudio&&descendants.length===6&&!onePassConsumed&&!running;
      onePassBegin.disabled=!ready;
      onePassBegin.textContent=running?"TAKE IN MOTION":(finished?"TAKE SEALED":"BEGIN THE TAKE");
      if(onePassCompile){
        onePassCompile.disabled=!finished||typeof bridge.writePerformanceProgramBundle!=="function";
        onePassCompile.textContent=onePassProgramBundle?"PROGRAM COMPILED":"COMPILE TAKE";
      }
      if(onePassProgram){
        if(onePassProgramError){
          onePassProgram.textContent=`PROGRAM ERROR · ${onePassProgramError}`;
          onePassProgram.title=onePassProgramError;
        }else if(onePassProgramBundle){
          onePassProgram.textContent=`PROGRAM · ${String(onePassProgramBundle.programHash||"").slice(0,16)} · ${filename(onePassProgramBundle.programPath)}`;
          onePassProgram.title=onePassProgramBundle.programHash||"";
        }else{
          onePassProgram.textContent="No program compiled";
          onePassProgram.title="";
        }
      }
      if(!running){
        onePassProgress.style.width=finished?"100%":"0%";
      }
      if(finished){
        const receipt=onePassSession.receipt;
        onePassStatus.textContent=onePassPersistenceError
          ?`Take sealed in memory · receipt save failed · ${onePassPersistenceError}`
          :onePassEcologyError
            ?`Take sealed · residue preview unavailable · ${onePassEcologyError}`
            :`Take sealed · ${receipt.eventCount} gestures · ${receipt.spatialSampleCount||0} spatial samples · ${receipt.placementCount} lawful clips · ${onePassEcology?.residueMemory?.residues?.length||0} residue memories · RECOMPOSE to review it`;
        const memoryCount=onePassEcology?.residueMemory?.residues?.length||0;
        onePassReceipt.textContent=onePassReceiptPath
          ?`PERFORMANCE · ${receipt.performanceHash} · ${memoryCount} residue${memoryCount===1?"":"s"} · ${filename(onePassReceiptPath)}`
          :`PERFORMANCE · ${receipt.performanceHash} · ${memoryCount} residue${memoryCount===1?"":"s"}`;
        onePassReceipt.title=receipt.performanceHash;
        root.dataset.onePassPerformanceHash=receipt.performanceHash;
      }else if(running){
        onePassReceipt.textContent="Performance is happening. It cannot be repaired from here.";
      }else if(!onePassApi){
        onePassStatus.textContent="ONE PASS simulation module unavailable in this build.";
        onePassReceipt.textContent="No take sealed";
      }else if(!hasAudio){
        onePassStatus.textContent="Load a song first. ONE PASS follows the admitted audio clock.";
        onePassReceipt.textContent="No take sealed";
      }else if(descendants.length!==6){
        onePassStatus.textContent="Load six Video Digestion descendants to arm the take.";
        onePassReceipt.textContent="No take sealed";
      }else if(onePassConsumed){
        onePassStatus.textContent="This crossing already spent its ONE PASS. Reload live organs to begin a genuinely new take.";
      }else{
        onePassStatus.textContent="Armed · one 48-second pass · raw timing · no snap · no undo.";
        onePassReceipt.textContent="No take sealed";
      }

      onePassLanes.replaceChildren(...descendants.slice(0,6).map((descendant,index)=>{
        const lane=document.createElement("button");
        lane.type="button";
        lane.className="franken-one-pass-lane";
        lane.dataset.lane=String(index);
        lane.disabled=!running;
        const active=Boolean(onePassSession?.activeLanes?.[index]);
        const used=Boolean(onePassSession?.events?.some((event)=>event.lane===index));
        lane.classList.toggle("is-active",active);
        lane.classList.toggle("is-used",used);
        const key=document.createElement("b");
        key.textContent=ONE_PASS_KEYS[index].toUpperCase();
        const label=document.createElement("small");
        label.textContent=`#${descendant.slot} · ${descendant.roleId}`;
        lane.append(key,label);
        lane.addEventListener("pointerdown",(event)=>{
          if(onePassSession?.status!=="running")return;
          event.preventDefault();
          pressOnePassLane(index);
          const release=()=>{
            document.removeEventListener("pointerup",release);
            document.removeEventListener("pointercancel",release);
            releaseOnePassLane(index);
          };
          document.addEventListener("pointerup",release,{once:true});
          document.addEventListener("pointercancel",release,{once:true});
        });
        return lane;
      }));
    }

    function setOnePassPlayhead(frame){
      playheadFrame=Math.max(0,Math.min(TOTAL_FRAMES-1,Math.round(Number(frame)||0)));
      if(playhead)playhead.value=String(playheadFrame);
      if(playheadReadout)playheadReadout.textContent=`Frame ${playheadFrame} · ONE PASS`;
      const line=timelineRoot?.querySelector(".franken-timeline-playhead-line");
      if(line)line.style.left=`${(playheadFrame/TOTAL_FRAMES)*100}%`;
    }

    function pointerPointForCurrentScene(event){
      if(!previewRoot||!event)return null;
      const performanceFrame=onePassApi&&onePassSession?.status==="running"
        ?onePassApi.frameAtMs(onePassSession,(performanceAudio?.currentTime||0)*1000)
        :playheadFrame;
      const sceneId=sceneAtGlobalFrame(performanceFrame).sceneId;
      const card=previewRoot.querySelector(`.franken-preview-scene[data-scene-id="${sceneId}"]`);
      const viewport=card?.querySelector(".franken-preview-viewport");
      if(!viewport)return null;
      const rect=viewport.getBoundingClientRect();
      if(!rect.width||!rect.height)return null;
      if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)return null;
      return {
        x:clamp((event.clientX-rect.left)/rect.width,0,1),
        y:clamp((event.clientY-rect.top)/rect.height,0,1),
      };
    }

    function sampleOnePassLane(index,event){
      if(!onePassApi||typeof onePassApi.sampleLanePosition!=="function"||onePassSession?.status!=="running")return;
      const point=pointerPointForCurrentScene(event);
      if(!point)return;
      onePassSession=onePassApi.sampleLanePosition(
        onePassSession,
        index,
        (performanceAudio?.currentTime||0)*1000,
        point,
      );
      const active=onePassSession?.activeLanes?.[index];
      if(active){
        root.dataset.onePassPainting="true";
        root.dataset.onePassPaintingLane=String(index);
      }
    }

    function pressOnePassLane(index){
      if(!onePassApi||onePassSession?.status!=="running")return;
      onePassSession=onePassApi.pressLane(onePassSession,index,(performanceAudio?.currentTime||0)*1000);
      renderOnePass();
    }

    function releaseOnePassLane(index){
      if(!onePassApi||onePassSession?.status!=="running")return;
      onePassSession=onePassApi.releaseLane(onePassSession,index,(performanceAudio?.currentTime||0)*1000);
      if(!Object.keys(onePassSession.activeLanes||{}).length){
        delete root.dataset.onePassPainting;
        delete root.dataset.onePassPaintingLane;
      }
      renderOnePass();
    }

    async function finishOnePassTake(now=(performanceAudio?.currentTime||0)*1000){
      if(!onePassApi||onePassSession?.status!=="running")return;
      if(onePassAnimation)view.cancelAnimationFrame(onePassAnimation);
      onePassAnimation=null;
      performanceAudio?.pause();
      onePassSession=onePassApi.finishOnePass(onePassSession,now);
      onePassConsumed=true;
      root.classList.remove("one-pass-running");
      delete root.dataset.onePassPainting;
      delete root.dataset.onePassPaintingLane;
      state=reduceBenchState(state,{type:"digest-replace",value:onePassSession.receipt.placements});
      onePassReceiptPath=null;
      onePassPersistenceError=null;
      onePassEcology=null;
      onePassEcologyError=null;
      onePassProgramBundle=null;
      onePassProgramError=null;
      generationalEcology=null;
      generationalEcologyError=null;
      if(typeof bridge.derivePerformanceEcology==="function"){
        try{
          onePassEcology=await bridge.derivePerformanceEcology(onePassSession.receipt);
        }catch(error){
          onePassEcologyError=error?.message||String(error);
        }
      }
      if(typeof bridge.writeOnePassReceipt==="function"){
        try{
          const saved=await bridge.writeOnePassReceipt(onePassSession.receipt);
          onePassReceiptPath=saved?.path||null;
        }catch(error){
          onePassPersistenceError=error?.message||String(error);
        }
      }else{
        onePassPersistenceError="receipt persistence bridge unavailable";
      }
      render();
    }

    async function compileOnePassTake(){
      if(onePassSession?.status!=="finished")return;
      if(typeof bridge.writePerformanceProgramBundle!=="function"){
        onePassProgramError="PerformanceProgram bridge unavailable";
        renderOnePass();
        return;
      }
      onePassProgramBundle=null;
      onePassProgramError=null;
      if(onePassCompile){
        onePassCompile.disabled=true;
        onePassCompile.textContent="COMPILING…";
      }
      try{
        onePassProgramBundle=await bridge.writePerformanceProgramBundle(onePassSession.receipt);
        root.dataset.performanceProgramHash=onePassProgramBundle?.programHash||"";
      }catch(error){
        onePassProgramError=error?.message||String(error);
        delete root.dataset.performanceProgramHash;
      }
      renderOnePass();
    }

    function tickOnePass(){
      if(!onePassApi||onePassSession?.status!=="running")return;
      const now=(performanceAudio?.currentTime||0)*1000;
      const frame=onePassApi.frameAtMs(onePassSession,now);
      setOnePassPlayhead(frame);
      if(onePassProgress)onePassProgress.style.width=`${Math.min(100,((frame+1)/onePassSession.totalFrames)*100)}%`;
      if(onePassStatus)onePassStatus.textContent=`TAKE IN MOTION · frame ${frame} / ${onePassSession.totalFrames-1} · silence is still a move`;
      const elapsed=now-onePassSession.startedAtMs;
      if(performanceAudio?.ended||elapsed>=(onePassSession.totalFrames/onePassSession.fps)*1000){
        finishOnePassTake(now).catch((error)=>{
          onePassPersistenceError=error?.message||String(error);
          renderOnePass();
        });
        return;
      }
      onePassAnimation=view.requestAnimationFrame(tickOnePass);
    }

    async function beginOnePassTake(){
      if(!onePassApi||!performanceAudio?.src||onePassConsumed||onePassSession?.status==="running")return;
      const descendants=state.nextGen?.videoDigestion?.descendants||[];
      if(descendants.length!==6)return;
      const audioFrames=Number.isFinite(performanceAudio.duration)&&performanceAudio.duration>0
        ?Math.max(1,Math.round(performanceAudio.duration*24))
        :TOTAL_FRAMES;
      const takeFrames=Math.min(TOTAL_FRAMES,audioFrames);
      state=reduceBenchState(state,{type:"digest-replace",value:[]});
      playheadFrame=0;
      performanceAudio.pause();
      performanceAudio.currentTime=0;
      try{
        await performanceAudio.play();
      }catch(error){
        onePassStatus.textContent=`Could not begin take · ${error?.message||error}`;
        return;
      }
      onePassEcology=null;
      onePassEcologyError=null;
      onePassProgramBundle=null;
      onePassProgramError=null;
      resetPossibilityTerrain();
      delete root.dataset.performanceProgramHash;
      onePassSession=onePassApi.beginOnePass(onePassApi.createOnePassSession({
        materials:descendants,
        fps:24,
        totalFrames:takeFrames,
      }),0);
      root.classList.add("one-pass-running");
      render();
      onePassAnimation=view.requestAnimationFrame(tickOnePass);
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
      renderOnePass();
      renderTerrain();
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
        onePassSession=null;
        onePassConsumed=false;
        onePassReceiptPath=null;
        onePassPersistenceError=null;
        onePassEcology=null;
        onePassEcologyError=null;
        onePassProgramBundle=null;
        onePassProgramError=null;
        generationalEcology=null;
        generationalEcologyError=null;
        resetPossibilityTerrain();
        delete root.dataset.performanceProgramHash;
        root.classList.remove("one-pass-running");
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
    onePassBegin?.addEventListener("click",()=>{beginOnePassTake().catch((error)=>{onePassStatus.textContent=error?.message||String(error);});});
    onePassCompile?.addEventListener("click",()=>{compileOnePassTake().catch((error)=>{onePassProgramError=error?.message||String(error);renderOnePass();renderTerrain();});});
    buildGenealogy?.addEventListener("click",()=>{buildCurrentGenerationalEcology().catch((error)=>{generationalEcologyError=error?.message||String(error);renderGenerationalEcology();});});
    terrainBuild?.addEventListener("click",()=>{buildPossibilityTerrain().catch((error)=>{possibilityTerrainError=error?.message||String(error);renderTerrain();});});
    terrainSelect?.addEventListener("change",()=>{
      activeTerrainEntryId=terrainSelect.value||null;
      possibilityProposal=null;
      possibilityBinding=null;
      resetExecutionCustody();
      delete root.dataset.possibilityProposalHash;
      delete root.dataset.possibilityBindingHash;
      renderTerrain();
    });
    terrainAccept?.addEventListener("click",()=>{acceptTerrainProposal().catch((error)=>{possibilityTerrainError=error?.message||String(error);renderTerrain();});});
    prepareScope?.addEventListener("click",()=>{prepareAcceptedCrossingScope().catch((error)=>{executionCustodyError=error?.message||String(error);renderExecutionCustody();});});
    approveScope?.addEventListener("click",()=>{approveAcceptedCrossingScope().catch((error)=>{executionCustodyError=error?.message||String(error);renderExecutionCustody();});});
    executeScope?.addEventListener("click",()=>{executeAcceptedCrossingScope().catch((error)=>{executionCustodyError=error?.message||String(error);renderExecutionCustody();});});
    buildReview?.addEventListener("click",()=>{buildCandidateReview().catch((error)=>{artifactReviewError=error?.message||String(error);renderArtifactReview();});});
    adoptReview?.addEventListener("click",()=>{decideArtifactReview("ADOPT").catch((error)=>{artifactReviewError=error?.message||String(error);renderArtifactReview();});});
    rejectReview?.addEventListener("click",()=>{decideArtifactReview("REJECT").catch((error)=>{artifactReviewError=error?.message||String(error);renderArtifactReview();});});
    proposeArtifactImport?.addEventListener("click",()=>{proposeCurrentArtifactImport().catch((error)=>{artifactPromotionError=error?.message||String(error);renderArtifactPromotion();});});
    admitArtifactMaterial?.addEventListener("click",()=>{admitCurrentArtifactMaterial().catch((error)=>{artifactPromotionError=error?.message||String(error);renderArtifactPromotion();});});
    performanceAudio?.addEventListener("ended",()=>{
      finishOnePassTake((performanceAudio.currentTime||0)*1000).catch((error)=>{
        onePassPersistenceError=error?.message||String(error);
        renderOnePass();
      });
    });
    view?.addEventListener("keydown",(event)=>{
      if(onePassSession?.status!=="running")return;
      const lane=ONE_PASS_KEYS.indexOf(String(event.key||"").toLowerCase());
      if(lane<0)return;
      event.preventDefault();
      if(event.repeat)return;
      pressOnePassLane(lane);
    });
    view?.addEventListener("keyup",(event)=>{
      if(onePassSession?.status!=="running")return;
      const lane=ONE_PASS_KEYS.indexOf(String(event.key||"").toLowerCase());
      if(lane<0)return;
      event.preventDefault();
      releaseOnePassLane(lane);
    });
    view?.addEventListener("pointermove",(event)=>{
      if(onePassSession?.status!=="running")return;
      const lanes=Object.keys(onePassSession.activeLanes||{}).map(Number).sort((a,b)=>a-b);
      if(!lanes.length)return;
      for(const lane of lanes)sampleOnePassLane(lane,event);
    });
    view?.addEventListener("pointerup",()=>{
      delete root.dataset.onePassPainting;
      delete root.dataset.onePassPaintingLane;
    });
    view?.addEventListener("pointercancel",()=>{
      delete root.dataset.onePassPainting;
      delete root.dataset.onePassPaintingLane;
    });
    playhead?.addEventListener("input",()=>setPlayhead(Number(playhead.value)||0));
    snapToggle?.addEventListener("change",()=>{snapEnabled=Boolean(snapToggle.checked);renderTimeline();});
    timelineZoomControl?.addEventListener("change",()=>{
      timelineZoom=[1,2,4].includes(Number(timelineZoomControl.value))?Number(timelineZoomControl.value):1;
      renderTimeline();
      if(timelineScroll){
        const target=(playheadFrame/(TOTAL_FRAMES-1))*Math.max(0,timelineRoot.scrollWidth-timelineScroll.clientWidth);
        timelineScroll.scrollLeft=Math.max(0,target);
      }
    });
    transportPlay?.addEventListener("click",async()=>{
      if(!transportAudio||!transportMeta)return;
      try{
        await ensureTransportReady();
        transportAudio.currentTime=transportSecondsForFrame(playheadFrame);
        await transportAudio.play();
        runTransportLoop();
      }catch(error){
        transportStatus.textContent=error?.message||String(error);
      }
    });
    transportPause?.addEventListener("click",()=>{
      transportAudio?.pause();
      stopTransportLoop();
      updateTransportStatus();
    });
    transportAudio?.addEventListener("ended",()=>{playheadFrame=TOTAL_FRAMES-1;stopTransportLoop();updateTimelinePlayhead();updatePreviewFrame();});
    view?.addEventListener("full-measure:audio-ready",(event)=>{
      transportAudio?.pause();
      stopTransportLoop();
      transportMeta=event.detail?.url&&Number(event.detail?.duration)>0
        ?{url:event.detail.url,duration:Number(event.detail.duration),filename:event.detail.filename||"song"}
        :null;
      if(transportAudio){
        if(transportMeta)transportAudio.src=transportMeta.url;
        else transportAudio.removeAttribute("src");
      }
      if(transportPlay)transportPlay.disabled=!transportMeta;
      if(transportPause)transportPause.disabled=!transportMeta;
      updateTransportStatus();
    });

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
    residuePathPoints,
    residueStrengthAtFrame,
    movePlacementOnTimeline,
    resizePlacementOnTimeline,
    sceneAtGlobalFrame,
    snapFrame,
    transportFrameForSeconds,
    previewMediaTime,
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
