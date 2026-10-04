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


test('real Playdeck nine-card shared-sheet shape projects six cards with source crops',()=>{
  const source='asset://genesis-001/cosmic-flipbook.png';
  const cards=Array.from({length:9},(_,i)=>({id:`real-card-${String(i+1).padStart(2,'0')}`,source,front:{source,crop:{x:(i%3)/3,y:Math.floor(i/3)/3,width:1/3,height:1/3}},traits:['witness'],temperament:['quiet']}));
  const realDeck={schemaVersion:'0.1',id:'genesis-shape',cards,order:cards.map(card=>card.id)};
  const out=adaptPlaydeck({deck:realDeck,worldRule,sourceDigests:{[source]:'a'.repeat(64)}});
  assert.equal(out.cards.length,6);
  assert.deepEqual(out.cards.map(card=>card.cardId),cards.slice(0,6).map(card=>card.id));
  assert.deepEqual(out.cards[4].crop,{x:0.333333,y:0.333333,width:0.333333,height:0.333333});
  assert.equal(out.ancestry.donorCardCount,9);
});
