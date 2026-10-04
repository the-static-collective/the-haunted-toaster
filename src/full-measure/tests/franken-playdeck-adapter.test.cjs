const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {adaptPlaydeck} = require('../src/franken-composer/adapters/playdeck.cjs');
const root = path.join(__dirname,'fixtures','franken');
const deck = JSON.parse(fs.readFileSync(path.join(root,'playdeck-deck.json'),'utf8'));
const worldRule = JSON.parse(fs.readFileSync(path.join(root,'playdeck-world-rule.json'),'utf8'));
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function digests(){return Object.fromEntries(deck.cards.map(c=>[c.source,sha(path.join(root,c.source))]));}
test('six-card Playdeck snapshot adapts without importing session authority',()=>{const out=adaptPlaydeck({deck,worldRule,sourceDigests:digests()});assert.equal(out.cards.length,6);assert.equal(out.authority,'proposal-only');assert.equal(out.cards[0].materialId,'playdeck:card-01');assert.equal(out.worldRule.id,'manga-room');assert.equal(out.ancestry.observation.inheritedReceipt,'receipt-parent-001');assert.equal(out.ancestry.acceptedHistory,undefined);});
test('changed card bytes or declared digest refuse',()=>{const d=digests();d['cards/card-03.svg']='0'.repeat(64);assert.throws(()=>adaptPlaydeck({deck,worldRule,sourceDigests:d}),/digest/i);});
test('possibility metadata remains proposal context and never becomes accepted history',()=>{const out=adaptPlaydeck({deck,worldRule,sourceDigests:digests()});assert.deepEqual(out.ancestry.observation.possibilityKeep,{proposalId:'maybe-001'});assert.equal(out.ancestry.authority,'observation-only');});
test('unknown world rule fields refuse',()=>{assert.throws(()=>adaptPlaydeck({deck,worldRule:{...worldRule,secretSemantic:'bad'},sourceDigests:digests()}),/unknown world rule/i);});
