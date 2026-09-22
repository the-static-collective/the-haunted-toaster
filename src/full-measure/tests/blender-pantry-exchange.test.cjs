const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { admitVideo } = require("../src/video-pantry/admit.cjs");
const { loadCatalog } = require("../src/video-pantry/catalog.cjs");
const { readRecipe } = require("../src/video-pantry/composition-recipes.cjs");
const { importBlenderExchange } = require("../src/video-pantry/blender-exchange.cjs");

const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const sourceHash = sha("synthetic source image");
const frameHash = sha("synthetic rendered image");
const receiptBase = {
  schema: "haunted-blender/alchemy-receipt/v1",
  status: "scoped_complete",
  snapshot_sha256: sha("frozen Blender snapshot"),
  recipe_id: "alchemy-" + "a".repeat(16),
  relation: "shape-echo",
  evidence_class: "artist_proposed",
  adapter: "ffmpeg-alchemy-crossfade/v1",
  segments: [
    { asset_id: "asset-" + "1".repeat(24), rendered_sha256: frameHash, role: "source" },
    { asset_id: "asset-" + "2".repeat(24), rendered_sha256: frameHash, role: "target" },
  ],
};
const probeVideoImpl = async () => ({
  durationSeconds: 4, width: 320, height: 180, frameRate: "24/1",
  container: "mov,mp4,m4a,3gp,3g2,mj2", codec: "h264", hasAudio: false,
});
const admission = (file, opts) => admitVideo(file, { ...opts, probeVideoImpl });

async function fixture() {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "toaster-blender-exchange-"));
  const videoPath = path.join(rootDir, "alchemy-preview.mp4");
  const manifestPath = path.join(rootDir, "alchemy.exchange.json");
  const producerReceiptPath = path.join(rootDir, "alchemy.mp4.receipt.json");
  const video = Buffer.from("synthetic MP4 bytes; validation requires ffprobe in production");
  await fs.writeFile(videoPath, video);
  const receipt = { ...receiptBase, output_path: "/the/blender/source/preview.mp4", output_sha256: sha(video) };
  const receiptBytes = Buffer.from(JSON.stringify(receipt) + "\n");
  await fs.writeFile(producerReceiptPath, receiptBytes);
  const manifest = {
    schema: "static-collective/pantry-exchange/v1",
    producer: {
      app: "haunted-blender",
      kind: "alchemy-crossfade",
      recipeId: receipt.recipe_id,
      snapshotSha256: receipt.snapshot_sha256,
      receiptSha256: sha(receiptBytes),
      adapter: receipt.adapter,
      relation: receipt.relation,
      evidenceClass: receipt.evidence_class,
      orderedSources: receipt.segments.map((segment) => ({
        role: segment.role, assetId: segment.asset_id,
        sourceSha256: sourceHash, renderedSha256: segment.rendered_sha256,
      })),
    },
    media: { sha256: sha(video), byteLength: video.length, container: "mp4", audio: "none" },
    authority: {
      creativeRelation: "artist-proposed", renderAuthority: "none", consumerAudioAuthority: "none",
    },
  };
  await fs.writeFile(manifestPath, JSON.stringify(manifest) + "\n");
  return { rootDir, manifestPath, producerReceiptPath, videoPath, manifest, receipt, video };
}

function options(f) {
  return {
    rootDir: f.rootDir, manifestPath: f.manifestPath,
    producerReceiptPath: f.producerReceiptPath, videoPath: f.videoPath,
    admitVideoImpl: admission,
  };
}

