const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const fsp=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const {assertLocalFile,createFrankenComposerService}=require('../src/franken-composer/bridge.cjs');
const {makeBlenderFixture}=require('./helpers/franken-blender-fixture.cjs');
const {buildNextGenLiveCrossing}=require('../src/nextgen/live-crossings.cjs');
const fixtureRoot=path.join(__dirname,'fixtures','franken');
async function configInTemp(){
  const dir=await fsp.mkdtemp(path.join(os.tmpdir(),'franken-bridge-'));
  await fsp.cp(fixtureRoot,path.join(dir,'deck'),{recursive:true});
  const blender=makeBlenderFixture();
  return {dir,config:{deckPath:path.join(dir,'deck','playdeck-deck.json'),worldRulePath:path.join(dir,'deck','playdeck-world-rule.json'),blenderAcceptancePath:blender.acceptancePath,blenderReceiptPath:blender.receipt,blenderVideoPath:blender.video,seed:'bridge-seed',edits:{text:'OPEN THE ROOM',variation:3}}};
}
test('franken local-file validator accepts expected JSON and MP4 surfaces only',async()=>{const f=await configInTemp();assert.match(await assertLocalFile(f.config.deckPath,new Set(['.json']),'deck'),/playdeck-deck\.json$/);await assert.rejects(()=>assertLocalFile(f.config.deckPath,new Set(['.mp4']),'video'),/format/i);});
test('compose returns proposal identity but never a frozen plan hash',async()=>{const f=await configInTemp();const service=createFrankenComposerService({rootDir:path.join(f.dir,'out')});const result=await service.compose(f.config);assert.match(result.proposalIdentity,/^[a-f0-9]{64}$/);assert.equal(result.planHash,undefined);assert.equal(result.proposal.authority,'proposal-only');assert.equal(result.proposal._donor,undefined);});
test('freeze revalidates source bytes and returns canonical plan hash',async()=>{const f=await configInTemp();const service=createFrankenComposerService({rootDir:path.join(f.dir,'out')});const preview=await service.compose(f.config);const frozen=await service.freeze({...f.config,expectedProposalIdentity:preview.proposalIdentity});assert.match(frozen.planHash,/^[a-f0-9]{64}$/);assert.equal(frozen.plan.receipts.planHash,frozen.planHash);});
test('freeze refuses stale donor material',async()=>{const f=await configInTemp();const service=createFrankenComposerService({rootDir:path.join(f.dir,'out')});const preview=await service.compose(f.config);fs.appendFileSync(path.join(f.dir,'deck','cards','card-01.svg'),'changed');await assert.rejects(()=>service.freeze({...f.config,expectedProposalIdentity:preview.proposalIdentity}),/digest|stale|proposal/i);});
test('projection bundle refuses an existing immutable output',async()=>{const f=await configInTemp();const service=createFrankenComposerService({rootDir:path.join(f.dir,'out')});const preview=await service.compose(f.config);const config={...f.config,expectedProposalIdentity:preview.proposalIdentity};const first=await service.writeProjectionBundle(config);assert.ok(fs.existsSync(first.planPath));await assert.rejects(()=>service.writeProjectionBundle(config),/already exists|overwrite/i);});


