const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const fsp=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const {assertLocalFile,createFrankenComposerService}=require('../src/franken-composer/bridge.cjs');
const {makeBlenderFixture}=require('./helpers/franken-blender-fixture.cjs');
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
