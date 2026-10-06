"use strict";

const {
  canonicalize,
  deepFreeze,
  hashCanonical,
}=require("../generation/canonical.cjs");

const WORDPARK_SCHEMA="static-collective/wordpark-session/v0";
const WORDPARK_PACKET_SCHEMA="static-collective/wordpark-performance/v0";
const WORDPARK_LYRIC_MAP_SCHEMA="static-collective/wordpark-lyric-map/v0";

const MOOD_LANES=deepFreeze({
  OPEN:{
    laneId:"OPEN",
    geometryKind:"platform",
    authority:"performance-choice",
    entryX:.82,
    entryY:.2,
    restitution:.78,
    friction:.08,
  },
  TENDER:{
    laneId:"TENDER",
    geometryKind:"bowl",
    authority:"performance-choice",
    entryX:.82,
    entryY:.4,
    restitution:.52,
    friction:.18,
  },
  STRANGE:{
    laneId:"STRANGE",
    geometryKind:"ramp",
    authority:"performance-choice",
    entryX:.82,
    entryY:.6,
    restitution:.88,
    friction:.05,
  },
  HARD:{
    laneId:"HARD",
    geometryKind:"wall",
    authority:"performance-choice",
    entryX:.82,
    entryY:.8,
    restitution:.94,
    friction:.03,
  },
});

const clamp=(value,min,max)=>Math.min(max,Math.max(min,Number(value)||0));

function finite(value,label,min=-Infinity,max=Infinity){
  const number=Number(value);
  if(!Number.isFinite(number)||number<min||number>max)throw new TypeError(`${label} must be finite in [${min}, ${max}].`);
  return number;
}

function req(value,label,limit=500){
  const text=String(value??"").trim();
  if(!text)throw new TypeError(`${label} must be non-empty.`);
  if(text.length>limit)throw new TypeError(`${label} exceeds ${limit} characters.`);
  return text;
}

function normalizeBall(ball={}){
  return {
    x:clamp(ball.x??.28,.025,.975),
    y:clamp(ball.y??.4,.025,.975),
    vx:finite(ball.vx??.18,"ball vx",-4,4),
    vy:finite(ball.vy??0,"ball vy",-4,4),
    radius:finite(ball.radius??.025,"ball radius",.005,.08),
  };
}

function lyricWitnesses(field){
  if(!field||field.schema!=="static-collective/listening-field/v0"||field.authority!=="testimony-only"){
    throw new TypeError("WORDPARK requires a testimony-only ListeningFieldV0.");
  }
  return (field.lanes||[]).flatMap(lane=>lane.witnesses||[])
    .filter(witness=>witness.kind==="lyric-cue"&&witness.authority==="testimony-only");
}

function validateForm(form,field){
  if(!form||form.schema!=="static-collective/full-song-form/v0")throw new TypeError("WORDPARK requires FullSongFormV0.");
  if(field?.formRef?.formHash!==form.formHash)throw new TypeError("WORDPARK Listening Field must bind to the exact FullSongForm.");
  return form;
}

function createWordparkSession({fullSongForm,listeningField,ball}={}){
  const form=validateForm(fullSongForm,listeningField);
  lyricWitnesses(listeningField);
  return {
    schema:WORDPARK_SCHEMA,
    status:"running",
    authority:"performance-state",
    fps:form.fps,
    totalFrames:form.totalFrames,
    songRef:canonicalize(listeningField.songRef),
    formRef:canonicalize({
      formHash:form.formHash,
      fps:form.fps,
      totalFrames:form.totalFrames,
    }),
    listeningFieldRef:canonicalize({
      fieldHash:listeningField.fieldHash,
      authority:listeningField.authority,
    }),
    listeningField,
    ball:normalizeBall(ball),
    wordObjects:[],
    constructionTrace:[],
    traversalTrace:[],
    stepSeq:0,
    dropSeq:0,
  };
}

function polylineLength(path){
  let total=0;
  for(let i=1;i<path.length;i++){
    total+=Math.hypot(path[i].x-path[i-1].x,path[i].y-path[i-1].y);
  }
  return total;
}

function pointAtDistance(path,distance){
  const total=polylineLength(path);
  if(total<=0)return {...path[0],rotationDegrees:0};
  let left=clamp(distance,0,total);
  for(let i=1;i<path.length;i++){
    const a=path[i-1],b=path[i];
    const length=Math.hypot(b.x-a.x,b.y-a.y);
    if(left<=length||i===path.length-1){
      const t=length<=0?0:left/length;
      return {
        x:a.x+(b.x-a.x)*t,
        y:a.y+(b.y-a.y)*t,
        rotationDegrees:Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI,
      };
    }
    left-=length;
  }
  return {...path.at(-1),rotationDegrees:0};
}

