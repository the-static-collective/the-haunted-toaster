const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {adaptPlaydeck}=require('../src/franken-composer/adapters/playdeck.cjs');
const {adaptAcceptedBlenderTake}=require('../src/franken-composer/adapters/blender-take.cjs');
const {composeFrankenProposal,applyFrankenEdits,proposalToComposition}=require('../src/franken-composer/compose.cjs');
const {freezeFrankenComposition}=require('../src/franken-composer/freeze.cjs');
const {makeBlenderFixture}=require('./helpers/franken-blender-fixture.cjs');
const root=path.join(__dirname,'fixtures','franken');
const deck=JSON.parse(fs.readFileSync(path.join(root,'playdeck-deck.json'),'utf8'));
const worldRule=JSON.parse(fs.readFileSync(path.join(root,'playdeck-world-rule.json'),'utf8'));
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function donors(){const pd=adaptPlaydeck({deck,worldRule,sourceDigests:Object.fromEntries(deck.cards.map(c=>[c.source,sha(path.join(root,c.source))]))});const f=makeBlenderFixture();const bt=adaptAcceptedBlenderTake({acceptance:f.acceptance,acceptancePath:f.acceptancePath,admissionReceipt:f.admission,videoPath:f.video});return {playdeck:pd,blenderTake:bt};}
test('default seed composes ARRIVE CROSS ASSEMBLE at 48 seconds',()=>{const p=composeFrankenProposal({...donors(),seed:'seed-001'});assert.deepEqual(p.scenes.map(s=>[s.sceneId,s.startFrame,s.durationFrames]),[['ARRIVE',0,384],['CROSS',384,384],['ASSEMBLE',768,384]]);const frozen=freezeFrankenComposition(proposalToComposition(p));assert.equal(frozen.plan.durationFrames,1152);assert.equal(frozen.plan.fps,24);});
test('six cards moving take typography and topology layers are all addressable',()=>{const p=composeFrankenProposal({...donors(),seed:'seed-001'});assert.equal(p.materials.filter(m=>m.kind==='image').length,6);assert.equal(p.materials.filter(m=>m.kind==='video').length,1);assert.equal(p.materials.filter(m=>m.kind==='text').length,1);assert.equal(p.materials.filter(m=>m.kind==='generated-shape').length,1);assert.ok(p.scenes.some(s=>s.tracks.some(t=>t.role==='moving-take')));});
test('same seed and edit set replay byte-identically before freeze',()=>{const d=donors();const a=applyFrankenEdits(composeFrankenProposal({...d,seed:'seed-001'}),{text:'DOOR',variation:2});const b=applyFrankenEdits(composeFrankenProposal({...d,seed:'seed-001'}),{text:'DOOR',variation:2});assert.deepEqual(a,b);});
test('card reorder transition edit text edit and variation each create attributable semantic deltas',()=>{const p=composeFrankenProposal({...donors(),seed:'seed-001'});const base=freezeFrankenComposition(proposalToComposition(p)).planHash;for(const edits of [{cardOrder:[...p.cardOrder].reverse()},{transitions:{arriveCross:'cut'}},{text:'CHANGED'},{variation:9}]){const h=freezeFrankenComposition(proposalToComposition(applyFrankenEdits(p,edits))).planHash;assert.notEqual(h,base);}});
test('stale donor digest between proposal and freeze refuses',()=>{const p=composeFrankenProposal({...donors(),seed:'seed-001'});const forged=JSON.parse(JSON.stringify(p));forged.ancestry.playdeckSnapshot='0'.repeat(64);assert.throws(()=>proposalToComposition(forged),/stale|donor/i);});
test('unsupported role transition or moving-take placement refuses rather than coercing',()=>{const p=composeFrankenProposal({...donors(),seed:'seed-001'});assert.throws(()=>applyFrankenEdits(p,{transitions:{arriveCross:'liquid-ai'}}),/transition/i);assert.throws(()=>applyFrankenEdits(p,{movingTakeSceneId:'NOWHERE'}),/moving take/i);assert.throws(()=>applyFrankenEdits(p,{sceneRoles:{'card-01':'NOWHERE'}}),/scene role/i);assert.throws(()=>applyFrankenEdits(p,{worldRule:'anything-goes'}),/world rule/i);});

test('moving take duration never exceeds its declared source window at 24fps',()=>{const p=composeFrankenProposal({...donors(),seed:'seed-001'});const c=p.scenes.flatMap(s=>s.tracks).find(t=>t.role==='moving-take').clips[0];assert.ok(c.sourceWindow);assert.ok(c.durationFrames <= (c.sourceWindow.endSeconds-c.sourceWindow.startSeconds)*24);});


test('Playdeck source crop survives into the composed card clip',()=>{
  const d=donors();
  const playdeck=JSON.parse(JSON.stringify(d.playdeck));
  playdeck.cards[0].crop={x:0.25,y:0.25,width:0.5,height:0.5};
  const p=composeFrankenProposal({playdeck,blenderTake:d.blenderTake,seed:'crop-seed'});
  const clip=p.scenes.flatMap(s=>s.tracks).flatMap(t=>t.clips).find(c=>c.materialId===playdeck.cards[0].materialId);
  assert.deepEqual(clip.crop,playdeck.cards[0].crop);
});


test('donor world rule survives recomposition when no explicit override is supplied',()=>{
  const d=donors();
  const playdeck=JSON.parse(JSON.stringify(d.playdeck));
  playdeck.worldRule.id='flipbook';
  const p=composeFrankenProposal({playdeck,blenderTake:d.blenderTake,seed:'donor-world'});
  assert.equal(p.worldRule,'flipbook');
  const edited=applyFrankenEdits(p,{text:'KEEP DONOR WORLD'});
  assert.equal(edited.worldRule,'flipbook');
});


test('explicit world-rule override produces a visible renderer-neutral topology delta',()=>{
  const p=composeFrankenProposal({...donors(),seed:'world-visible'});
  const a=applyFrankenEdits(p,{worldRule:'manga-room'});
  const b=applyFrankenEdits(p,{worldRule:'wrong-medium'});
  const topology=proposal=>proposal.scenes.flatMap(s=>s.tracks).filter(t=>t.role==='topology-material').flatMap(t=>t.clips).map(clip=>({transform:clip.transform,opacity:clip.opacity}));
  assert.notDeepEqual(topology(a),topology(b));
});
