const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createCandidateSession } = require('../src/candidate-session.cjs');
const { buildToastPack, buildSpecimenPulse } = require('../src/video-pantry/material-analysis.cjs');
const { buildCreativeContextTable } = require('../src/generation/creative-context-table.cjs');
const fixture = require('../fixtures/analysis/sectional.v1.json');
const media = { duration:fixture.durationSeconds, energySamples:[], sections:fixture.sections.map(s=>({start:s.startSeconds,end:s.endSeconds,energy:s.energy,label:s.label})) };
const audioPath=path.resolve('test-song.wav');
const video={schema:'haunted-toaster/video-source/v1',specimenId:`sha256:${'a'.repeat(64)}:12`,sourceSha256:'a'.repeat(64),byteLength:12,path:path.resolve('test-clip.mp4'),probe:{durationSeconds:4,width:32,height:32,frameRate:'24/1',hasAudio:true}};
function harness(impl) {
 let family;
 const session=createCandidateSession({analyzeMaterial:impl || (async b=>({toastPack:buildToastPack(b),specimenPulse:buildSpecimenPulse(b,{pcm:Buffer.alloc(1600),decoder:'fixture'})})), renderCandidateFamilyPreviews:async(_config,f)=>{family=f;return {familyHash:f.familyHash};}});
 session.noteAudio(audioPath,media);
 return {session,get family(){return family;}};
}
const config={presetId:'openField',rootSeed:'archaeology-281',lyrics:''};
test('ordinary session observes material with zero family, score, or timeline delta; KEEP retains evidence',async()=>{
 const baseline=harness(), observed=harness();
 baseline.session.noteVideo(video); observed.session.noteVideo(video);
 const a=await baseline.session.generate({...config,archaeologyObservation:false});
 const b=await observed.session.generate(config);
 assert.deepEqual(observed.family,baseline.family); assert.equal(a.archaeologyObservation,null);
 const evidence=b.archaeologyObservation;
 assert.equal(evidence.familyHash,b.familyHash); assert.equal(evidence.candidates.length,6);
 assert.deepEqual(evidence.candidates[0].diet.ignored,['pantry/specimen-pulse-v1','pantry/toastpack-v1']);
 assert.deepEqual(evidence.candidates[0].diet.influenceOnly,[]);
 assert.equal(buildCreativeContextTable({entries:[...evidence.table.entries].reverse()}).tableHash,evidence.table.tableHash);
 const c=observed.family.candidates[0];
 observed.session.select({familyHash:b.familyHash,index:c.index});
 observed.session.keep({familyHash:b.familyHash,index:c.index});
 const execution=observed.session.executionForRender({...config,audioPath});
 assert.deepEqual(execution.candidateGenealogy.archaeologyObservation,evidence);
 assert.equal(execution.resolvedTimeline.timelineHash,c.timelineHash);
 observed.session.clearVideo();
 const cleared=await observed.session.generate(config);
 assert.equal(cleared.archaeologyObservation.table.entries.some(e=>e.providerId.startsWith('pantry/')),false);
});
test('unavailable optional material still yields the same ordinary family',async()=>{
 const a=harness(async()=>{throw Error('missing source');}),b=harness();
 a.session.noteVideo(video);b.session.noteVideo(video);
 const result=await a.session.generate(config);await b.session.generate({...config,archaeologyObservation:false});
 assert.deepEqual(a.family,b.family);
 assert.ok(result.archaeologyObservation.table.entries.filter(e=>e.providerId.startsWith('pantry/')).every(e=>e.availability==='unavailable'));
});
test('cancellation does not publish an observation',async()=>{
 const abort=new AbortController(); const h=harness(async()=>{abort.abort();throw abort.signal.reason;});
 h.session.noteVideo(video);
 await assert.rejects(h.session.generate(config,abort.signal));
 assert.equal(h.family,undefined);
});
test('changing the song while optional analysis awaits refuses stale family evidence',async()=>{
 let h;
 h=harness(async b=>{h.session.noteAudio(path.resolve('replacement.wav'),media);return {toastPack:buildToastPack(b),specimenPulse:buildSpecimenPulse(b)};});
 h.session.noteVideo(video);
 await assert.rejects(h.session.generate(config),/Source changed/);
 assert.equal(h.family,undefined);
});
