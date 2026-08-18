const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

const ARCHIVE_SCHEMA = 'haunted-toaster/render-archive-entry/v1';
const ALLOWED_KINDS = new Set(['receipt', 'score', 'timeline', 'srt', 'vtt', 'video']);

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function archiveDirectory(rootDir, receiptSha256) {
  return path.join(path.resolve(rootDir), 'Receipts', 'render', receiptSha256);
}

async function isFile(filePath) {
  if (!filePath) return false;
  try {
    return (await fs.stat(filePath)).isFile();
  } catch {
    return false;
  }
}

async function writeImmutable(filePath, bytes) {
  try {
    await fs.writeFile(filePath, bytes, { flag: 'wx' });
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error;
    const existing = await fs.readFile(filePath);
    if (sha256(existing) !== sha256(bytes)) {
      throw new Error(`Immutable archive collision at ${path.basename(filePath)}.`);
    }
  }
}

async function copyImmutable(sourcePath, destinationPath) {
  if (!(await isFile(sourcePath))) return null;
  const bytes = await fs.readFile(sourcePath);
  await writeImmutable(destinationPath, bytes);
  return destinationPath;
}

function displayMetadata(receipt = {}) {
  return {
    createdAt: String(receipt.createdAt || ''),
    title: String(receipt.treatment?.title || receipt.output?.filename || 'Untitled toast'),
    artist: receipt.treatment?.artist ? String(receipt.treatment.artist) : null,
    visualIdentity: {
      garmentId: receipt.treatment?.garment?.id || null,
      toastFeelId: receipt.treatment?.toastFeel?.id || null,
    },
  };
}

async function readEntryCore(rootDir, receiptSha256) {
  if (!/^[a-f0-9]{64}$/.test(String(receiptSha256 || ''))) {
    throw new TypeError('Render receipt identity must be a SHA-256 hex digest.');
  }
  const entryPath = path.join(archiveDirectory(rootDir, receiptSha256), 'entry.json');
  const entry = JSON.parse(await fs.readFile(entryPath, 'utf8'));
  if (entry.schema !== ARCHIVE_SCHEMA || entry.receiptSha256 !== receiptSha256) {
    throw new Error(`Corrupt render archive entry: ${receiptSha256}.`);
  }
  return entry;
}

async function withAvailability(entry) {
  const kinds = [...ALLOWED_KINDS];
  const pairs = await Promise.all(kinds.map(async (kind) => {
    const target = kind === 'video' ? entry.original?.videoPath : entry.artifacts?.[kind]?.path;
    return [kind, await isFile(target)];
  }));
  return { ...entry, availability: Object.fromEntries(pairs) };
}

async function archiveSuccessfulRender({ rootDir, renderResult }) {
  const receiptPath = path.resolve(renderResult?.receiptPath || '');
  const receiptBytes = await fs.readFile(receiptPath);
  let receipt;
  try {
    receipt = JSON.parse(receiptBytes.toString('utf8'));
  } catch {
    throw new Error('Render receipt is not valid JSON.');
  }
  if (receipt.schema !== 'full-measure.video-receipt.v1' || receipt.validation?.accepted !== true) {
    throw new Error('Receipt archive requires an accepted successful render receipt.');
  }

  const receiptSha256 = sha256(receiptBytes);
  const directory = archiveDirectory(rootDir, receiptSha256);
  await fs.mkdir(directory, { recursive: true });

  const receiptArchivePath = path.join(directory, 'receipt.json');
  await writeImmutable(receiptArchivePath, receiptBytes);

  const sourceArtifacts = {
    score: renderResult?.scorePath || null,
    timeline: renderResult?.timelinePath || null,
    srt: renderResult?.srtPath || null,
    vtt: renderResult?.vttPath || null,
  };
  const artifacts = { receipt: { path: receiptArchivePath } };
  for (const [kind, sourcePath] of Object.entries(sourceArtifacts)) {
    const extension = sourcePath ? path.extname(sourcePath) : '';
    const destination = path.join(directory, `${kind}${extension || '.json'}`);
    const archivedPath = await copyImmutable(sourcePath, destination);
    artifacts[kind] = archivedPath ? { path: archivedPath } : null;
  }

  const metadata = displayMetadata(receipt);
  const entry = {
    schema: ARCHIVE_SCHEMA,
    receiptSha256,
    ...metadata,
    original: {
      videoPath: renderResult?.outputPath ? path.resolve(renderResult.outputPath) : null,
      receiptPath,
    },
    artifacts,
  };
  const entryBytes = Buffer.from(`${JSON.stringify(entry, null, 2)}\n`, 'utf8');
  await writeImmutable(path.join(directory, 'entry.json'), entryBytes);
  return withAvailability(entry);
}

async function readArchivedRender({ rootDir, receiptSha256 }) {
  return withAvailability(await readEntryCore(rootDir, receiptSha256));
}

async function listArchivedRenders({ rootDir }) {
  const base = path.join(path.resolve(rootDir), 'Receipts', 'render');
  let names;
  try {
    names = await fs.readdir(base);
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
  const entries = [];
  for (const name of names) {
    if (!/^[a-f0-9]{64}$/.test(name)) continue;
    try {
      entries.push(await readArchivedRender({ rootDir, receiptSha256: name }));
    } catch {
      // Corrupt entries are excluded from semantic history. A later service layer reports them.
    }
  }
  entries.sort((left, right) =>
    String(left.createdAt).localeCompare(String(right.createdAt)) ||
    left.receiptSha256.localeCompare(right.receiptSha256));
  return entries;
}

async function resolveArchivedArtifact({ rootDir, receiptSha256, kind }) {
  if (!ALLOWED_KINDS.has(kind)) throw new TypeError(`Unknown archived artifact kind: ${String(kind)}.`);
  const entry = await readEntryCore(rootDir, receiptSha256);
  const target = kind === 'video' ? entry.original?.videoPath : entry.artifacts?.[kind]?.path;
  return { path: target || null, exists: await isFile(target) };
}

module.exports = {
  ARCHIVE_SCHEMA,
  archiveSuccessfulRender,
  listArchivedRenders,
  readArchivedRender,
  resolveArchivedArtifact,
};
