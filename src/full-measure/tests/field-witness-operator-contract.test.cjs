const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const mainSource = fs.readFileSync(path.join(root, 'src', 'main.cjs'), 'utf8');
const rendererMarkup = fs.readFileSync(path.join(root, 'src', 'renderer', 'index.html'), 'utf8');

test('successful packaged renders are archived before field witness capture is offered', () => {
  assert.match(mainSource, /archiveSuccessfulRender/);
  assert.match(mainSource, /lastFieldRender/);
  assert.match(mainSource, /await archiveSuccessfulRender\(/);
  assert.match(mainSource, /receiptSha256/);
});

test('Ctrl+Shift+W is an operator-only field witness command with the four trust claims', () => {
  assert.match(mainSource, /before-input-event/);
  assert.match(mainSource, /input\.control/);
  assert.match(mainSource, /input\.shift/);
  assert.match(mainSource, /appendFieldWitnessReceipt/);
  assert.match(mainSource, /aggressiveRenderCompleted/);
  assert.match(mainSource, /lowAndSlowExpressiveReachPreserved/);
  assert.match(mainSource, /listenerDraftPreserved/);
  assert.match(mainSource, /relistenHumanAnchorsPreserved/);
});

test('field witness capture adds no persistent renderer furniture', () => {
  assert.doesNotMatch(rendererMarkup, /field witness/i);
  assert.doesNotMatch(rendererMarkup, /Ctrl\+Shift\+W/i);
});
