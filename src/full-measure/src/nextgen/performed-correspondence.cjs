'use strict';

// NEXTGEN-TOASTER-025: operator-declared performed correspondence.
// Nothing here grants generation, rendering, KEEP, adoption, or lineage authority.
const { createHash } = require('node:crypto');

const SCHEMA = 'static-collective/performed-correspondence/v0';
const POLICY = 'exact-particular-operator-declaration/v0';
const KINDS = Object.freeze({
  continue: [1, 1, 1, 1],
  split: [1, 1, 2, Infinity],
  join: [2, Infinity, 1, 1],
  release: [1, Infinity, 0, 0],
  emerge: [0, 0, 1, Infinity],
});

function fail(message) {
  throw new Error('PerformedCorrespondenceV0: ' + message);
}

function isObject(value) {
  return value !== null && typeof value === 'object' &&
    !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function canonical(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (!isObject(value)) fail('unserializable input');
  return '{' + Object.keys(value).sort().map(
    (key) => JSON.stringify(key) + ':' + canonical(value[key])
  ).join(',') + '}';
}

function hash(domain, value) {
  return createHash('sha256').update(domain + '\n' + canonical(value)).digest('hex');
}

function nonempty(value, name) {
  if (typeof value !== 'string' || !value.trim() || value.length > 1024) fail(name + ' must be a nonempty bounded string');
  return value;
}

function placementIndex(witness, side) {
  if (!isObject(witness)) fail(side + ' witness must be an object');
  nonempty(witness.performanceHash, side + '.performanceHash');
  if (!Array.isArray(witness.placements) || witness.placements.length > 10000) {
    fail(side + '.placements must be a bounded array');
  }
  const ids = new Set();
  for (const p of witness.placements) {
    if (!isObject(p)) fail(side + ' placement must be an object');
    const id = nonempty(p.id, side + ' placement id');
    nonempty(p.materialId, side + ' materialId');
    if (ids.has(id)) fail('duplicate ' + side + ' placement: ' + id);
    ids.add(id);
  }
  // Hash full supplied witness. These are declared operands, not verified rendered pixels.
  canonical(witness);
  return ids;
}

function ids(value, known, side, claimIndex) {
  if (!Array.isArray(value) || value.length > 10000) fail(side + ' endpoints must be bounded arrays');
  const unique = new Set();
  for (const id of value) {
    nonempty(id, side + ' endpoint');
    if (!known.has(id)) fail('unknown ' + side + ' endpoint: ' + id);
    if (unique.has(id)) fail('repeated endpoint within claim ' + claimIndex + ': ' + id);
    unique.add(id);
  }
  return [...unique].sort();
}

function compilePerformedCorrespondence({parentWitness, childWitness, declarations} = {}) {
  const parents = placementIndex(parentWitness, 'parent');
  const children = placementIndex(childWitness, 'child');
  if (!Array.isArray(declarations) || declarations.length > 10000) {
    fail('declarations must be a bounded array');
  }
  const usedParent = new Set(), usedChild = new Set(), claims = [];
  declarations.forEach((item, i) => {
    if (!isObject(item)) fail('claim must be an object');
    const keys = Object.keys(item).sort();
    if (canonical(keys) !== canonical(['attestationId', 'from', 'kind', 'to'])) {
      fail('claim must contain exactly attestationId, from, kind, to');
    }
    const kind = item.kind;
    if (!Object.prototype.hasOwnProperty.call(KINDS, kind)) fail('unknown relation kind');
    const [minFrom, maxFrom, minTo, maxTo] = KINDS[kind];
    const from = ids(item.from, parents, 'parent', i);
    const to = ids(item.to, children, 'child', i);
    if (from.length < minFrom || from.length > maxFrom ||
        to.length < minTo || to.length > maxTo) fail('invalid ' + kind + ' arity');
    for (const id of from) {
      if (usedParent.has(id)) fail('parent endpoint claimed more than once: ' + id);
      usedParent.add(id);
    }
    for (const id of to) {
      if (usedChild.has(id)) fail('child endpoint claimed more than once: ' + id);
      usedChild.add(id);
    }
    claims.push({
      kind,
      from,
      to,
      attestationId: nonempty(item.attestationId, 'attestationId'),
    });
  });
  claims.sort((a, b) => canonical(a).localeCompare(canonical(b), 'en'));
  const record = {
    schema: SCHEMA,
    policy: POLICY,
    authority: 'operator-declared-observational-only',
    grantedAuthorities: [],
    parent: {
      performanceHash: parentWitness.performanceHash,
      witnessSha256: hash('HauntedToaster-Correspondence-Operand-v0', parentWitness),
    },
    child: {
      performanceHash: childWitness.performanceHash,
      witnessSha256: hash('HauntedToaster-Correspondence-Operand-v0', childWitness),
    },
    claims,
    unclaimedParentPlacementIds: [...parents].filter((id) => !usedParent.has(id)).sort(),
    unclaimedChildPlacementIds: [...children].filter((id) => !usedChild.has(id)).sort(),
    unknowns: [
      'rendered-pixel-causation-not-proven',
      'operator-attestation-not-independently-authenticated',
      'undeclared-correspondence-remains-unknown',
      'ancestral-reunion-not-inferred',
    ],
  };
  return {...record, correspondenceSha256: hash('HauntedToaster-PerformedCorrespondence-v0', record)};
}

function verifyPerformedCorrespondence(record, operands) {
  if (!isObject(record)) fail('record must be an object');
  const expected = compilePerformedCorrespondence(operands);
  if (canonical(record) !== canonical(expected)) fail('record does not match exact operands and declarations');
  return true;
}

module.exports = {
  SCHEMA, POLICY, compilePerformedCorrespondence, verifyPerformedCorrespondence,
};