test("Blender manifest reaches existing VSPantry with honest lineage and recursive proposal", async () => {
  const f = await fixture();
  const first = await importBlenderExchange(options(f));
  const again = await importBlenderExchange(options(f));
  assert.equal(first.specimenId, again.specimenId);
  assert.equal(first.proposalRecipeId, again.proposalRecipeId);
  assert.equal(first.exchange.manifestSha256, sha(await fs.readFile(f.manifestPath)));
  assert.equal(first.exchange.producerReceiptSha256, sha(await fs.readFile(f.producerReceiptPath)));
  assert.equal(first.exchange.sourceByteVerification, "producer-claimed-not-consumer-verified");
  assert.equal(first.exchange.renderAuthority, "none");
  assert.equal(first.rendererAuthorityGranted, false);
  const catalog = await loadCatalog(path.join(f.rootDir, "VSPantry", "catalog", "video-pantry.v1.json"));
  assert.equal(catalog.specimens.length, 1);
  const recipe = await readRecipe({ rootDir: f.rootDir, recipeId: first.proposalRecipeId });
  assert.equal(recipe.ingredients[0].specimenId, first.specimenId);
  assert.equal(recipe.composition.parameters.exchangeManifestSha256, first.exchange.manifestSha256);
  assert.equal(recipe.composition.parameters.proposedDigestOperatorId, "clip-luma-texture-v1");
  assert.equal(recipe.authority, "proposal-only");
  assert.deepEqual(JSON.parse(await fs.readFile(first.exchangeEntryPath, "utf8")), first.exchange);
});

test("mismatched MP4 bytes refuse without admitting or archiving false lineage", async () => {
  const f = await fixture();
  await fs.appendFile(f.videoPath, "tampered");
  await assert.rejects(importBlenderExchange(options(f)), /video bytes do not match/i);
  await assert.rejects(fs.stat(path.join(f.rootDir, "VSPantry", "catalog", "video-pantry.v1.json")), /ENOENT/);
});

test("different producer receipt bytes refuse before Pantry mutation", async () => {
  const f = await fixture();
  await fs.appendFile(f.producerReceiptPath, " ");
  await assert.rejects(importBlenderExchange(options(f)), /receipt bytes do not match/i);
  await assert.rejects(fs.stat(path.join(f.rootDir, "VSPantry", "catalog", "video-pantry.v1.json")), /ENOENT/);
});

test("forged receipt ancestry refuses even when its changed hash is copied into manifest", async () => {
  const f = await fixture();
  const receipt = { ...f.receipt, segments: f.receipt.segments.map((s) => ({ ...s })) };
  receipt.segments[0].asset_id = "asset-" + "f".repeat(24);
  const receiptBytes = Buffer.from(JSON.stringify(receipt) + "\n");
  await fs.writeFile(f.producerReceiptPath, receiptBytes);
  f.manifest.producer.receiptSha256 = sha(receiptBytes);
  await fs.writeFile(f.manifestPath, JSON.stringify(f.manifest) + "\n");
  await assert.rejects(importBlenderExchange(options(f)), /segment ancestry mismatch/i);
});

test("injected renderer authority and incomplete Blender receipt refuse", async () => {
  const f = await fixture();
  f.manifest.authority.renderAuthority = "accepted";
  await fs.writeFile(f.manifestPath, JSON.stringify(f.manifest) + "\n");
  await assert.rejects(importBlenderExchange(options(f)), /renderer authority/i);

  f.manifest.authority.renderAuthority = "none";
  const incomplete = { ...f.receipt, status: "attempted" };
  const bytes = Buffer.from(JSON.stringify(incomplete) + "\n");
  await fs.writeFile(f.producerReceiptPath, bytes);
  f.manifest.producer.receiptSha256 = sha(bytes);
  await fs.writeFile(f.manifestPath, JSON.stringify(f.manifest) + "\n");
  await assert.rejects(importBlenderExchange(options(f)), /producer receipt status/i);
});

test("missing original receipt refuses without fabricating provenance", async () => {
  const f = await fixture();
  await fs.unlink(f.producerReceiptPath);
  await assert.rejects(importBlenderExchange(options(f)), /ENOENT/);
});

test("changed archived exchange cannot be rewritten by an identical reimport", async () => {
  const f = await fixture();
  const first = await importBlenderExchange(options(f));
  await fs.writeFile(first.exchangeEntryPath, "forged archive");
  await assert.rejects(importBlenderExchange(options(f)), /archive collision or corruption/i);
});