test('compose resolves Playdeck asset URI only through an explicit local asset map',async()=>{
  const base=await configInTemp();
  const logicalDir=path.join(base.dir,'logical');
  await fsp.mkdir(path.join(logicalDir,'cards'),{recursive:true});
  const source='asset://genesis-001/cosmic-flipbook.png';
  const sheet=path.join(logicalDir,'cards','cosmic-sheet.svg');
  await fsp.writeFile(sheet,'<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900"></svg>\n');
  const cards=Array.from({length:9},(_,i)=>({id:`card-${String(i+1).padStart(2,'0')}`,source,front:{source,crop:{x:(i%3)/3,y:Math.floor(i/3)/3,width:1/3,height:1/3}},traits:['witness'],temperament:['quiet']}));
  const deckPath=path.join(logicalDir,'deck.json');
  await fsp.writeFile(deckPath,JSON.stringify({schemaVersion:'0.1',id:'genesis-shape',cards,order:cards.map(card=>card.id)},null,2)+'\n');
  const mapPath=path.join(logicalDir,'assets.local.json');
  await fsp.writeFile(mapPath,JSON.stringify({[source]:'cards/cosmic-sheet.svg'},null,2)+'\n');
  const service=createFrankenComposerService({rootDir:path.join(base.dir,'out-logical')});
  const config={...base.config,deckPath,playdeckAssetMapPath:mapPath};
  const result=await service.compose(config);
  assert.deepEqual(result.proposal.cardOrder,cards.slice(0,6).map(card=>card.id));
  assert.deepEqual(result.proposal.materials.find(m=>m.materialId==='playdeck:card-05')?.kind,'image');
  const remoteMap=path.join(logicalDir,'assets.remote.json');
  await fsp.writeFile(remoteMap,JSON.stringify({[source]:'https://example.com/cosmic.png'},null,2)+'\n');
  await assert.rejects(()=>service.compose({...config,playdeckAssetMapPath:remoteMap}),/local asset|remote|scheme/i);
});


function nextGenProvider(){
  const analysis={
    durationSeconds:3,
    sections:[
      {startSeconds:0,endSeconds:1,energy:0.25,label:'opening'},
      {startSeconds:1,endSeconds:2,energy:0.8,label:'lift'},
      {startSeconds:2,endSeconds:3,energy:0.55,label:'arrival'},
    ],
    phrases:[],
    transients:[],
  };
  const videoBinding={
    schema:'haunted-toaster/video-source/v1',
    specimenId:`sha256:${'a'.repeat(64)}:4096`,
    sourceSha256:'a'.repeat(64),
    byteLength:4096,
    path:'/tmp/nextgen-reservoir.mp4',
    filename:'nextgen-reservoir.mp4',
    probe:{durationSeconds:1,width:64,height:36,frameRate:'8/1'},
  };
  return ({rootSeed,albumContext})=>buildNextGenLiveCrossing({
    analysis,
    rootSeed,
    albumContext,
    videoBinding,
    timeline:{durationTicks:24,timebase:8},
    timelineHash:'b'.repeat(64),
    candidateIndex:0,
  });
}

test('reviewed NextGen crossing enters proposal pressure and frozen material reservoir',async()=>{
  const f=await configInTemp();
  const provider=nextGenProvider();
  const observed=provider({rootSeed:f.config.seed,albumContext:{}});
  const service=createFrankenComposerService({
    rootDir:path.join(f.dir,'out-nextgen'),
    getNextGenContext:provider,
  });
  const config={
    ...f.config,
    nextGen:{
      enabled:true,
      expectedCrossingIdentity:observed.crossingIdentity,
      albumContext:{},
    },
  };
  const preview=await service.compose(config);
  assert.equal(preview.proposal.ancestry.nextGenCrossing.crossingIdentity,observed.crossingIdentity);
  assert.equal(preview.proposal.materials.filter(m=>m.derivation?.schema==='static-collective/franken-video-digestion-material/v0').length,6);
  assert.equal(preview.proposal.movingTakeSceneId,observed.frankenPressure.edits.movingTakeSceneId);
  assert.equal(preview.proposal.variation,3,'explicit editor variation must override Listening Eye pressure');
  const frozen=await service.freeze({...config,expectedProposalIdentity:preview.proposalIdentity});
  assert.equal(frozen.plan.receipts.nextGenCrossingIdentity,observed.crossingIdentity);
  assert.equal(frozen.plan.materials.filter(m=>m.derivation?.familyHash===observed.videoDigestion.familyHash).length,6);
});

test('Franken service refuses a stale NextGen crossing identity',async()=>{
  const f=await configInTemp();
  const service=createFrankenComposerService({
    rootDir:path.join(f.dir,'out-nextgen-stale'),
    getNextGenContext:nextGenProvider(),
  });
  await assert.rejects(
    ()=>service.compose({
      ...f.config,
      nextGen:{enabled:true,expectedCrossingIdentity:'0'.repeat(64),albumContext:{}},
    }),
    /stale|unreviewed NextGen/i,
  );
});
