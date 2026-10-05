const test=require('node:test');
const assert=require('node:assert/strict');
const ui=require('../src/renderer/franken-composer-ui.js');
const proposal={cardOrder:['card-01','card-02','card-03','card-04','card-05','card-06'],sceneRoles:{'card-01':'ARRIVE','card-02':'ARRIVE','card-03':'CROSS','card-04':'CROSS','card-05':'ASSEMBLE','card-06':'ASSEMBLE'},worldRule:'manga-room',movingTakeSceneId:'CROSS',transitionChoices:{arriveCross:'panel-wipe',crossAssemble:'radial-reveal'},text:'THE ROOM REMEMBERS',variation:0,scenes:[{sceneId:'ARRIVE',tracks:[{role:'card'},{role:'typography'}]},{sceneId:'CROSS',tracks:[{role:'card'},{role:'moving-take'},{role:'typography'},{role:'topology-material'}]},{sceneId:'ASSEMBLE',tracks:[{role:'card'},{role:'typography'},{role:'topology-material'}]}]};
test('bench model exposes ARRIVE CROSS ASSEMBLE and six addressable cards',()=>{const lanes=ui.laneModel(proposal);assert.deepEqual(lanes.map(x=>x.sceneId),['ARRIVE','CROSS','ASSEMBLE']);assert.deepEqual(lanes.flatMap(x=>x.cards),proposal.cardOrder);assert.ok(lanes[1].roles.includes('moving-take'));});
test('reorder role transition text and variation edits dirty proposal without freezing',()=>{let s=ui.createBenchState();s=ui.reduceBenchState(s,{type:'proposal',result:{proposalIdentity:'a'.repeat(64),proposal}});assert.equal(ui.canFreeze(s),true);s=ui.reduceBenchState(s,{type:'card-order',value:ui.moveCard(s.edits.cardOrder,'card-03',-1)});s=ui.reduceBenchState(s,{type:'scene-role',cardId:'card-01',sceneId:'CROSS'});s=ui.reduceBenchState(s,{type:'transition',key:'arriveCross',value:'hinge'});s=ui.reduceBenchState(s,{type:'edit',key:'text',value:'CHANGED'});s=ui.reduceBenchState(s,{type:'edit',key:'variation',value:4});assert.equal(s.dirty,true);assert.equal(s.frozen,null);assert.equal(ui.canFreeze(s),false);});
test('freeze action is the only state transition that creates accepted plan identity',()=>{let s=ui.createBenchState();for(const action of [{type:'seed',value:'x'},{type:'edit',key:'text',value:'x'},{type:'path',key:'deckPath',value:'/x.json'}]){s=ui.reduceBenchState(s,action);assert.equal(s.frozen,null);}s=ui.reduceBenchState(s,{type:'proposal',result:{proposalIdentity:'a'.repeat(64),proposal}});assert.equal(s.frozen,null);s=ui.reduceBenchState(s,{type:'frozen',planHash:'b'.repeat(64)});assert.equal(s.frozen.planHash,'b'.repeat(64));});
test('compose config preserves bounded editor controls',()=>{let s=ui.createBenchState();for(const [key,value] of Object.entries({deckPath:'/deck.json',worldRulePath:'/world.json',blenderAcceptancePath:'/accept.json',blenderReceiptPath:'/receipt.json',blenderVideoPath:'/take.mp4'}))s=ui.reduceBenchState(s,{type:'path',key,value});s=ui.reduceBenchState(s,{type:'proposal',result:{proposalIdentity:'a'.repeat(64),proposal}});const c=ui.composeConfig(s);assert.equal(c.edits.worldRule,undefined);assert.equal(c.edits.movingTakeSceneId,'CROSS');assert.deepEqual(c.edits.transitions,{arriveCross:'panel-wipe',crossAssemble:'radial-reveal'});assert.equal(ui.canCompose(s),true);});


test('compose config carries an optional local Playdeck asset map',()=>{
  let s=ui.createBenchState();
  for(const [key,value] of Object.entries({deckPath:'/deck.json',worldRulePath:'/world.json',playdeckAssetMapPath:'/assets.local.json',blenderAcceptancePath:'/accept.json',blenderReceiptPath:'/receipt.json',blenderVideoPath:'/take.mp4'}))s=ui.reduceBenchState(s,{type:'path',key,value});
  const config=ui.composeConfig(s);
  assert.equal(config.playdeckAssetMapPath,'/assets.local.json');
  assert.equal(ui.canCompose(s),true);
});


test('bench leaves world rule unset until the human explicitly overrides the donor rule',()=>{
  let s=ui.createBenchState();
  assert.equal(s.edits.worldRule,null);
  const before=ui.composeConfig(s);
  assert.equal(before.edits.worldRule,undefined);
  s=ui.reduceBenchState(s,{type:'proposal',result:{proposalIdentity:'a'.repeat(64),proposal:{...proposal,worldRule:'flipbook'}}});
  assert.equal(s.edits.worldRule,null);
  assert.equal(ui.composeConfig(s).edits.worldRule,undefined);
  s=ui.reduceBenchState(s,{type:'edit',key:'worldRule',value:'manga-room'});
  assert.equal(ui.composeConfig(s).edits.worldRule,'manga-room');
});