function glyphsForText(text,path){
  const total=polylineLength(path);
  const count=Math.max(1,text.length);
  return Array.from(text).map((char,index)=>{
    const fraction=count===1?.5:(index/(count-1));
    const point=pointAtDistance(path,total*fraction);
    return canonicalize({
      index,
      char,
      x:point.x,
      y:point.y,
      rotationDegrees:point.rotationDegrees,
    });
  });
}

function pathForMood(text,moodLane,x,y){
  const lane=MOOD_LANES[moodLane];
  if(!lane)throw new TypeError(`Unknown WORDPARK mood lane: ${moodLane}.`);
  const length=clamp(.12+Math.min(48,text.length)*.012,.18,.58);
  const half=length/2;
  const cx=clamp(x,.3,.92);
  const cy=clamp(y,.12,.88);

  if(lane.geometryKind==="platform"){
    return [
      {x:clamp(cx-half,.05,.95),y:cy},
      {x:clamp(cx-half/2,.05,.95),y:cy},
      {x:cx,y:cy},
      {x:clamp(cx+half/2,.05,.95),y:cy},
      {x:clamp(cx+half,.05,.95),y:cy},
    ];
  }
  if(lane.geometryKind==="bowl"){
    return Array.from({length:9},(_,index)=>{
      const t=index/8;
      const dx=(t-.5)*length;
      const bowl=-Math.pow((t-.5)*2,2)+1;
      return {
        x:clamp(cx+dx,.05,.95),
        y:clamp(cy+.12-(bowl*.12),.06,.94),
      };
    });
  }
  if(lane.geometryKind==="ramp"){
    return [
      {x:clamp(cx-half,.05,.95),y:clamp(cy+.11,.06,.94)},
      {x:clamp(cx-half/3,.05,.95),y:clamp(cy+.04,.06,.94)},
      {x:clamp(cx+half/3,.05,.95),y:clamp(cy-.04,.06,.94)},
      {x:clamp(cx+half,.05,.95),y:clamp(cy-.11,.06,.94)},
    ];
  }
  return [
    {x:cx,y:clamp(cy+half*.7,.06,.94)},
    {x:cx,y:clamp(cy+half*.25,.06,.94)},
    {x:cx,y:cy},
    {x:cx,y:clamp(cy-half*.25,.06,.94)},
    {x:cx,y:clamp(cy-half*.7,.06,.94)},
  ];
}

function geometryForLyric(text,moodLane,x,y){
  const path=pathForMood(text,moodLane,x,y).map(point=>canonicalize(point));
  return canonicalize({
    kind:MOOD_LANES[moodLane].geometryKind,
    path,
    collisionSegments:path.slice(0,-1).map((point,index)=>({
      from:point,
      to:path[index+1],
    })),
    glyphs:glyphsForText(text,path),
  });
}

function findLyric(session,witnessId){
  const id=req(witnessId,"witnessId",160);
  const witness=lyricWitnesses(session.listeningField).find(item=>item.witnessId===id);
  if(!witness)throw new TypeError(`WORDPARK lyric witness not found: ${id}.`);
  return witness;
}

function dropLyric(session,{witnessId,moodLane,frame,x=null,y=null}={}){
  if(session?.schema!==WORDPARK_SCHEMA||session.status!=="running")throw new TypeError("WORDPARK session must be running.");
  const lane=MOOD_LANES[moodLane];
  if(!lane)throw new TypeError(`Unknown WORDPARK mood lane: ${moodLane}.`);
  const witness=findLyric(session,witnessId);
  const dropFrame=Math.round(finite(frame,"drop frame",0,session.totalFrames-1));
  const text=req(witness.label,"lyric text",500);
  const dropX=x==null?lane.entryX:x;
  const dropY=y==null?lane.entryY:y;
  const geometry=geometryForLyric(text,moodLane,dropX,dropY);
  const wordObject=canonicalize({
    wordObjectId:`word:${session.dropSeq}:${witness.witnessId}`,
    sourceWitnessId:witness.witnessId,
    sourceAuthority:witness.authority,
    text,
    cueStartFrame:witness.startFrame,
    cueEndFrame:witness.endFrame,
    dropFrame,
    moodLane,
    moodAuthority:lane.authority,
    authority:"human-performance-placement",
    geometry,
  });
  const construction=canonicalize({
    seq:session.constructionTrace.length,
    kind:"lyric-drop",
    frame:dropFrame,
    wordObjectId:wordObject.wordObjectId,
    sourceWitnessId:witness.witnessId,
    sourceAuthority:witness.authority,
    text,
    moodLane,
    moodAuthority:lane.authority,
    geometryKind:lane.geometryKind,
    meaningClaim:null,
  });
  return {
    ...session,
    dropSeq:session.dropSeq+1,
    wordObjects:[...session.wordObjects,wordObject],
    constructionTrace:[...session.constructionTrace,construction],
  };
}

