const test=require('node:test');
const assert=require('node:assert/strict');
const {compileHyperFramesFranken}=require('../src/franken-composer/projectors/hyperframes.cjs');
const {compileRemotionFranken}=require('../src/franken-composer/projectors/remotion.cjs');
const {frozenFixture}=require('./helpers/franken-plan-fixture.cjs');
const {createCompositionReceipt}=require('../src/franken-composer/receipt.cjs');
const {freezeFrankenComposition}=require('../src/franken-composer/freeze.cjs');
test('one frozen witness yields equal Remotion and HyperFrames semantic traces',()=>{const f=frozenFixture();const hyper=compileHyperFramesFranken({plan:f.plan,planHash:f.planHash,assetBindings:f.assetBindings});const remotion=compileRemotionFranken({plan:f.plan,planHash:f.planHash,assetBindings:f.assetBindings});assert.deepEqual(hyper.semanticTrace,remotion.semanticTrace);assert.equal(hyper.semanticTrace.planHash,f.planHash);assert.equal(hyper.semanticTrace.fps,24);assert.equal(hyper.semanticTrace.durationFrames,1152);assert.deepEqual(hyper.semanticTrace.scenes.map(s=>[s.sceneId,s.startFrame,s.durationFrames]),[['ARRIVE',0,384],['CROSS',384,384],['ASSEMBLE',768,384]]);const text=hyper.semanticTrace.materials.find(m=>m.materialId==='franken:text');assert.ok(text);assert.match(text.sourceIdentity,/THE ROOM REMEMBERS/);assert.equal(hyper.semanticTrace.transitions.length,2);assert.ok(hyper.semanticTrace.scenes.flatMap(s=>s.tracks).some(t=>t.role==='moving-take'));});

test('composition receipt binds frozen plan without gaining renderer authority',()=>{const f=frozenFixture();const r=createCompositionReceipt({plan:f.plan,planHash:f.planHash});assert.equal(r.schema,'static-collective/franken-composition-receipt/v0');assert.equal(r.planHash,f.planHash);assert.equal(r.status,'frozen-composition');assert.equal(r.authority,'composition-evidence-only');assert.equal(r.sceneCount,3);assert.equal(r.materialCount,9);});


function placedDigestFixture(){
  const base=frozenFixture();
  const input=JSON.parse(JSON.stringify(base.plan));
  delete input.receipts.planHash;
  const materialId='video-digest:texture-loop:'+ '1'.repeat(12);
  input.materials.push({
    materialId,
    kind:'video',
    sourceIdentity:'video-digestion:'+ 'a'.repeat(64)+':texture-loop:'+ '1'.repeat(64),
    digest:input.materials.find(m=>m.kind==='video').digest,
    rightsBasis:'local-admitted-video-derived-proposal',
    admissionBasis:'video-digestion-six-proposal-only',
    derivation:{
      schema:'static-collective/franken-video-digestion-material/v0',
      authority:'proposal-only',
      familyHash:'a'.repeat(64),
      roleId:'texture-loop',
      planHash:'1'.repeat(64),
      digestOperatorId:'clip-luma-texture-v1',
      samplingPolicyId:'loop-source-clip-v1',
      projectionClass:'derived-texture',
      sourceDurationFrames:72,
    },
    projectionTreatment:{
      schema:'static-collective/franken-video-digestion-treatment/v0',
      authority:'projection-style-only',
      family:'texture',
      grayscale:1,
      contrast:1.3,
      saturate:0.35,
      brightness:1.06,
      blurPx:1.2,
    },
  });
  input.scenes[0].tracks.splice(input.scenes[0].tracks.length-1,0,{
    trackId:'arrive-video-digestion',
    layer:'background',
    role:'video-digestion-placement',
    clips:[{
      clipId:'clip-arrive-digest-1-texture-loop',
      materialId,
      startFrame:48,
      durationFrames:48,
      sourceWindow:{startSeconds:0.5,endSeconds:2.5},
      transform:{x:0.42,y:0.58,scale:0.9,rotationDegrees:-4},
      crop:{x:0.1,y:0.1,width:0.8,height:0.8},
      opacity:0.55,
      blend:'screen',
      stackOrder:71,
      entrance:'arrive',
      transitionRelation:null,
    }],
  });
  const frozen=freezeFrankenComposition(input);
  return {...frozen,assetBindings:{...base.assetBindings,[materialId]:base.videoPath},videoPath:base.videoPath,materialId};
}

test('placed digestion clip has identical frozen semantics in both projectors',()=>{
  const f=placedDigestFixture();
  const hyper=compileHyperFramesFranken({plan:f.plan,planHash:f.planHash,assetBindings:f.assetBindings});
  const remotion=compileRemotionFranken({plan:f.plan,planHash:f.planHash,assetBindings:f.assetBindings});
  assert.deepEqual(hyper.semanticTrace,remotion.semanticTrace);
  const material=hyper.semanticTrace.materials.find(m=>m.materialId===f.materialId);
  assert.equal(material.derivation.roleId,'texture-loop');
  assert.equal(material.projectionTreatment.family,'texture');
  const track=hyper.semanticTrace.scenes[0].tracks.find(t=>t.role==='video-digestion-placement');
  assert.equal(track.clips[0].materialId,f.materialId);
  assert.deepEqual(track.clips[0].sourceWindow,{startSeconds:0.5,endSeconds:2.5});
  assert.deepEqual(track.clips[0].crop,{x:0.1,y:0.1,width:0.8,height:0.8});
  assert.equal(track.clips[0].stackOrder,71);
  assert.match(hyper.html,/grayscale\(1\) contrast\(1\.3\)/);
  assert.match(hyper.html,/data-media-start="0\.5"/);
  assert.match(hyper.html,/data-stack-order="71"/);
  assert.equal(remotion.bundle.materials.find(m=>m.materialId===f.materialId).projectionTreatment.family,'texture');
});
