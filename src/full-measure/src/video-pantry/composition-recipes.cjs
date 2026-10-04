const fs = require("node:fs/promises");
const path = require("node:path");
const { canonicalize, canonicalStringify, deepFreeze, hashCanonical } = require("../generation/canonical.cjs");
const { readArchivedRender } = require("../memory/receipt-archive.cjs");
const { videoPantryCatalogPath } = require("../toaster-home.cjs");
const { loadCatalog } = require("./catalog.cjs");
const { canonicalSpecimenId } = require("./schema.cjs");

const RECIPE_SCHEMA = "haunted-toaster/pantry-composition-recipe/v1";
const RECIPE_HASH_DOMAIN = "HauntedToaster-PantryCompositionRecipe-v1";
const MAX_INGREDIENTS = 16;
const MAX_RECIPE_DEPTH = 8;
const RECIPE_ID_PATTERN = /^pantry-recipe:([a-f0-9]{64})$/;
const RECEIPT_ID_PATTERN = /^[a-f0-9]{64}$/;
const SLOT_PATTERN = /^[a-z][a-z0-9-]{0,39}$/;
const OPERATOR_PATTERN = /^[a-z][a-z0-9-]*\/v[1-9][0-9]*$/;

function requiredId(value, pattern, label) {
  if (typeof value !== "string" || !pattern.test(value)) {
    throw new TypeError(label + " is invalid.");
  }
  return value;
}

function normalizeIngredient(ingredient) {
  if (!ingredient || typeof ingredient !== "object" || Array.isArray(ingredient)) {
    throw new TypeError("A Pantry ingredient must be an object.");
  }
  const slot = requiredId(ingredient.slot, SLOT_PATTERN, "Ingredient slot");
  if (ingredient.kind === "video-specimen") {
    const specimenId = String(ingredient.specimenId || "");
    const match = /^sha256:([a-f0-9]{64}):([0-9]+)$/.exec(specimenId);
    if (!match || canonicalSpecimenId({ sha256: match[1], byteLength: Number(match[2]) }) !== specimenId) {
      throw new TypeError("Video ingredient must carry its canonical VSPantry specimen identity.");
    }
    return { slot, kind: "video-specimen", specimenId };
  }
  if (ingredient.kind === "recipe") {
    return { slot, kind: "recipe", recipeId: requiredId(ingredient.recipeId, RECIPE_ID_PATTERN, "Child recipe identity") };
  }
  if (ingredient.kind === "archived-render") {
    return { slot, kind: "archived-render", receiptSha256: requiredId(ingredient.receiptSha256, RECEIPT_ID_PATTERN, "Render receipt identity") };
  }
  throw new TypeError("Unsupported Pantry ingredient kind: " + String(ingredient.kind) + ".");
}

function createRecipe({ ingredients, composition } = {}) {
  if (!Array.isArray(ingredients) || ingredients.length < 1 || ingredients.length > MAX_INGREDIENTS) {
    throw new TypeError("A Pantry recipe requires 1–" + MAX_INGREDIENTS + " ordered ingredients.");
  }
  const normalizedIngredients = ingredients.map(normalizeIngredient);
  if (new Set(normalizedIngredients.map((item) => item.slot)).size !== normalizedIngredients.length) {
    throw new TypeError("Each Pantry recipe ingredient slot must be unique.");
  }
  if (!composition || typeof composition !== "object" || Array.isArray(composition)) {
    throw new TypeError("A Pantry recipe requires a composition declaration.");
  }
  const operatorId = requiredId(composition.operatorId, OPERATOR_PATTERN, "Versioned composition operator");
  const parameters = canonicalize(composition.parameters ?? {});
  if (!parameters || Array.isArray(parameters) || typeof parameters !== "object") {
    throw new TypeError("Composition parameters must be a plain JSON object.");
  }
  if (Buffer.byteLength(canonicalStringify(parameters), "utf8") > 32 * 1024) {
    throw new RangeError("Composition parameters exceed the 32 KiB limit.");
  }
  const core = {
    schema: RECIPE_SCHEMA,
    ingredients: normalizedIngredients,
    composition: { operatorId, parameters },
    authority: "proposal-only",
  };
  return deepFreeze({
    ...core,
    recipeId: "pantry-recipe:" + hashCanonical(core, RECIPE_HASH_DOMAIN),
  });
}