function assistedLaneEntry(moodLane,queueIndex=0){
  const lane=MOOD_LANES[moodLane];
  if(!lane)throw new TypeError(`Unknown WORDPARK mood lane: ${moodLane}.`);
  const slots=[
    {dx:0,dy:0},
    {dx:-.09,dy:-.045},
    {dx:-.18,dy:.045},
    {dx:-.27,dy:-.075},
    {dx:-.36,dy:.075},
    {dx:-.45,dy:0},
  ];
  const index=Math.max(0,Math.floor(Number(queueIndex)||0));
  const slotIndex=index%slots.length;
  const cycle=Math.floor(index/slots.length);
  const slot=slots[slotIndex];
  const cycleShift=(cycle%3)*.018;
  return canonicalize({
    x:clamp(lane.entryX+slot.dx-cycleShift,.3,.92),
    y:clamp(lane.entryY+slot.dy,.1,.9),
    slotIndex,
    cycle,
    authority:"deterministic-staging-only",
  });
}

function dropLyricFromGuide(session,{entry,arrival}={}){
  if(session?.schema!==WORDPARK_SCHEMA||session.status!=="running")throw new TypeError("WORDPARK session must be running.");
  if(!entry||!arrival||entry.lineId!==arrival.lineId)throw new TypeError("WORDPARK guide arrival must match its queue entry.");
  const lane=MOOD_LANES[arrival.moodLane];
  if(!lane)throw new TypeError(`Unknown WORDPARK mood lane: ${arrival.moodLane}.`);
  const dropFrame=Math.round(finite(arrival.actualFrame,"guide drop frame",0,session.totalFrames-1));
  let witness=null;
  if(entry.sourceWitnessId){
    witness=findLyric(session,entry.sourceWitnessId);
    if(witness.witnessId!==entry.sourceWitnessId)throw new TypeError("WORDPARK guide source witness mismatch.");
  }else if(entry.state!=="CATCH"){
    throw new TypeError("Only CATCH lyrics may enter WORDPARK without a timed ListeningField witness.");
  }

  const text=req(witness?.label||entry.text,"guide lyric text",500);
  const entryPlacement=assistedLaneEntry(arrival.moodLane,entry.queueIndex);
  const geometry=geometryForLyric(text,arrival.moodLane,entryPlacement.x,entryPlacement.y);
  const placementAuthority=arrival.timingSource==="human-punch"
    ?"human-punched-performance-placement"
    :arrival.timingSource==="human-anchor-scheduled"
      ?"anchor-scheduled-performance-placement"
      :"machine-scheduled-performance-placement";
  const sourceAuthority=witness?.authority||"listener-unresolved";
  const wordObject=canonicalize({
    wordObjectId:`word:${session.dropSeq}:${entry.lineId}`,
    sourceWitnessId:witness?.witnessId||null,
    sourceLineId:entry.lineId,
    sourceAuthority,
    text,
    cueStartFrame:witness?.startFrame??null,
    cueEndFrame:witness?.endFrame??null,
    scheduledFrame:arrival.scheduledFrame,
    dropFrame,
    timingSource:arrival.timingSource,
    humanAnchorCreated:arrival.humanAnchorCreated===true,
    moodLane:arrival.moodLane,
    moodAuthority:lane.authority,
    entryPlacement,
    authority:placementAuthority,
    geometry,
  });
  const construction=canonicalize({
    seq:session.constructionTrace.length,
    kind:"lyric-drop",
    frame:dropFrame,
    scheduledFrame:arrival.scheduledFrame,
    timingSource:arrival.timingSource,
    humanAnchorCreated:arrival.humanAnchorCreated===true,
    wordObjectId:wordObject.wordObjectId,
    sourceWitnessId:witness?.witnessId||null,
    sourceLineId:entry.lineId,
    sourceAuthority,
    text,
    moodLane:arrival.moodLane,
    moodAuthority:lane.authority,
    entryPlacement,
    geometryKind:lane.geometryKind,
    placementAuthority,
    meaningClaim:null,
  });
  return {
    ...session,
    dropSeq:session.dropSeq+1,
    wordObjects:[...session.wordObjects,wordObject],
    constructionTrace:[...session.constructionTrace,construction],
  };
}

