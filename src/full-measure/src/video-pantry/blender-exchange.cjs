"use strict";

// Consumer-side membrane for Blender's local alchemy export. This is admission
// evidence only: it never edits VisualScore, ResolvedTimeline, IPC or render state.
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const { admitVideo, hashFile } = require("./admit.cjs");
const { createRecipe, admitRecipe } = require("./composition-recipes.cjs");
const { videoPantryCatalogPath } = require("../toaster-home.cjs");

const EXCHANGE_SCHEMA = "static-collective/pantry-exchange/v1";
const ENTRY_SCHEMA = "haunted-toaster/blender-pantry-exchange-entry/v1";
const SHA = /^[a-f0-9]{64}$/;
const SOURCE_ID = /^asset-[a-f0-9]{24}$/;
const RECIPE_ID = /^alchemy-[a-f0-9]{16}$/;
const MAX_EVIDENCE_BYTES = 1024 * 1024;

function digest(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function record(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(label + " must be an object.");
  }
  const observed = Object.keys(value).sort();
  if (observed.join("|") !== [...keys].sort().join("|")) {
    throw new TypeError(label + " has missing or unsupported fields.");
  }
  return value;
}

function required(value, predicate, label) {
  if (!predicate(value)) throw new TypeError("Invalid " + label + ".");
  return value;
}

function exact(value, expected, label) {
  if (value !== expected) throw new TypeError("Unexpected " + label + ".");
  return value;
}

function validateManifest(manifest) {
  record(manifest, ["schema", "producer", "media", "authority"], "Exchange manifest");
  exact(manifest.schema, EXCHANGE_SCHEMA, "exchange schema");
  const producer = record(manifest.producer, [
    "app", "kind", "recipeId", "snapshotSha256", "receiptSha256",
    "adapter", "relation", "evidenceClass", "orderedSources",
  ], "Producer");
  exact(producer.app, "haunted-blender", "producer app");
  exact(producer.kind, "alchemy-crossfade", "producer kind");
  required(producer.recipeId, (v) => typeof v === "string" && RECIPE_ID.test(v), "Blender recipe identity");
  for (const key of ["snapshotSha256", "receiptSha256"]) {
    required(producer[key], (v) => typeof v === "string" && SHA.test(v), key);
  }
  exact(producer.adapter, "ffmpeg-alchemy-crossfade/v1", "producer adapter");
  required(producer.relation, (v) => ["shape-echo", "triadic-bridge"].includes(v), "creative relation");
  exact(producer.evidenceClass, "artist_proposed", "relation evidence class");
  const roles = producer.relation === "shape-echo"
    ? ["source", "target"] : ["source", "bridge", "target"];
  required(producer.orderedSources, (v) => Array.isArray(v) && v.length === roles.length, "ordered sources");
  const seen = new Set();
  for (const source of producer.orderedSources) {
    record(source, ["role", "assetId", "sourceSha256", "renderedSha256"], "Ordered source");
    required(source.role, (v) => roles.includes(v) && !seen.has(v), "source role");
    seen.add(source.role);
    required(source.assetId, (v) => typeof v === "string" && SOURCE_ID.test(v), "Blender asset identity");
    for (const key of ["sourceSha256", "renderedSha256"]) {
      required(source[key], (v) => typeof v === "string" && SHA.test(v), key);
    }
  }
  const media = record(manifest.media, ["sha256", "byteLength", "container", "audio"], "Media");
  required(media.sha256, (v) => typeof v === "string" && SHA.test(v), "media SHA-256");
  required(media.byteLength, (v) => Number.isSafeInteger(v) && v > 0, "media byte length");
  exact(media.container, "mp4", "media container");
  exact(media.audio, "none", "producer-reported media audio");
  const auth = record(manifest.authority, [
    "creativeRelation", "renderAuthority", "consumerAudioAuthority",
  ], "Exchange authority");
  exact(auth.creativeRelation, "artist-proposed", "creative authority");
  exact(auth.renderAuthority, "none", "renderer authority");
  exact(auth.consumerAudioAuthority, "none", "consumer audio authority");
  return manifest;
}

function validateProducerReceipt(receipt, manifest) {
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) {
    throw new TypeError("Producer receipt must be an object.");
  }
  const producer = manifest.producer;
  const expected = {
    schema: "haunted-blender/alchemy-receipt/v1",
    status: "scoped_complete",
    snapshot_sha256: producer.snapshotSha256,
    recipe_id: producer.recipeId,
    relation: producer.relation,
    evidence_class: producer.evidenceClass,
    adapter: producer.adapter,
    output_sha256: manifest.media.sha256,
  };
  for (const [key, value] of Object.entries(expected)) {
    exact(receipt[key], value, "producer receipt " + key);
  }
  required(receipt.segments, (v) => Array.isArray(v), "producer receipt segments");
  const expectedSegments = producer.orderedSources.map((item) => ({
    role: item.role,
    asset_id: item.assetId,
    rendered_sha256: item.renderedSha256,
  }));
  if (receipt.segments.length !== expectedSegments.length || receipt.segments.some((segment, index) => {
    if (!segment || typeof segment !== "object" || Array.isArray(segment)) return true;
    const expected = expectedSegments[index];
    return Object.keys(segment).sort().join("|") !== Object.keys(expected).sort().join("|")
      || Object.keys(expected).some((key) => segment[key] !== expected[key]);
  })) {
    throw new TypeError("Producer receipt segment ancestry mismatch.");
  }
}

