const test=require('node:test');
const assert=require('node:assert/strict');
const {compileHyperFramesFranken}=require('../src/franken-composer/projectors/hyperframes.cjs');
const {createProjectionReceipt}=require('../src/franken-composer/projection-receipt.cjs');
const {freezeFrankenComposition}=require('../src/franken-composer/freeze.cjs');
const {frozenFixture}=require('./helpers/franken-plan-fixture.cjs');
test('HyperFrames projection carries exact canonical plan hash and semantic trace',()=>{const f=frozenFixture();const out=compileHyperFramesFranken({plan:f.plan,planHash:f.planHash,assetBindings:f.assetBindings});assert.equal(out.manifest.planHash,f.planHash);assert.equal(out.semanticTrace.planHash,f.planHash);assert.match(out.html,new RegExp(`data-composition-id="hf-franken-${f.planHash.slice(0,12)}`));});
test('every clip receives explicit timing track and deterministic entrance semantics',()=>{const f=frozenFixture();const out=compileHyperFramesFranken({plan:f.plan,planHash:f.planHash,assetBindings:f.assetBindings});const clips=f.plan.scenes.flatMap(s=>s.tracks.flatMap(t=>t.clips));assert.equal((out.html.match(/data-clip-id=/g)||[]).length,clips.length);assert.equal((out.html.match(/data-entrance=/g)||[]).length,clips.length);for(const clip of clips){const timing='data-clip-id="'+clip.clipId+'" data-start="'+(clip.startFrame/f.plan.fps)+'" data-duration="'+(clip.durationFrames/f.plan.fps)+'"';assert.ok(out.html.includes(timing));}});
test('multi-scene projection contains both declared transitions and no hidden exit semantics',()=>{const f=frozenFixture();const out=compileHyperFramesFranken({plan:f.plan,planHash:f.planHash,assetBindings:f.assetBindings});assert.deepEqual(out.manifest.transitions.map(t=>t.kind),['panel-wipe','radial-reveal']);assert.equal((out.html.match(/data-transition-id=/g)||[]).length,2);assert.match(out.html,/data-transition-kind="panel-wipe"/);assert.match(out.html,/data-transition-kind="radial-reveal"/);assert.equal(out.manifest.hiddenExitSemantics,false);});
test('unsupported transform or transition refuses before HTML generation',()=>{const f=frozenFixture();const bad=JSON.parse(JSON.stringify(f.plan));bad.transitions[0].kind='liquid-ai';assert.throws(()=>compileHyperFramesFranken({plan:bad,planHash:f.planHash,assetBindings:f.assetBindings}),/unsupported transition/i);const bad2=JSON.parse(JSON.stringify(f.plan));bad2.scenes[0].tracks[0].clips[0].blend='multiply-unknown';assert.throws(()=>compileHyperFramesFranken({plan:bad2,planHash:f.planHash,assetBindings:f.assetBindings}),/unsupported blend/i);});
test('projection receipt cannot claim success without required validation evidence',()=>{const f=frozenFixture();assert.throws(()=>createProjectionReceipt({renderer:'hyperframes',planHash:f.planHash,projectionIdentity:'hf-test',checks:{lint:true,validate:true}}),/inspect/i);const r=createProjectionReceipt({renderer:'hyperframes',planHash:f.planHash,projectionIdentity:'hf-test',checks:{lint:true,validate:true,inspect:true}});assert.equal(r.status,'projection-validated');assert.equal(r.planHash,f.planHash);});

test('HyperFrames refuses jump cuts and unsupported CSS hinge transitions',()=>{const f=frozenFixture();for(const kind of ['cut','hinge']){const bad=JSON.parse(JSON.stringify(f.plan));bad.transitions[0].kind=kind;assert.throws(()=>compileHyperFramesFranken({plan:bad,planHash:f.planHash,assetBindings:f.assetBindings}),/unsupported transition/i);}});


