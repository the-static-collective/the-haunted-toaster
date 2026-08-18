const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { readArchivedRender } = require('./receipt-archive.cjs');

const VERDICT_SCHEMA = 'haunted-toaster/human-verdict/v1';
const DISPOSITIONS = new Set(['keep', 'weird', 'compost']);

function validateRating(value) {
  const rating = Number(value);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new TypeError('Human verdict rating must be an integer from 1 through 5.');
  }
  return rating;
}

function validateDisposition(value) {
  if (value === null || value === undefined || value === '') return null;
  const disposition = String(value);
  if (!DISPOSITIONS.has(disposition)) {
    throw new TypeError('Human verdict disposition must be keep, weird, or compost.');
  }
  return disposition;
}

function safeVerdictId(value) {
  const verdictId = String(value || '');
  if (!/^[A-Za-z0-9._-]{1,128}$/.test(verdictId)) {
    throw new TypeError('Human verdict id must be a safe local token.');
  }
  return verdictId;
}

async function ensureKnownReceipt(rootDir, renderReceiptSha256) {
  try {
    await readArchivedRender({ rootDir, receiptSha256: renderReceiptSha256 });
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new Error(`Unknown render receipt: ${renderReceiptSha256}.`);
    }
    if (/Render receipt identity/.test(String(error?.message))) throw error;
    throw new Error(`Unknown render receipt: ${renderReceiptSha256}.`);
  }
}

async function appendHumanVerdict({
  rootDir,
  renderReceiptSha256,
  rating,
  disposition = null,
  wouldReToast = false,
  now = () => new Date(),
  uuid = () => crypto.randomUUID(),
}) {
  const normalizedRating = validateRating(rating);
  const normalizedDisposition = validateDisposition(disposition);
  await ensureKnownReceipt(rootDir, renderReceiptSha256);

  const verdictId = safeVerdictId(uuid());
  const createdAt = now().toISOString();
  const verdict = {
    schema: VERDICT_SCHEMA,
    verdictId,
    createdAt,
    renderReceiptSha256,
    rating: normalizedRating,
    disposition: normalizedDisposition,
    wouldReToast: wouldReToast === true,
  };

  const directory = path.join(path.resolve(rootDir), 'Receipts', 'verdict');
  const filePath = path.join(directory, `${verdictId}.json`);
  const bytes = Buffer.from(`${JSON.stringify(verdict, null, 2)}\n`, 'utf8');
  await fs.mkdir(directory, { recursive: true });
  try {
    await fs.writeFile(filePath, bytes, { flag: 'wx' });
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error;
    const existing = await fs.readFile(filePath);
    if (!existing.equals(bytes)) {
      throw new Error(`Immutable verdict id collision: ${verdictId}.`);
    }
  }
  return verdict;
}

async function listHumanVerdicts({ rootDir, renderReceiptSha256 = null }) {
  const directory = path.join(path.resolve(rootDir), 'Receipts', 'verdict');
  let names;
  try {
    names = await fs.readdir(directory);
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
  const verdicts = [];
  for (const name of names) {
    if (!name.endsWith('.json')) continue;
    try {
      const value = JSON.parse(await fs.readFile(path.join(directory, name), 'utf8'));
      if (value.schema !== VERDICT_SCHEMA) continue;
      if (renderReceiptSha256 && value.renderReceiptSha256 !== renderReceiptSha256) continue;
      verdicts.push(value);
    } catch {
      // Corrupt verdicts are excluded from semantic projection; service-level scanning reports them.
    }
  }
  verdicts.sort((left, right) =>
    String(left.createdAt).localeCompare(String(right.createdAt)) ||
    String(left.verdictId).localeCompare(String(right.verdictId)));
  return verdicts;
}

module.exports = {
  DISPOSITIONS,
  VERDICT_SCHEMA,
  appendHumanVerdict,
  listHumanVerdicts,
  validateRating,
};
