#!/usr/bin/env node
'use strict';

// Diagnostic CLI only. No creative, receipt, render, or human-verdict authority.
const fs = require('node:fs');
const { compilePerformedCorrespondence, verifyPerformedCorrespondence } =
  require('../src/nextgen/performed-correspondence.cjs');

function specimen() {
  const parentWitness = {
    performanceHash: 'specimen-parent',
    placements: [{id:'one',materialId:'melody'}],
  };
  const childWitness = {
    performanceHash: 'specimen-child',
    placements: [{id:'left',materialId:'melody'}, {id:'right',materialId:'melody'}],
  };
  const declarations = [{
    kind: 'split',
    from: ['one'],
    to: ['left','right'],
    attestationId: 'specimen-declaration-not-authenticated',
  }];
  return {parentWitness,childWitness,declarations};
}

function main(args) {
  const [mode, source, ...rest] = args;
  if (rest.length || (mode !== '--specimen' && mode !== '--input' && mode !== '--verify')) {
    throw new Error('usage: performed-correspondence.cjs --specimen | --input path.json | --verify path.json');
  }
  const operands = mode === '--specimen' ? specimen() : JSON.parse(fs.readFileSync(source, 'utf8'));
  if ((mode === '--input' || mode === '--verify') && !source) throw new Error('missing input path');
  if (mode === '--verify') {
    if (!operands.record) throw new Error('verification needs {record,parentWitness,childWitness,declarations}');
    verifyPerformedCorrespondence(operands.record, operands);
    console.log(JSON.stringify({verified:true, correspondenceSha256:operands.record.correspondenceSha256}));
    return;
  }
  const record = compilePerformedCorrespondence(operands);
  verifyPerformedCorrespondence(record, operands);
  console.log(JSON.stringify(record,null,2));
}

try {
  main(process.argv.slice(2));
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
}
