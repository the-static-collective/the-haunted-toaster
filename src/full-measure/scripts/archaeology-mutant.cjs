// One repeatable product-path specimen for PR #281's four recovered seams.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { admitVideo } = require('../src/video-pantry/admit.cjs');
const { analyzeSpecimenMaterial } = require('../src/video-pantry/material-analysis.cjs');
const { createCandidateSession } = require('../src/candidate-session.cjs');
const { inspectAudio } = require('../src/render/analyze.cjs');
const { renderVideo } = require('../src/render/render.cjs');
const { resolveFfmpeg, runProcess } = require('../src/render/tooling.cjs');

async function main() {
  const artifacts = path.resolve(__dirname, '../test-artifacts/archaeology-mutant');
  await fs.mkdir(artifacts, { recursive:true });
  const audioPath = path.join(artifacts,'master.wav');
  const fixturePath = path.join(artifacts,'specimen.mp4');
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--video')) throw Error('Usage: npm run archaeology:mutant -- [--video /path/to/clip.mp4]');
  await runProcess(resolveFfmpeg(),['-v','error','-y','-f','lavfi','-i','sine=frequency=137:duration=5:sample_rate=48000','-c:a','pcm_s16le',audioPath]);
  if (!args.length) await runProcess(resolveFfmpeg(),['-v','error','-y','-f','lavfi','-i','testsrc2=size=96x64:rate=12:duration=3','-f','lavfi','-i','sine=frequency=440:duration=3:sample_rate=8000','-c:v','libx264','-threads','1','-pix_fmt','yuv420p','-c:a','aac','-shortest',fixturePath]);
  const { binding } = await admitVideo(args.length ? path.resolve(args[1]) : fixturePath,{persist:false});
  const material = await analyzeSpecimenMaterial(binding);
  assert.equal(material.toastPack.visualStatus,'available');
  if (binding.probe.hasAudio) assert.equal(material.specimenPulse.status,'partial');
  const replay = await analyzeSpecimenMaterial(binding);
  assert.deepEqual(replay,material);
  const analysis = await inspectAudio(audioPath);
  const session = createCandidateSession();
  session.noteAudio(audioPath,analysis); session.noteVideo(binding);
  const config = {presetId:'wireOrchard',rootSeed:'archaeology-281-mutant',lyrics:'',title:'ARCHAEOLOGY MUTANT',artist:'The Static Collective'};
  const view = await session.generate(config);
  assert.equal(view.candidates.length,6);
  assert.equal(view.archaeologyObservation.table.entries.find(e=>e.providerId==='pantry/toastpack-v1').payload.manifestSha256,material.toastPack.manifestSha256);
  session.select({familyHash:view.familyHash,index:0});
  session.keep({familyHash:view.familyHash,index:0});
  const execution = session.executionForRender({...config,audioPath,imagePath:null});
  const result = await renderVideo({...execution,...config,audioPath,outputPath:path.join(artifacts,'mutant.mp4'),width:640,height:360,fps:24,encoderPreset:'ultrafast',crf:28});
  assert.equal(result.receipt.validation.accepted,true);
  assert.deepEqual(result.receipt.candidateGenealogy.archaeologyObservation,view.archaeologyObservation);
  const { runResonantDisturbance, DISTURBANCE_BODY_SCHEMA, DISTURBANCE_PRESSURE_SCHEMA, RESONANT_DISTURBANCE_POLICY } = require('../src/generation/resonant-disturbance.cjs');
  const body = {schema:DISTURBANCE_BODY_SCHEMA,policyVersion:RESONANT_DISTURBANCE_POLICY,bodyId:'archaeology-three-cell',cells:[{id:'A',initialLoad:0,threshold:5,recoil:5},{id:'B',initialLoad:4,threshold:7,recoil:7},{id:'C',initialLoad:2,threshold:6,recoil:6}],couplings:[{id:'AB',sourceCellId:'A',targetCellId:'B',transfer:3},{id:'BC',sourceCellId:'B',targetCellId:'C',transfer:4}],maxEvents:16};
  const pressure = {schema:DISTURBANCE_PRESSURE_SCHEMA,policyVersion:RESONANT_DISTURBANCE_POLICY,sourceRef:'fixture:archaeology-A-5',targetCellId:'A',amount:5,authority:'fixture'};
  const physiology = runResonantDisturbance(body,pressure);
  assert.deepEqual(physiology.finalState.loads,{A:0,B:0,C:0});
  await fs.writeFile(path.join(artifacts,'evidence.json'),JSON.stringify({schema:'haunted-toaster/archaeology-mutant-proof/v1',material,observation:view.archaeologyObservation,physiology,body,pressure,renderReceipt:result.receipt},null,2));
  process.stdout.write(`Archaeology mutant PASS: ${artifacts}\nVisual samples: ${material.toastPack.visualSamples.length}; pulse windows: ${material.specimenPulse.windows.length}; candidates: 6; body events: ${physiology.events.length}\n`);
}
main().catch(error=>{process.stderr.write(`${error.stack}\n`);process.exitCode=1;});
