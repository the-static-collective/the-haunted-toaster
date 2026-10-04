const test=require('node:test');
const assert=require('node:assert/strict');
const {compileRemotionFranken}=require('../src/franken-composer/projectors/remotion.cjs');
const {createProjectionReceipt}=require('../src/franken-composer/projection-receipt.cjs');
const {frozenFixture}=require('./helpers/franken-plan-fixture.cjs');
test('Remotion bundle carries exact canonical plan hash and semantic trace',()=>{const f=frozenFixture();const out=compileRemotionFranken({plan:f.plan,planHash:f.planHash,assetBindings:f.assetBindings});assert.equal(out.bundle.planHash,f.planHash);assert.equal(out.semanticTrace.planHash,f.planHash);assert.equal(out.bundle.composition.id,'Franken001');});
test('renderer bundle contains no proposal-only or mutable editor state',()=>{const f=frozenFixture();const out=compileRemotionFranken({plan:f.plan,planHash:f.planHash,assetBindings:f.assetBindings});const text=JSON.stringify(out.bundle);for(const key of ['proposalSchema','cardOrder','sceneRoles','_donor'])assert.equal(text.includes('"'+key+'"'),false);assert.equal(out.bundle.authority,'projection-only');});
test('unsupported semantic refuses rather than defaulting in React',()=>{const f=frozenFixture();const bad=JSON.parse(JSON.stringify(f.plan));bad.transitions[0].kind='liquid-ai';assert.throws(()=>compileRemotionFranken({plan:bad,planHash:f.planHash,assetBindings:f.assetBindings}),/unsupported transition/i);const bad2=JSON.parse(JSON.stringify(f.plan));bad2.scenes[0].tracks[0].clips[0].blend='mystery';assert.throws(()=>compileRemotionFranken({plan:bad2,planHash:f.planHash,assetBindings:f.assetBindings}),/unsupported blend/i);});
test('duration fps dimensions and scene spans derive only from frozen plan',()=>{const f=frozenFixture();const out=compileRemotionFranken({plan:f.plan,planHash:f.planHash,assetBindings:f.assetBindings});assert.deepEqual(out.bundle.composition,{id:'Franken001',durationInFrames:1152,fps:24,width:1280,height:720});assert.deepEqual(out.bundle.scenes.map(s=>[s.sceneId,s.startFrame,s.durationFrames]),[['ARRIVE',0,384],['CROSS',384,384],['ASSEMBLE',768,384]]);const r=createProjectionReceipt({renderer:'remotion',planHash:f.planHash,projectionIdentity:out.projectionHash,checks:{discover:true}});assert.equal(r.renderer,'remotion');});


test('founding Remotion projector refuses video source crops and composition implements image crop viewport',()=>{
  const f=frozenFixture();
  const bad=JSON.parse(JSON.stringify(f.plan));
  bad.scenes.flatMap(s=>s.tracks).flatMap(t=>t.clips).find(c=>c.materialId===bad.materials.find(m=>m.kind==='video').materialId).crop={x:0,y:0,width:0.5,height:0.5};
  assert.throws(()=>compileRemotionFranken({plan:bad,planHash:f.planHash,assetBindings:f.assetBindings}),/video crop/i);
  const fs=require('node:fs'),path=require('node:path');
  const source=fs.readFileSync(path.join(__dirname,'..','..','..','experiments','franken-composer-remotion','src','FrankenComposition.tsx'),'utf8');
  assert.match(source,/clip\.crop/);
  assert.match(source,/overflow:'hidden'/);
  assert.match(source,/100\/clip\.crop\.width/);
});