test('live organ pressure changes visible defaults but never freezes by itself',()=>{
  let s=ui.createBenchState();
  const crossing={
    crossingIdentity:'c'.repeat(64),
    frankenPressure:{
      authority:'influence-only',
      edits:{
        movingTakeSceneId:'ASSEMBLE',
        transitions:{arriveCross:'radial-reveal',crossAssemble:'panel-wipe'},
        variation:7,
      },
    },
    videoDigestion:{descendants:Array.from({length:6},(_,i)=>({slot:i+1,roleId:`role-${i+1}`,materialId:`video-digest:role-${i+1}:${String(i+1).repeat(12)}`,planHash:String(i+1).repeat(64),sourceDurationFrames:96}))},
  };
  s=ui.reduceBenchState(s,{type:'nextgen',value:crossing});
  assert.equal(s.edits.movingTakeSceneId,'ASSEMBLE');
  assert.deepEqual(s.edits.transitions,{arriveCross:'radial-reveal',crossAssemble:'panel-wipe'});
  assert.equal(s.edits.variation,7);
  assert.equal(s.frozen,null);
  assert.equal(ui.canFreeze(s),false);
  const config=ui.composeConfig(s);
  assert.equal(config.nextGen.enabled,true);
  assert.equal(config.nextGen.expectedCrossingIdentity,crossing.crossingIdentity);

  s=ui.reduceBenchState(s,{type:'edit',key:'movingTakeSceneId',value:'ARRIVE'});
  assert.equal(ui.composeConfig(s).edits.movingTakeSceneId,'ARRIVE');
});

test('changing seed revokes loaded organ crossing identity',()=>{
  let s=ui.createBenchState();
  s=ui.reduceBenchState(s,{type:'nextgen',value:{
    crossingIdentity:'c'.repeat(64),
    frankenPressure:{edits:{movingTakeSceneId:'ASSEMBLE',transitions:{},variation:2}},
  }});
  assert.ok(s.nextGen);
  s=ui.reduceBenchState(s,{type:'seed',value:'different-seed'});
  assert.equal(s.nextGen,null);
  assert.equal(ui.composeConfig(s).nextGen,null);
});


test('human digestion placement is explicit, repeatable, editable, removable, and always dirties freeze',()=>{
  let s=ui.createBenchState();
  const descendant={slot:1,roleId:'texture-loop',materialId:'video-digest:texture-loop:'+ '1'.repeat(12),sourceDurationFrames:48};
  const crossing={crossingIdentity:'c'.repeat(64),frankenPressure:{edits:{movingTakeSceneId:'CROSS',transitions:{},variation:0}},videoDigestion:{descendants:[descendant]}};
  s=ui.reduceBenchState(s,{type:'nextgen',value:crossing});
  const first=ui.defaultDigestPlacement(descendant,'CROSS',1);
  const second=ui.defaultDigestPlacement(descendant,'ARRIVE',2);
  s=ui.reduceBenchState(s,{type:'digest-place',placement:first});
  s=ui.reduceBenchState(s,{type:'digest-place',placement:second});
  assert.equal(ui.placementsFor(s,descendant.materialId).length,2);
  assert.equal(ui.placementFor(s,first.placementId).sceneId,'CROSS');
  assert.equal(s.dirty,true);
  assert.equal(ui.canFreeze(s),false);
  assert.equal(ui.composeConfig(s).edits.digestPlacements.length,2);
  s=ui.reduceBenchState(s,{type:'digest-edit',placementId:first.placementId,patch:{sceneId:'ASSEMBLE',sourceStartFrames:6,opacity:0.4,stackOrder:77,transform:{scale:1.4},crop:{x:0.1,y:0.2,width:0.7,height:0.6}}});
  const edited=ui.placementFor(s,first.placementId);
  assert.equal(edited.sceneId,'ASSEMBLE');
  assert.equal(edited.sourceStartFrames,6);
  assert.equal(edited.opacity,0.4);
  assert.equal(edited.stackOrder,77);
  assert.equal(edited.transform.scale,1.4);
  assert.deepEqual(edited.crop,{x:0.1,y:0.2,width:0.7,height:0.6});
  s=ui.reduceBenchState(s,{type:'digest-remove',placementId:first.placementId});
  assert.equal(ui.placementFor(s,first.placementId),null);
  assert.equal(ui.placementsFor(s,descendant.materialId).length,1);
});

test('reloading or reseeding live organs clears stale digestion placements',()=>{
  let s=ui.createBenchState();
  const descendant={slot:1,roleId:'texture-loop',materialId:'video-digest:texture-loop:'+ '1'.repeat(12),sourceDurationFrames:48};
  const crossing={crossingIdentity:'c'.repeat(64),frankenPressure:{edits:{movingTakeSceneId:'CROSS',transitions:{},variation:0}},videoDigestion:{descendants:[descendant]}};
  s=ui.reduceBenchState(s,{type:'nextgen',value:crossing});
  s=ui.reduceBenchState(s,{type:'digest-place',placement:ui.defaultDigestPlacement(descendant)});
  assert.equal(s.edits.digestPlacements.length,1);
  s=ui.reduceBenchState(s,{type:'nextgen',value:{...crossing,crossingIdentity:'d'.repeat(64)}});
  assert.equal(s.edits.digestPlacements.length,0);
  s=ui.reduceBenchState(s,{type:'digest-place',placement:ui.defaultDigestPlacement(descendant)});
  s=ui.reduceBenchState(s,{type:'seed',value:'new-seed'});
  assert.equal(s.edits.digestPlacements.length,0);
});
