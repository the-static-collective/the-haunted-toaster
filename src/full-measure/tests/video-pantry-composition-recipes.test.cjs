const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { canonicalSpecimenId } = require("../src/video-pantry/schema.cjs");
const { saveCatalog, emptyCatalog, upsertSpecimen } = require("../src/video-pantry/catalog.cjs");
const { videoPantryCatalogPath } = require("../src/toaster-home.cjs");
const { archiveSuccessfulRender } = require("../src/memory/receipt-archive.cjs");
const {
  admitRecipe,
  createRecipe,
  inspectRecipe,
  readRecipe,
  recipePath,
  validateRecipe,
} = require("../src/video-pantry/composition-recipes.cjs");

const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const specimenId = canonicalSpecimenId({ sha256: hash("visual ingredient"), byteLength: 17 });

async function setup() {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "toaster-recipes-"));
  const catalogPath = videoPantryCatalogPath(rootDir);
  let catalog = emptyCatalog();
  ({ catalog } = upsertSpecimen(catalog, {
    specimenId,
    sourceSha256: hash("visual ingredient"),
    byteLength: 17,
    paths: [path.join(rootDir, "visual.mp4")],
  }));
  await saveCatalog(catalogPath, catalog);
  return { rootDir, catalogPath };
}

function baseRecipe() {
  return createRecipe({
    ingredients: [{ slot: "visual", kind: "video-specimen", specimenId }],
    composition: { operatorId: "frame-layer/v1", parameters: { strength: 0.5, mode: "overlay" } },
  });
}

test("a recipe is canonical, deterministic, and distinctly proposal-only", () => {
  const first = baseRecipe();
  const equivalent = createRecipe({
    ingredients: [{ kind: "video-specimen", specimenId, slot: "visual" }],
    composition: { parameters: { mode: "overlay", strength: 0.5 }, operatorId: "frame-layer/v1" },
  });
  assert.deepEqual(first, equivalent);
  assert.equal(first.authority, "proposal-only");
  assert.equal(validateRecipe(first).recipeId, first.recipeId);
  assert.equal(Object.isFrozen(first.ingredients[0]), true);
  assert.notEqual(createRecipe({
    ingredients: [{ slot: "visual", kind: "video-specimen", specimenId }],
    composition: { operatorId: "frame-layer/v1", parameters: { strength: 0.6, mode: "overlay" } },
  }).recipeId, first.recipeId);
});

test("ingredient ordering is preserved as composition meaning, not sorted away", () => {
  const one = { slot: "first", kind: "video-specimen", specimenId };
  const two = { slot: "second", kind: "video-specimen", specimenId };
  const make = (ingredients) => createRecipe({
    ingredients,
    composition: { operatorId: "sequence/v1", parameters: {} },
  });
  assert.notEqual(make([one, two]).recipeId, make([two, one]).recipeId);
  assert.throws(() => make([one, { ...two, slot: "first" }]), /unique/);
});

test("admission is immutable and idempotent on the existing VSPantry home", async () => {
  const f = await setup();
  const recipe = baseRecipe();
  const first = await admitRecipe({ ...f, recipe });
  const second = await admitRecipe({ ...f, recipe });
  assert.equal(first.inserted, true);
  assert.equal(second.inserted, false);
  assert.deepEqual(await readRecipe({ rootDir: f.rootDir, recipeId: recipe.recipeId }), recipe);
  assert.equal(first.dependencies.ingredients[0].bytesVerified, false);
  assert.equal(first.dependencies.grantsRendererAuthority, false);
});

test("a saved recipe can be a child ingredient while its original specimen stays attributable", async () => {
  const f = await setup();
  const inner = baseRecipe();
  await admitRecipe({ ...f, recipe: inner });
  const outer = createRecipe({
    ingredients: [
      { slot: "prepared", kind: "recipe", recipeId: inner.recipeId },
      { slot: "new-material", kind: "video-specimen", specimenId },
    ],
    composition: { operatorId: "nested-composition/v1", parameters: { passes: 2 } },
  });
  const admitted = await admitRecipe({ ...f, recipe: outer });
  const nested = admitted.dependencies.ingredients[0];
  assert.equal(nested.evidence, "stored-recipe");
  assert.equal(nested.descendants[0].specimenId, specimenId);
  assert.equal(nested.descendants[0].bytesVerified, false);
  assert.equal(admitted.dependencies.ingredients[1].specimenId, specimenId);
});

test("a recipe can refer to a witnessed render without inventing its video availability", async () => {
  const f = await setup();
  const outputPath = path.join(f.rootDir, "done.mp4");
  const receiptPath = path.join(f.rootDir, "done.video-receipt.json");
  await fs.writeFile(outputPath, "rendered-media");
  await fs.writeFile(receiptPath, JSON.stringify({
    schema: "full-measure.video-receipt.v1",
    createdAt: "2026-09-22T00:00:00Z",
    validation: { accepted: true },
    output: { filename: "done.mp4", sha256: hash("rendered-media"), sizeBytes: 14 },
  }));
  const archived = await archiveSuccessfulRender({
    rootDir: f.rootDir, renderResult: { receiptPath, outputPath },
  });
  const recipe = createRecipe({
    ingredients: [{ slot: "returning-dish", kind: "archived-render", receiptSha256: archived.receiptSha256 }],
    composition: { operatorId: "revisit/v1", parameters: {} },
  });
  const admitted = await admitRecipe({ ...f, recipe });
  assert.equal(admitted.dependencies.ingredients[0].videoAvailable, true);
  await fs.unlink(outputPath);
  assert.equal((await inspectRecipe({ ...f, recipe })).ingredients[0].videoAvailable, false);
});

test("missing or unadmitted ingredients refuse before writing a recipe", async () => {
  const f = await setup();
  const unknownSpecimen = canonicalSpecimenId({ sha256: "a".repeat(64), byteLength: 3 });
  const unknown = createRecipe({
    ingredients: [{ slot: "missing", kind: "video-specimen", specimenId: unknownSpecimen }],
    composition: { operatorId: "sequence/v1", parameters: {} },
  });
  await assert.rejects(admitRecipe({ ...f, recipe: unknown }), /unadmitted/);
  await assert.rejects(fs.stat(recipePath(f.rootDir, unknown.recipeId)), /ENOENT/);
  const missingChild = createRecipe({
    ingredients: [{ slot: "missing", kind: "recipe", recipeId: "pantry-recipe:" + "a".repeat(64) }],
    composition: { operatorId: "sequence/v1", parameters: {} },
  });
  await assert.rejects(admitRecipe({ ...f, recipe: missingChild }), /ENOENT/);
});

test("tampering, ambiguous input identities, and unversioned operators fail closed", async () => {
  const f = await setup();
  const recipe = baseRecipe();
  await admitRecipe({ ...f, recipe });
  const file = recipePath(f.rootDir, recipe.recipeId);
  await fs.writeFile(file, JSON.stringify({ ...recipe, composition: { ...recipe.composition, operatorId: "different/v1" } }));
  await assert.rejects(readRecipe({ rootDir: f.rootDir, recipeId: recipe.recipeId }), /mismatch/);
  assert.throws(() => createRecipe({
    ingredients: [{ slot: "bad", kind: "video-specimen", specimenId: "sha256:" + "f".repeat(64) + ":0007" }],
    composition: { operatorId: "sequence/v1" },
  }), /canonical/);
  assert.throws(() => createRecipe({
    ingredients: [{ slot: "good", kind: "video-specimen", specimenId }],
    composition: { operatorId: "sequence" },
  }), /Versioned/);
});
