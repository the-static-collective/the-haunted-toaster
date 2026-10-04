"use strict";
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {adaptPlaydeck}=require('../../src/franken-composer/adapters/playdeck.cjs');
const {adaptAcceptedBlenderTake}=require('../../src/franken-composer/adapters/blender-take.cjs');
const {composeFrankenProposal,proposalToComposition}=require('../../src/franken-composer/compose.cjs');
const {freezeFrankenComposition}=require('../../src/franken-composer/freeze.cjs');
const {makeBlenderFixture}=require('./franken-blender-fixture.cjs');
function frozenFixture(){const root=path.join(__dirname,'..','fixtures','franken');const deck=JSON.parse(fs.readFileSync(path.join(root,'playdeck-deck.json'),'utf8'));const worldRule=JSON.parse(fs.readFileSync(path.join(root,'playdeck-world-rule.json'),'utf8'));const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');const playdeck=adaptPlaydeck({deck,worldRule,sourceDigests:Object.fromEntries(deck.cards.map(c=>[c.source,sha(path.join(root,c.source))]))});const f=makeBlenderFixture();const blenderTake=adaptAcceptedBlenderTake({acceptance:f.acceptance,acceptancePath:f.acceptancePath,admissionReceipt:f.admission,videoPath:f.video});const proposal=composeFrankenProposal({playdeck,blenderTake,seed:'seed-001'});const frozen=freezeFrankenComposition(proposalToComposition(proposal));const assetBindings=Object.fromEntries(frozen.plan.materials.map(m=>[m.materialId,m.kind==='video'?f.video:(m.kind==='image'?path.join(root,deck.cards.find(c=>'playdeck:'+c.id===m.materialId)?.source||''):'')]));return {...frozen,assetBindings,videoPath:f.video};}
module.exports={frozenFixture};
