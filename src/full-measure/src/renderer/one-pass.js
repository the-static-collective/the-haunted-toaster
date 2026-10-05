(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.OnePass=api;
})(typeof window!=="undefined"?window:globalThis,function(){
  "use strict";

  const SCENES=["ARRIVE","CROSS","ASSEMBLE"];
  const SCENE_FRAMES=384;
  const DEFAULT_TOTAL_FRAMES=1152;
  const DEFAULT_FPS=24;
  const MAX_PLACEMENTS=96;

  const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));

  function stableStringify(value){
    if(value===null||typeof value!=="object")return JSON.stringify(value);
    if(Array.isArray(value))return `[${value.map(stableStringify).join(",")}]`;
    return `{${Object.keys(value).sort().map((key)=>`${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }

  function fingerprint256(text){
    const input=String(text);
    const seeds=[0x811c9dc5,0x9e3779b9,0x85ebca6b,0xc2b2ae35,0x27d4eb2f,0x165667b1,0xd3a2646c,0xfd7046c5];
    return seeds.map((seed,index)=>{
      let hash=seed>>>0;
      for(let i=0;i<input.length;i++){
        hash^=(input.charCodeAt(i)+(index*17)+(i&255))&255;
        hash=Math.imul(hash,0x01000193)>>>0;
        hash^=hash>>>13;
        hash=Math.imul(hash,0x85ebca6b)>>>0;
      }
      hash^=input.length;
      hash=Math.imul(hash^(hash>>>16),0x7feb352d)>>>0;
      hash=Math.imul(hash^(hash>>>15),0x846ca68b)>>>0;
      return (hash^(hash>>>16)).toString(16).padStart(8,"0");
    }).join("");
  }

  function deepFreeze(value){
    if(!value||typeof value!=="object"||Object.isFrozen(value))return value;
    Object.freeze(value);
    for(const child of Object.values(value))deepFreeze(child);
    return value;
  }

  function normalizeMaterials(materials){
    if(!Array.isArray(materials)||materials.length!==6)throw new TypeError("ONE PASS requires exactly six admitted material lanes.");
    const seen=new Set();
    return materials.map((material,index)=>{
      const materialId=String(material?.materialId||"").trim();
      const sourceDurationFrames=Math.max(1,Math.floor(Number(material?.sourceDurationFrames)||0));
      if(!materialId)throw new TypeError(`ONE PASS lane ${index+1} requires a materialId.`);
      if(seen.has(materialId))throw new TypeError("ONE PASS requires six distinct material lanes.");
      seen.add(materialId);
      return {
        lane:index,
        slot:Number(material?.slot)||index+1,
        roleId:String(material?.roleId||`lane-${index+1}`),
        materialId,
        sourceDurationFrames,
      };
    });
  }

  function createOnePassSession({materials,fps=DEFAULT_FPS,totalFrames=DEFAULT_TOTAL_FRAMES}={}){
    const safeFps=Math.floor(Number(fps));
    const safeTotal=Math.floor(Number(totalFrames));
    if(!Number.isSafeInteger(safeFps)||safeFps<1||safeFps>240)throw new TypeError("ONE PASS fps must be an integer in [1, 240].");
    if(!Number.isSafeInteger(safeTotal)||safeTotal<1||safeTotal>1_000_000)throw new TypeError("ONE PASS totalFrames must be a positive integer.");
    return {
      schema:"static-collective/one-pass-session/v0",
      status:"armed",
      fps:safeFps,
      totalFrames:safeTotal,
      materials:normalizeMaterials(materials),
      startedAtMs:null,
      events:[],
      placements:[],
      activeLanes:{},
      receipt:null,
    };
  }

  function assertStatus(session,status){
    if(!session||session.schema!=="static-collective/one-pass-session/v0")throw new TypeError("Expected a ONE PASS session.");
    if(session.status!==status)throw new Error(`ONE PASS session is ${session.status}; expected ${status}.`);
  }

  function beginOnePass(session,nowMs){
    if(session?.status==="finished")throw new Error("ONE PASS has already finished and may run only once.");
    assertStatus(session,"armed");
    const startedAtMs=Number(nowMs);
    if(!Number.isFinite(startedAtMs))throw new TypeError("ONE PASS start time must be finite.");
    return {...session,status:"running",startedAtMs};
  }

  function elapsedMs(session,nowMs){
    assertStatus(session,"running");
    return Math.max(0,Number(nowMs)-session.startedAtMs);
  }

  function frameAtMs(session,nowMs){
    const frame=Math.round((elapsedMs(session,nowMs)/1000)*session.fps);
    return clamp(frame,0,session.totalFrames-1);
  }

  function eventAt(session,lane,phase,nowMs){
    const frame=frameAtMs(session,nowMs);
    return {
      seq:session.events.length,
      phase,
      lane,
      materialId:session.materials[lane].materialId,
      frame,
      elapsedMs:Math.round(elapsedMs(session,nowMs)*1000)/1000,
    };
  }

  function sceneForFrame(frame){
    const safe=Math.max(0,Math.floor(Number(frame)||0));
    const index=Math.min(SCENES.length-1,Math.floor(safe/SCENE_FRAMES));
    return {
      sceneId:SCENES[index],
      sceneStart:index*SCENE_FRAMES,
      sceneEnd:(index+1)*SCENE_FRAMES,
    };
  }

  function placementChunks({material,lane,startFrame,endExclusive,eventSeq,placementBase}){
    const placements=[];
    let cursor=startFrame;
    let segment=0;
    while(cursor<endExclusive&&placements.length<MAX_PLACEMENTS){
      const scene=sceneForFrame(cursor);
      const sceneEnd=Math.min(endExclusive,scene.sceneEnd);
      let segmentCursor=cursor;
      while(segmentCursor<sceneEnd&&placements.length<MAX_PLACEMENTS){
        const duration=Math.max(1,Math.min(sceneEnd-segmentCursor,material.sourceDurationFrames));
        const laneX=[0.18,0.31,0.44,0.56,0.69,0.82][lane];
        const laneY=lane%2===0?0.42:0.58;
        placements.push({
          placementId:`onepass-${placementBase}-${eventSeq}-${segment}`,
          materialId:material.materialId,
          sceneId:scene.sceneId,
          startOffsetFrames:segmentCursor-scene.sceneStart,
          sourceStartFrames:0,
          durationFrames:duration,
          transform:{x:laneX,y:laneY,scale:0.86,rotationDegrees:(lane-2.5)*2},
          crop:null,
          opacity:0.72,
          blend:"screen",
          stackOrder:40+lane,
          transformKeyframes:[],
        });
        segmentCursor+=duration;
        segment+=1;
      }
      cursor=sceneEnd;
    }
    return placements;
  }

  function pressLane(session,lane,nowMs){
    if(session?.status==="finished")throw new Error("ONE PASS is finished; the performance cannot be replayed.");
    assertStatus(session,"running");
    const laneIndex=Math.floor(Number(lane));
    if(laneIndex<0||laneIndex>=session.materials.length)throw new RangeError("ONE PASS lane is out of range.");
    if(session.activeLanes[laneIndex])return session;
    const event=eventAt(session,laneIndex,"down",nowMs);
    return {
      ...session,
      events:[...session.events,event],
      activeLanes:{
        ...session.activeLanes,
        [laneIndex]:{startFrame:event.frame,eventSeq:event.seq},
      },
    };
  }

  function releaseLaneAt(session,lane,nowMs,{finishBoundary=false}={}){
    assertStatus(session,"running");
    const laneIndex=Math.floor(Number(lane));
    if(laneIndex<0||laneIndex>=session.materials.length)throw new RangeError("ONE PASS lane is out of range.");
    const active=session.activeLanes[laneIndex];
    if(!active)return session;
    const event=eventAt(session,laneIndex,"up",nowMs);
    const endExclusive=finishBoundary
      ?session.totalFrames
      :Math.max(active.startFrame+1,event.frame);
    const additions=placementChunks({
      material:session.materials[laneIndex],
      lane:laneIndex,
      startFrame:active.startFrame,
      endExclusive:Math.min(session.totalFrames,endExclusive),
      eventSeq:active.eventSeq,
      placementBase:String(session.materials[laneIndex].slot||laneIndex+1),
    });
    const activeLanes={...session.activeLanes};
    delete activeLanes[laneIndex];
    return {
      ...session,
      events:[...session.events,event],
      placements:[...session.placements,...additions].slice(0,MAX_PLACEMENTS),
      activeLanes,
    };
  }

  function releaseLane(session,lane,nowMs){
    if(session?.status==="finished")throw new Error("ONE PASS is finished; the performance cannot be edited.");
    return releaseLaneAt(session,lane,nowMs);
  }

  function finishOnePass(session,nowMs){
    if(session?.status==="finished")return session;
    assertStatus(session,"running");
    let next=session;
    for(const lane of Object.keys(next.activeLanes).map(Number).sort((a,b)=>a-b)){
      next=releaseLaneAt(next,lane,nowMs,{finishBoundary:true});
    }
    const witness={
      schema:"static-collective/one-pass-performance-receipt/v0",
      authority:"witness-only",
      fps:next.fps,
      totalFrames:next.totalFrames,
      materials:next.materials,
      events:next.events,
      placements:next.placements,
      eventCount:next.events.length,
      placementCount:next.placements.length,
      laws:[
        "PERFORMANCE != OPTIMIZATION",
        "MISS != ERROR",
        "HUMAN TIMING != SNAP TARGET",
        "EVENT RECEIPT != RENDER AUTHORITY",
        "ONE PASS != ONE PERFECT PASS",
        "PERFORMANCE PLACEMENT != FREEZE",
      ],
    };
    const receipt=deepFreeze({
      ...witness,
      performanceHash:fingerprint256(stableStringify(witness)),
    });
    return deepFreeze({
      ...next,
      status:"finished",
      activeLanes:{},
      receipt,
    });
  }

  return {
    DEFAULT_FPS,
    DEFAULT_TOTAL_FRAMES,
    MAX_PLACEMENTS,
    SCENES,
    SCENE_FRAMES,
    beginOnePass,
    createOnePassSession,
    finishOnePass,
    fingerprint256,
    frameAtMs,
    pressLane,
    releaseLane,
    sceneForFrame,
    stableStringify,
  };
});