function closestPointOnSegment(point,a,b){
  const abx=b.x-a.x,aby=b.y-a.y;
  const lengthSq=abx*abx+aby*aby;
  const t=lengthSq<=1e-12?0:clamp(((point.x-a.x)*abx+(point.y-a.y)*aby)/lengthSq,0,1);
  return {x:a.x+abx*t,y:a.y+aby*t,t};
}

function resolveTextContacts(ball,wordObjects,frame){
  let current={...ball};
  const contacts=[];
  for(const word of wordObjects){
    if(word.dropFrame>frame)continue;
    const lane=MOOD_LANES[word.moodLane];
    for(let segmentIndex=0;segmentIndex<word.geometry.collisionSegments.length;segmentIndex++){
      const segment=word.geometry.collisionSegments[segmentIndex];
      const closest=closestPointOnSegment(current,segment.from,segment.to);
      let nx=current.x-closest.x,ny=current.y-closest.y;
      let distance=Math.hypot(nx,ny);
      const surfaceRadius=.009;
      const required=current.radius+surfaceRadius;
      if(distance>=required)continue;
      if(distance<=1e-9){
        const dx=segment.to.x-segment.from.x;
        const dy=segment.to.y-segment.from.y;
        const length=Math.hypot(dx,dy)||1;
        nx=-dy/length;
        ny=dx/length;
        distance=0;
      }else{
        nx/=distance;
        ny/=distance;
      }
      const approach=current.vx*nx+current.vy*ny;
      if(approach>=0)continue;
      const push=required-distance+.0005;
      current.x=clamp(current.x+nx*push,current.radius,1-current.radius);
      current.y=clamp(current.y+ny*push,current.radius,1-current.radius);
      current.vx=current.vx-(1+lane.restitution)*approach*nx;
      current.vy=current.vy-(1+lane.restitution)*approach*ny;
      current.vx*=1-lane.friction;
      current.vy*=1-lane.friction;
      contacts.push(canonicalize({
        kind:"text-contact",
        frame,
        wordObjectId:word.wordObjectId,
        sourceWitnessId:word.sourceWitnessId,
        moodLane:word.moodLane,
        geometryKind:word.geometry.kind,
        segmentIndex,
        x:closest.x,
        y:closest.y,
        impactSpeed:Math.abs(approach),
      }));
    }
  }
  return {ball:current,contacts};
}

function stepWordpark(session,{frame,steerX=0,steerY=0,dt=1/24}={}){
  if(session?.schema!==WORDPARK_SCHEMA||session.status!=="running")throw new TypeError("WORDPARK session must be running.");
  const targetFrame=Math.round(finite(frame,"frame",0,session.totalFrames-1));
  const seconds=finite(dt,"dt",1/1000,.25);
  const sx=clamp(steerX,-1,1),sy=clamp(steerY,-1,1);
  let ball={...session.ball};
  const acceleration=1.35;
  const gravity=.62;
  ball.vx+=sx*acceleration*seconds;
  ball.vy+=(gravity+sy*acceleration*.72)*seconds;
  const damping=Math.pow(.992,seconds*60);
  ball.vx*=damping;
  ball.vy*=damping;
  const speed=Math.hypot(ball.vx,ball.vy);
  const maxSpeed=1.65;
  if(speed>maxSpeed){
    ball.vx=(ball.vx/speed)*maxSpeed;
    ball.vy=(ball.vy/speed)*maxSpeed;
  }
  ball.x+=ball.vx*seconds;
  ball.y+=ball.vy*seconds;

  const wallRestitution=.72;
  if(ball.x<ball.radius){ball.x=ball.radius;ball.vx=Math.abs(ball.vx)*wallRestitution;}
  if(ball.x>1-ball.radius){ball.x=1-ball.radius;ball.vx=-Math.abs(ball.vx)*wallRestitution;}
  if(ball.y<ball.radius){ball.y=ball.radius;ball.vy=Math.abs(ball.vy)*wallRestitution;}
  if(ball.y>1-ball.radius){ball.y=1-ball.radius;ball.vy=-Math.abs(ball.vy)*wallRestitution;}

  const resolved=resolveTextContacts(ball,session.wordObjects,targetFrame);
  ball=resolved.ball;
  const sample=canonicalize({
    seq:session.traversalTrace.length,
    kind:"ball-sample",
    frame:targetFrame,
    x:ball.x,
    y:ball.y,
    vx:ball.vx,
    vy:ball.vy,
    steerX:sx,
    steerY:sy,
  });
  const traversal=[...session.traversalTrace,sample,...resolved.contacts.map((contact,index)=>canonicalize({
    ...contact,
    seq:session.traversalTrace.length+1+index,
  }))];
  return {
    ...session,
    ball,
    stepSeq:session.stepSeq+1,
    traversalTrace:traversal,
  };
}

