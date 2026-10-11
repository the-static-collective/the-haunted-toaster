'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { compilePerformedCorrespondence: compile, verifyPerformedCorrespondence: verify } =
  require('../src/nextgen/performed-correspondence.cjs');

const parent = {
  performanceHash: 'performed-parent-not-a-sha',
  placements: [{id:'origin',materialId:'seed'}, {id:'other',materialId:'ambient'}],
};
const child = {
  performanceHash: 'performed-child-not-a-sha',
  placements: [{id:'branch-left',materialId:'seed'}, {id:'branch-right',materialId:'seed'}, {id:'new',materialId:'light'}],
};
function claim(kind, from, to, attestationId='operator-witness-001') {
  return {kind,from,to,attestationId};
}
function build(declarations, a=parent, b=child) {
  return compile({parentWitness:a,childWitness:b,declarations});
}

test('split is one explicit parent to multiple performed children', () => {
  const declarations=[claim('split',['origin'],['branch-right','branch-left'])];
  const record=build(declarations);
  assert.equal(record.claims[0].kind,'split');
  assert.deepEqual(record.claims[0].to,['branch-left','branch-right']);
  assert.deepEqual(record.unclaimedParentPlacementIds,['other']);
  assert.deepEqual(record.unclaimedChildPlacementIds,['new']);
  assert.equal(verify(record,{parentWitness:parent,childWitness:child,declarations}),true);
  assert.deepEqual(record.grantedAuthorities,[]);
});

test('declaration order and endpoint order do not alter the sealed record', () => {
  const a=[claim('split',['origin'],['branch-right','branch-left']),claim('release',['other'],[])];
  const b=[claim('release',['other'],[]),claim('split',['origin'],['branch-left','branch-right'])];
  assert.deepEqual(build(a),build(b));
});

test('join is a separate, new relation rather than reversal of split', () => {
  const joined={performanceHash:'joined',placements:[{id:'joined-1',materialId:'seed'}]};
  const record=build([claim('join',['other','origin'],['joined-1'])],parent,joined);
  assert.equal(record.claims[0].kind,'join');
  assert.ok(record.unknowns.includes('ancestral-reunion-not-inferred'));
});

test('release without replacement is explicit, not erased ancestry', () => {
  const record=build([claim('release',['origin'],[])]);
  assert.deepEqual(record.claims[0].to,[]);
  assert.equal(record.unclaimedParentPlacementIds.includes('other'),true);
});

test('emergence does not invent a parent', () => {
  const record=build([claim('emerge',[],['new'])]);
  assert.deepEqual(record.claims[0].from,[]);
});

test('unsupported kind and arity are refused', () => {
  for (const x of [claim('reunite',['origin'],['new']),claim('split',['origin'],['new']),
    claim('join',['origin'],['new']),claim('continue',['origin'],['branch-left','branch-right'])]) {
    assert.throws(()=>build([x]),/relation|arity/);
  }
});

test('unknown or duplicated endpoints are refused', () => {
  assert.throws(()=>build([claim('continue',['ghost'],['new'])]),/unknown parent/);
  assert.throws(()=>build([claim('split',['origin'],['new','new'])]),/repeated endpoint/);
  assert.throws(()=>build([claim('continue',['origin'],['new']),claim('release',['origin'],[])]),/claimed more than once/);
  assert.throws(()=>build([claim('continue',['origin'],['new']),claim('emerge',[],['new'])]),/claimed more than once/);
});

test('unknown endpoints stay unknown and never become automatic release or arrival', () => {
  const record=build([]);
  assert.equal(record.claims.length,0);
  assert.deepEqual(record.unclaimedParentPlacementIds,['origin','other']);
  assert.deepEqual(record.unclaimedChildPlacementIds,['branch-left','branch-right','new']);
});

test('record, supplied witness and attestation tampering are refused', () => {
  const declarations=[claim('split',['origin'],['branch-left','branch-right'])];
  const record=build(declarations);
  const operands={parentWitness:parent,childWitness:child,declarations};
  assert.throws(()=>verify({...record, authority:'render-permitted'},operands),/does not match/);
  assert.throws(()=>verify({...record, correspondenceSha256:'0'.repeat(64)},operands),/does not match/);
  assert.throws(()=>verify(record,{...operands,declarations:[{...declarations[0],attestationId:'other'}]}),/does not match/);
  assert.throws(()=>verify(record,{...operands,childWitness:{...child,placements:child.placements.map(p=>({...p,materialId:'changed'}))}}),/does not match/);
});

test('source-witness object key order does not change identity, content does', () => {
  const a=build([claim('release',['origin'],[])]);
  const reordered={placements: parent.placements.map(p=>({materialId:p.materialId,id:p.id})),performanceHash: parent.performanceHash};
  const b=build([claim('release',['origin'],[])],reordered,child);
  assert.deepEqual(a,b);
  assert.notEqual(a.parent.witnessSha256,build([claim('release',['origin'],[])],{...parent,extra:{observation:'one'}},child).parent.witnessSha256);
});

test('empty witness and non-JSON / duplicate placement inputs are refused', () => {
  assert.throws(()=>build([],{performanceHash:'',placements:[]},child),/performanceHash/);
  assert.throws(()=>build([],{...parent,placements:[parent.placements[0],parent.placements[0]]},child),/duplicate/);
  assert.throws(()=>build([],{...parent,other:undefined},child),/unserializable/);
});

test('arbitrary human-looking attestation is never treated as independently verified', () => {
  const record=build([claim('continue',['origin'],['branch-left'],'an-identifier-only')]);
  assert.equal(record.authority,'operator-declared-observational-only');
  assert.ok(record.unknowns.includes('operator-attestation-not-independently-authenticated'));
});