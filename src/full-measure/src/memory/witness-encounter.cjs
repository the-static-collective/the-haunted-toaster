const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const { readArchivedRender } = require("./receipt-archive.cjs");

const WITNESS_ENCOUNTER_SCHEMA = "haunted-toaster/witness-encounter/v1";

function safeWitnessId(value) {
  const witnessId = String(value || "");
  if (!/^[A-Za-z0-9._-]{1,128}$/.test(witnessId)) {
    throw new TypeError("Witness encounter id must be a safe local token.");
  }
  return witnessId;
}

async function canonicalArchivedReceipt(rootDir, renderReceiptSha256) {
  let entry;
  try {
    entry = await readArchivedRender({ rootDir, receiptSha256: renderReceiptSha256 });
  } catch (error) {
    if (error?.code === "ENOENT" || /Corrupt render archive entry/.test(String(error?.message || ""))) {
      throw new Error(`Unknown render receipt: ${renderReceiptSha256}.`);
    }
    throw error;
  }
  if (!entry?.artifacts?.receipt?.path) {
    throw new Error(`Unknown render receipt: ${renderReceiptSha256}.`);
  }
  let receipt;
  try {
    receipt = JSON.parse(await fs.readFile(entry.artifacts.receipt.path, "utf8"));
  } catch {
    throw new Error(`Archived render receipt ${renderReceiptSha256} is unreadable.`);
  }
  if (receipt.schema !== "full-measure.video-receipt.v1" || receipt.validation?.accepted !== true) {
    throw new Error(`Archived render receipt ${renderReceiptSha256} is not an accepted render.`);
  }
  return receipt;
}

async function appendWitnessEncounter({
  rootDir,
  renderReceiptSha256,
  renderReceipt = null,
  memoryContext = null,
  now = () => new Date(),
  uuid = () => crypto.randomUUID(),
}) {
  const canonicalReceipt = await canonicalArchivedReceipt(rootDir, renderReceiptSha256);
  if (
    renderReceipt?.render?.witnessWindow &&
    JSON.stringify(renderReceipt.render.witnessWindow) !== JSON.stringify(canonicalReceipt.render?.witnessWindow)
  ) {
    throw new Error("Witness encounter input disagrees with the archived render Witness Window.");
  }
  const witnessId = safeWitnessId(uuid());
  const witness = {
    schema: WITNESS_ENCOUNTER_SCHEMA,
    witnessId,
    createdAt: now().toISOString(),
    renderReceiptSha256,
    witnessWindow: structuredClone(canonicalReceipt.render?.witnessWindow || null),
    currentSongEnergyClass: memoryContext?.capsule?.currentSongEnergyClass || null,
    memoryCapsuleSha256: memoryContext?.capsule?.capsuleSha256 || null,
    influenceTraceSha256: memoryContext?.influenceTrace?.traceSha256 || null,
    disposition: memoryContext?.witnessDisposition
      ? structuredClone(memoryContext.witnessDisposition)
      : null,
    reToastAncestor: memoryContext?.reToastAncestor
      ? structuredClone(memoryContext.reToastAncestor)
      : null,
  };

  const directory = path.join(path.resolve(rootDir), "Receipts", "witness");
  const filePath = path.join(directory, `${witnessId}.json`);
  const bytes = Buffer.from(`${JSON.stringify(witness, null, 2)}\n`, "utf8");
  await fs.mkdir(directory, { recursive: true });
  try {
    await fs.writeFile(filePath, bytes, { flag: "wx" });
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
    const existing = await fs.readFile(filePath);
    if (!existing.equals(bytes)) {
      throw new Error(`Immutable witness id collision: ${witnessId}.`);
    }
  }
  return witness;
}

async function listWitnessEncounters({ rootDir, renderReceiptSha256 = null }) {
  const directory = path.join(path.resolve(rootDir), "Receipts", "witness");
  let names;
  try {
    names = await fs.readdir(directory);
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
  const witnesses = [];
  for (const name of names) {
    if (!name.endsWith(".json")) continue;
    try {
      const value = JSON.parse(await fs.readFile(path.join(directory, name), "utf8"));
      if (value.schema !== WITNESS_ENCOUNTER_SCHEMA) continue;
      if (renderReceiptSha256 && value.renderReceiptSha256 !== renderReceiptSha256) continue;
      witnesses.push(value);
    } catch {
      // Corrupt witness records remain on disk but do not enter semantic memory.
    }
  }
  witnesses.sort((left, right) =>
    String(left.createdAt || "").localeCompare(String(right.createdAt || "")) ||
    String(left.witnessId || "").localeCompare(String(right.witnessId || "")));
  return witnesses;
}

module.exports = {
  WITNESS_ENCOUNTER_SCHEMA,
  appendWitnessEncounter,
  listWitnessEncounters,
};
