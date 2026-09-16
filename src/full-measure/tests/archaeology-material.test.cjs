const test = require('node:test');
const assert = require('node:assert/strict');
const { buildToastPack, buildSpecimenPulse, analyzeSpecimenMaterial } = require('../src/video-pantry/material-analysis.cjs');
const binding = { schema:'haunted-toaster/video-source/v1', specimenId:`sha256:${'a'.repeat(64)}:12`, sourceSha256:'a'.repeat(64), byteLength:12, path:'/one.mp4', probe:{durationSeconds:4,width:32,height:32,frameRate:'24/1',hasAudio:true} };
const decoder = 'fixture-decoder-v1';
test('ToastPack identity excludes filename/path and retains measured descriptors', () => {
 const frames=[{atMillis:0,rgb:Buffer.alloc(16*16*3,128)}];
 const a=buildToastPack(binding,{frames,decoder});
 const b=buildToastPack({...binding,path:'/two.mp4',filename:'other'}, {frames,decoder});
 assert.deepEqual(a,b); assert.equal(a.visualSamples[0].meanRgb[0],128);
 assert.equal(a.visualSamples[0].edgeDifference,0); assert.equal(a.status,'partial');
 assert.equal(a.executionAuthority,'none'); assert.ok(Object.isFrozen(a));
 assert.notEqual(a.manifestSha256,buildToastPack(binding,{frames,decoder:'other'}).manifestSha256);
});
test('Pulse distinguishes silence, energy rise, and no audio without claiming beats', () => {
 const pcm=Buffer.alloc(1600*2); for(let i=800;i<1600;i++)pcm.writeInt16LE(16384,i*2);
 const p=buildSpecimenPulse(binding,{pcm,decoder});
 assert.deepEqual(p.windows.map(w=>w.energy),[0,250000]);
 assert.equal(p.windows[1].energyDelta,250000); assert.equal(p.windows[1].onsetProxy,true);
 assert.equal(p.timingAuthority,'clip-relative-only'); assert.equal(p.masterAudioAuthority,'none');
 assert.equal(p.periodicity.status,'unavailable');
 assert.equal(buildSpecimenPulse({...binding,probe:{...binding.probe,hasAudio:false}}).status,'unavailable');
 assert.throws(()=>buildSpecimenPulse(binding,{pcm:Buffer.alloc(3),decoder}),/PCM/);
});
test('analysis refuses replaced content before invoking decoder', async () => {
 let decoded=false;
 await assert.rejects(analyzeSpecimenMaterial(binding,{hashFileImpl:async()=>({sha256:'b'.repeat(64),byteLength:12}), decode:async()=>{decoded=true;}}),/identity/);
 assert.equal(decoded,false);
});
test('partial decoding failure remains unavailable and source mutation fails closed', async () => {
 const identity={sha256:'a'.repeat(64),byteLength:12};
 const failed=await analyzeSpecimenMaterial(binding,{hashFileImpl:async()=>identity,decode:async()=>{throw Error('no decoder');}});
 assert.equal(failed.toastPack.visualStatus,'unavailable'); assert.equal(failed.specimenPulse.status,'unavailable');
 let n=0;
 await assert.rejects(analyzeSpecimenMaterial(binding,{hashFileImpl:async()=>++n===1?identity:{...identity,byteLength:13},decode:async()=>({stdout:Buffer.from('decoder')})}),/identity/);
});
test('Pulse refuses sample coverage beyond the admitted video duration',()=>{
 assert.throws(()=>buildSpecimenPulse({...binding,probe:{...binding.probe,durationSeconds:0.1}},{pcm:Buffer.alloc(3200),decoder}),/bounded/);
});