test('shared-sheet image crop becomes a source viewport rather than clip-path masking',()=>{
  const f=frozenFixture();
  const input=JSON.parse(JSON.stringify(f.plan));
  delete input.receipts.planHash;
  const clip=input.scenes.flatMap(s=>s.tracks).flatMap(t=>t.clips).find(c=>c.materialId==='playdeck:card-01');
  clip.crop={x:0.25,y:0.25,width:0.5,height:0.5};
  const cropped=freezeFrankenComposition(input);
  const out=compileHyperFramesFranken({plan:cropped.plan,planHash:cropped.planHash,assetBindings:f.assetBindings});
  assert.match(out.html,/data-crop-viewport="true"/);
  assert.match(out.html,/width:200%;height:200%;left:-50%;top:-50%/);
  const viewport=out.html.match(/data-crop-viewport="true"[^>]*style="([^"]+)"/);assert.ok(viewport);assert.doesNotMatch(viewport[1],/clip-path:inset\(/);
});


test('HyperFrames clip elements emit exactly one class attribute',()=>{
  const f=frozenFixture();
  const out=compileHyperFramesFranken({plan:f.plan,planHash:f.planHash,assetBindings:f.assetBindings});
  const tags=[...out.html.matchAll(/<(?:img|video|div)\b[^>]*data-clip-id="[^"]+"[^>]*>/g)].map(match=>match[0]);
  assert.ok(tags.length>0);
  for(const tag of tags)assert.equal((tag.match(/\bclass=/g)||[]).length,1,tag);
});


test('HyperFrames timed elements are clip-owned and typography has no unbundled font dependency',()=>{
  const f=frozenFixture();
  const out=compileHyperFramesFranken({plan:f.plan,planHash:f.planHash,assetBindings:f.assetBindings});
  const timed=[...out.html.matchAll(/<(?:img|video|div)\b[^>]*(?:data-clip-id|data-transition-id)="[^"]+"[^>]*>/g)].map(m=>m[0]);
  assert.ok(timed.length>0);
  for(const tag of timed)assert.match(tag,/class="[^"]*\bclip\b[^"]*"/);
  assert.doesNotMatch(out.html,/Bowlby One SC/i);
});


test('HyperFrames emits nonzero media trim, video crop viewport, and frozen stack order',()=>{
  const f=frozenFixture();
  const input=JSON.parse(JSON.stringify(f.plan));
  delete input.receipts.planHash;
  const videoMaterial=input.materials.find(m=>m.kind==='video');
  const clip=input.scenes.flatMap(s=>s.tracks).flatMap(t=>t.clips).find(c=>c.materialId===videoMaterial.materialId);
  clip.sourceWindow={startSeconds:0.5,endSeconds:2.5};
  clip.durationFrames=48;
  clip.crop={x:0.1,y:0.2,width:0.7,height:0.6};
  clip.stackOrder=73;
  const frozen=freezeFrankenComposition(input);
  const out=compileHyperFramesFranken({plan:frozen.plan,planHash:frozen.planHash,assetBindings:f.assetBindings});
  assert.match(out.html,/data-media-start="0\.5"/);
  assert.match(out.html,/data-crop-viewport="true"/);
  assert.match(out.html,/data-stack-order="73"/);
  assert.match(out.html,/z-index:73/);
  assert.match(out.html,/currentTime=c\.mediaStart/);
});


test('HyperFrames lowers frozen transform keyframes into explicit GSAP timeline motion',()=>{
  const f=frozenFixture();
  const input=JSON.parse(JSON.stringify(f.plan));
  delete input.receipts.planHash;
  const clip=input.scenes[0].tracks[0].clips[0];
  clip.transformKeyframes=[
    {offsetFrames:12,transform:{x:0.4,y:0.45,scale:1.1,rotationDegrees:8}},
    {offsetFrames:36,transform:{x:0.7,y:0.6,scale:0.85,rotationDegrees:-12}},
  ];
  const frozen=freezeFrankenComposition(input);
  const out=compileHyperFramesFranken({plan:frozen.plan,planHash:frozen.planHash,assetBindings:f.assetBindings});
  assert.match(out.html,/"offsetSeconds":0\.5/);
  assert.match(out.html,/"offsetSeconds":1\.5/);
  assert.match(out.html,/for\(const k of c\.transformKeyframes\)/);
  assert.match(out.html,/ease:'none'/);
});