function validateRecipe(recipe) {
  if (!recipe || recipe.schema !== RECIPE_SCHEMA || recipe.authority !== "proposal-only") {
    throw new TypeError("Unsupported Pantry composition recipe schema or authority.");
  }
  const normalized = createRecipe(recipe);
  if (recipe.recipeId !== normalized.recipeId || canonicalStringify(recipe) !== canonicalStringify(normalized)) {
    throw new TypeError("Pantry recipe identity or canonical content mismatch.");
  }
  return normalized;
}

function recipePath(rootDir, recipeId) {
  if (!rootDir || typeof rootDir !== "string") throw new TypeError("A Toaster home is required.");
  const id = requiredId(recipeId, RECIPE_ID_PATTERN, "Pantry recipe identity");
  return path.join(path.resolve(rootDir), "VSPantry", "recipes", "v1", id.slice("pantry-recipe:".length) + ".json");
}

async function readRecipe({ rootDir, recipeId }) {
  const text = await fs.readFile(recipePath(rootDir, recipeId), "utf8");
  const recipe = validateRecipe(JSON.parse(text));
  if (recipe.recipeId !== recipeId) throw new TypeError("Stored Pantry recipe identity mismatch.");
  return recipe;
}

// Catalogue membership is evidence of admission, not proof original media bytes still exist.
// An archived render may have a retained receipt without a currently available output video.
async function inspectRecipe({ rootDir, recipe, catalogPath = null }) {
  const normalized = validateRecipe(recipe);
  const catalog = await loadCatalog(catalogPath || videoPantryCatalogPath(rootDir));
  const specimenIds = new Set(catalog.specimens.map((item) => item.specimenId));
  const active = new Set();
  let examined = 0;

  async function visit(current, depth) {
    if (depth > MAX_RECIPE_DEPTH) throw new RangeError("Pantry recipe nesting exceeds the v1 limit.");
    if (active.has(current.recipeId)) throw new TypeError("Cyclic Pantry recipe ancestry is not permitted.");
    if (++examined > 128) throw new RangeError("Pantry recipe ancestry exceeds the v1 node limit.");
    active.add(current.recipeId);
    try {
      const ingredients = [];
      for (const ingredient of current.ingredients) {
        if (ingredient.kind === "video-specimen") {
          if (!specimenIds.has(ingredient.specimenId)) {
            throw new Error("Pantry recipe references an unadmitted video specimen: " + ingredient.specimenId + ".");
          }
          ingredients.push({ ...ingredient, evidence: "catalogued", bytesVerified: false });
        } else if (ingredient.kind === "archived-render") {
          const archived = await readArchivedRender({ rootDir, receiptSha256: ingredient.receiptSha256 });
          ingredients.push({ ...ingredient, evidence: "archived-receipt", videoAvailable: archived.availability.video });
        } else {
          const child = await readRecipe({ rootDir, recipeId: ingredient.recipeId });
          ingredients.push({ ...ingredient, evidence: "stored-recipe", descendants: await visit(child, depth + 1) });
        }
      }
      return ingredients;
    } finally {
      active.delete(current.recipeId);
    }
  }

  return deepFreeze({
    schema: "haunted-toaster/pantry-recipe-dependencies/v1",
    recipeId: normalized.recipeId,
    ingredients: await visit(normalized, 0),
    grantsRendererAuthority: false,
  });
}

async function admitRecipe({ rootDir, recipe, catalogPath = null }) {
  const normalized = validateRecipe(recipe);
  const dependencies = await inspectRecipe({ rootDir, recipe: normalized, catalogPath });
  const destination = recipePath(rootDir, normalized.recipeId);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  const bytes = canonicalStringify(normalized) + "\n";
  let inserted = false;
  try {
    await fs.writeFile(destination, bytes, { encoding: "utf8", flag: "wx" });
    inserted = true;
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
    const existing = await readRecipe({ rootDir, recipeId: normalized.recipeId });
    if (canonicalStringify(existing) !== canonicalStringify(normalized)) {
      throw new Error("Immutable Pantry recipe archive collision.");
    }
  }
  return { recipe: normalized, dependencies, inserted };
}

module.exports = {
  MAX_INGREDIENTS,
  MAX_RECIPE_DEPTH,
  RECIPE_SCHEMA,
  admitRecipe,
  createRecipe,
  inspectRecipe,
  readRecipe,
  recipePath,
  validateRecipe,
};