function sealWordparkPacket(session){
  if(session?.schema!==WORDPARK_SCHEMA)throw new TypeError("Expected a WORDPARK session.");
  const body=canonicalize({
    schema:WORDPARK_PACKET_SCHEMA,
    authority:"witness-only",
    songRef:session.songRef,
    formRef:session.formRef,
    listeningFieldRef:session.listeningFieldRef,
    wordObjects:session.wordObjects,
    constructionTrace:session.constructionTrace,
    traversalTrace:session.traversalTrace,
    finalBall:session.ball,
    counts:{
      words:session.wordObjects.length,
      constructionEvents:session.constructionTrace.length,
      traversalEvents:session.traversalTrace.length,
    },
    laws:[
      "TEXT != SUBTITLE",
      "MOOD PLACEMENT != LYRIC MEANING",
      "HEARD LYRIC != HUMAN PLACEMENT",
      "HUMAN PLACEMENT != BALL CONTACT",
      "CONSTRUCTION TRACE != TRAVERSAL TRACE",
      "CONTACT != QUALITY",
      "MISS != ERROR",
      "WORDPARK PACKET != FROZEN PLAN",
    ],
  });
  return deepFreeze(canonicalize({
    ...body,
    performanceHash:hashCanonical(body,"HauntedToaster-WordparkPerformance-v0"),
  }));
}

function compileLyricVideoMap(packet){
  if(!packet||packet.schema!==WORDPARK_PACKET_SCHEMA||packet.authority!=="witness-only")throw new TypeError("Expected a sealed WORDPARK performance packet.");
  const contacts=new Map();
  for(const event of packet.traversalTrace||[]){
    if(event.kind!=="text-contact")continue;
    const list=contacts.get(event.wordObjectId)||[];
    list.push(event);
    contacts.set(event.wordObjectId,list);
  }
  const wordObjects=(packet.wordObjects||[]).map(word=>{
    const events=contacts.get(word.wordObjectId)||[];
    return canonicalize({
      wordObjectId:word.wordObjectId,
      sourceWitnessId:word.sourceWitnessId,
      text:word.text,
      cueStartFrame:word.cueStartFrame,
      cueEndFrame:word.cueEndFrame,
      performedDropFrame:word.dropFrame,
      moodLane:word.moodLane,
      geometry:word.geometry,
      interactionWitness:{
        contactCount:events.length,
        maxImpactSpeed:events.reduce((max,event)=>Math.max(max,Number(event.impactSpeed)||0),0),
      },
    });
  });
  const body=canonicalize({
    schema:WORDPARK_LYRIC_MAP_SCHEMA,
    authority:"proposal-only",
    sourcePerformanceHash:packet.performanceHash,
    songRef:packet.songRef,
    formRef:packet.formRef,
    wordObjects,
    laws:[
      "TEXT GEOMETRY != SUBTITLE LAYER",
      "CONTACT EMPHASIS != LYRIC MEANING",
      "LYRIC MAP != FROZEN PLAN",
      "PROPOSAL != FREEZE",
    ],
  });
  return deepFreeze(canonicalize({
    ...body,
    mapHash:hashCanonical(body,"HauntedToaster-WordparkLyricMap-v0"),
  }));
}

module.exports={
  MOOD_LANES,
  WORDPARK_LYRIC_MAP_SCHEMA,
  WORDPARK_PACKET_SCHEMA,
  WORDPARK_SCHEMA,
  compileLyricVideoMap,
  createWordparkSession,
  dropLyric,
  assistedLaneEntry,
  dropLyricFromGuide,
  geometryForLyric,
  sealWordparkPacket,
  stepWordpark,
};
