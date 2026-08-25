const {
  createOrderedEnvelope,
  pushOrderedEnvelope,
} = require("./ordered-envelope.cjs");

function requireRecipeValue(recipe, key) {
  const value = recipe?.[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`post-walk axis envelope requires recipe.${key}`);
  }
  return value;
}

function witnessPostWalkAxisRecipe(recipe) {
  if (!recipe || typeof recipe !== "object" || Array.isArray(recipe)) {
    throw new TypeError("post-walk axis envelope requires an addressed recipe object");
  }
  if (typeof recipe.recipeHash !== "string" || recipe.recipeHash.length === 0) {
    throw new TypeError("post-walk axis envelope requires recipe.recipeHash");
  }

  const response = requireRecipeValue(recipe, "response");
  const scope = requireRecipeValue(recipe, "scope");
  const consequence = requireRecipeValue(recipe, "consequence");

  let envelope = createOrderedEnvelope(".");
  envelope = pushOrderedEnvelope(envelope, `R:${response}|`);
  envelope = pushOrderedEnvelope(envelope, `S:${scope}|`);
  envelope = pushOrderedEnvelope(envelope, `C:${consequence}|`);
  return envelope;
}

module.exports = {
  witnessPostWalkAxisRecipe,
};