async function readEvidence(filePath, label) {
  const stat = await fs.stat(filePath);
  if (!stat.isFile() || stat.size < 1 || stat.size > MAX_EVIDENCE_BYTES) {
    throw new RangeError(label + " must be a nonempty local JSON file under 1 MiB.");
  }
  const bytes = await fs.readFile(filePath);
  if (bytes.length < 1 || bytes.length > MAX_EVIDENCE_BYTES) {
    throw new RangeError(label + " size changed or exceeds the 1 MiB bound.");
  }
  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new TypeError(label + " must be valid UTF-8 JSON.");
  }
  return { bytes, value, sha256: digest(bytes) };
}

async function writeImmutable(filePath, bytes) {
  try {
    await fs.writeFile(filePath, bytes, { flag: "wx" });
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
    const existing = await fs.readFile(filePath);
    if (!existing.equals(bytes)) throw new Error("Pantry exchange archive collision or corruption.");
  }
}

async function importBlenderExchange({
  rootDir, manifestPath, producerReceiptPath, videoPath,
  catalogPath = null, admitVideoImpl = admitVideo, hashFileImpl = hashFile,
} = {}) {
  if (!rootDir || !manifestPath || !producerReceiptPath || !videoPath) {
    throw new TypeError("Toaster home, manifest, producer receipt and explicit video path are required.");
  }
  if (path.extname(videoPath).toLowerCase() !== ".mp4") {
    throw new TypeError("Blender Pantry Exchange v1 accepts an explicit MP4 file.");
  }
  const manifestEvidence = await readEvidence(manifestPath, "Exchange manifest");
  const manifest = validateManifest(manifestEvidence.value);
  const receiptEvidence = await readEvidence(producerReceiptPath, "Producer receipt");
  if (receiptEvidence.sha256 !== manifest.producer.receiptSha256) {
    throw new TypeError("Producer receipt bytes do not match exchange manifest.");
  }
  validateProducerReceipt(receiptEvidence.value, manifest);
  const observedMedia = await hashFileImpl(videoPath);
  if (
    observedMedia.sha256 !== manifest.media.sha256
    || observedMedia.byteLength !== manifest.media.byteLength
  ) {
    throw new TypeError("Imported video bytes do not match Blender export evidence.");
  }

  const home = path.resolve(rootDir);
  const destinationCatalog = catalogPath || videoPantryCatalogPath(home);
  const admitted = await admitVideoImpl(videoPath, {
    catalogPath: destinationCatalog, persist: true,
  });
  if (
    admitted.binding.sourceSha256 !== manifest.media.sha256
    || admitted.binding.byteLength !== manifest.media.byteLength
    || admitted.binding.persisted !== true
  ) {
    throw new Error("VSPantry admission differs from independently checked exchange media.");
  }

  const exchangeDir = path.join(home, "VSPantry", "exchanges", "v1", manifestEvidence.sha256);
  await fs.mkdir(exchangeDir, { recursive: true });
  await writeImmutable(path.join(exchangeDir, "manifest.json"), manifestEvidence.bytes);
  await writeImmutable(path.join(exchangeDir, "producer-receipt.json"), receiptEvidence.bytes);
  const entry = {
    schema: ENTRY_SCHEMA,
    manifestSha256: manifestEvidence.sha256,
    producerReceiptSha256: receiptEvidence.sha256,
    specimenId: admitted.binding.specimenId,
    videoSha256: admitted.binding.sourceSha256,
    videoByteLength: admitted.binding.byteLength,
    producerRecipeId: manifest.producer.recipeId,
    producerSnapshotSha256: manifest.producer.snapshotSha256,
    producerRelation: manifest.producer.relation,
    relationEvidenceClass: "artist_proposed",
    sourceByteVerification: "producer-claimed-not-consumer-verified",
    producerReceiptConsistency: "checked-not-authenticated",
    renderAuthority: "none",
    soundAuthority: "none",
    status: "catalogued-for-proposal",
  };
  await writeImmutable(
    path.join(exchangeDir, "entry.json"),
    Buffer.from(JSON.stringify(entry, null, 2) + "\n", "utf8"),
  );

  // The prepared composition remains a proposal, not an accepted Toaster render plan.
  const proposal = createRecipe({
    ingredients: [{ slot: "blender-clip", kind: "video-specimen", specimenId: admitted.binding.specimenId }],
    composition: {
      operatorId: "video-digestion/v1",
      parameters: {
        proposedDigestOperatorId: "clip-luma-texture-v1",
        exchangeManifestSha256: manifestEvidence.sha256,
      },
    },
  });
  const prepared = await admitRecipe({
    rootDir: home, catalogPath: destinationCatalog, recipe: proposal,
  });
  return {
    specimenId: admitted.binding.specimenId,
    binding: admitted.binding,
    exchange: entry,
    exchangeEntryPath: path.join(exchangeDir, "entry.json"),
    proposalRecipeId: prepared.recipe.recipeId,
    proposedDigestOperatorId: "clip-luma-texture-v1",
    rendererAuthorityGranted: false,
  };
}

module.exports = {
  EXCHANGE_SCHEMA,
  ENTRY_SCHEMA,
  importBlenderExchange,
  validateManifest,
  validateProducerReceipt,
};
