const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { readArchivedRender } = require('./receipt-archive.cjs');

const FIELD_WITNESS_SCHEMA = 'haunted-toaster/field-witness-receipt/v1';
const FIELD_WITNESS_CLAIM_KEYS = Object.freeze([
  'aggressiveRenderCompleted',
  'lowAndSlowExpressiveReachPreserved',
  'listenerDraftPreserved',
  'relistenHumanAnchorsPreserved',
]);

function safeWitnessId(value) {
  const witnessId = String(value || '');
  if (!/^[A-Za-z0-9._-]{1,128}$/.test(witnessId)) {
    throw new TypeError('Field witness id must be a safe local token.');
  }
  return witnessId;
}

function normalizeBuildHead(value) {
  const buildHeadSha = String(value || '').toLowerCase();
  if (!/^[a-f0-9]{40}$/.test(buildHeadSha)) {
    throw new TypeError('Field witness build head must be an exact 40-character Git SHA.');
  }
  return buildHeadSha;
}

function normalizeClaims(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Field witness claims must be an object.');
  }
  const keys = Object.keys(value).sort();
  const expected = [...FIELD_WITNESS_CLAIM_KEYS].sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    throw new TypeError('Field witness claims must contain exactly the four required field witness claim keys.');
  }
  const claims = {};
  for (const key of FIELD_WITNESS_CLAIM_KEYS) {
    if (typeof value[key] !== 'boolean') {
      throw new TypeError(`Field witness claim ${key} must be true or false.`);
    }
    claims[key] = value[key];
  }
  return claims;
}

function normalizeNote(value) {
  if (value === null || value === undefined || value === '') return null;
  const note = String(value);
  if (note.length > 2_000) {
    throw new TypeError('Field witness note must be 2000 characters or fewer.');
  }
  return note;
}

async function knownArchivedRender(rootDir, renderReceiptSha256) {
  try {
    return await readArchivedRender({ rootDir, receiptSha256: renderReceiptSha256 });
  } catch (error) {
    if (error?.code === 'ENOENT' || /Corrupt render archive entry/.test(String(error?.message || ''))) {
      throw new Error(`Unknown render receipt: ${renderReceiptSha256}.`);
    }
    throw error;
  }
}

async function appendFieldWitnessReceipt({
  rootDir,
  renderReceiptSha256,
  buildHeadSha,
  claims,
  note = null,
  now = () => new Date(),
  uuid = () => crypto.randomUUID(),
}) {
  const archived = await knownArchivedRender(rootDir, renderReceiptSha256);
  const laneId = String(archived.visualIdentity?.toastFeelId || '').trim();
  if (!laneId) {
    throw new Error('Field witness requires canonical Toast Feel lane identity from the archived render.');
  }

  const normalizedClaims = normalizeClaims(claims);
  const witnessId = safeWitnessId(uuid());
  const witness = {
    schema: FIELD_WITNESS_SCHEMA,
    witnessId,
    createdAt: now().toISOString(),
    buildHeadSha: normalizeBuildHead(buildHeadSha),
    renderReceiptSha256: archived.receiptSha256,
    laneId,
    claims: normalizedClaims,
    passed: FIELD_WITNESS_CLAIM_KEYS.every((key) => normalizedClaims[key] === true),
    note: normalizeNote(note),
  };

  const directory = path.join(path.resolve(rootDir), 'Receipts', 'field-witness');
  const filePath = path.join(directory, `${witnessId}.json`);
  const bytes = Buffer.from(`${JSON.stringify(witness, null, 2)}\n`, 'utf8');
  await fs.mkdir(directory, { recursive: true });
  try {
    await fs.writeFile(filePath, bytes, { flag: 'wx' });
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error;
    const existing = await fs.readFile(filePath);
    if (!existing.equals(bytes)) {
      throw new Error(`Immutable field witness id collision: ${witnessId}.`);
    }
  }
  return witness;
}

module.exports = {
  FIELD_WITNESS_CLAIM_KEYS,
  FIELD_WITNESS_SCHEMA,
  appendFieldWitnessReceipt,
};
