const {
  deepFreeze,
  hashCanonical,
} = require("./canonical.cjs");
const {
  ORDINARY_TOPOLOGY_PARAMETERS,
  boundedOpportunityWindow,
  opportunityCount,
} = require("./ordinary-topology-activity.cjs");

const POST_WALK_AXIS_GRAMMAR_SCHEMA = "haunted-toaster/post-walk-axis-grammar/v1";
const POST_WALK_AXIS_GRAMMAR_POLICY = "post-walk-axis-grammar-v1";
const POST_WALK_AXIS_RECIPE_SCHEMA = "haunted-toaster/post-walk-axis-recipe/v1";
const POST_WALK_AXIS_RECIPE_POLICY = "post-walk-axis-recipe-v1";
const POST_WALK_AXIS_RECIPE_HASH_DOMAIN = "HauntedToaster-PostWalkAxisRecipe-v1";

const FOUNDING_SEND = deepFreeze({
  lane: "raw-energy-envelope",
  target: "topology",
  gain: 0.72,
  resolution: 0.72,
  smoothing: 0.24,
});

const POST_WALK_AXIS_RECIPES = deepFreeze([
  { response: "follow", scope: "whole", consequence: "clean-return" },
  { response: "oppose", scope: "whole", consequence: "residue" },
  { response: "accent", scope: "grab", consequence: "clean-return" },
  { response: "follow", scope: "grab", consequence: "residue" },
  { response: "oppose", scope: "grab", consequence: "clean-return" },
  { response: "accent", scope: "whole", consequence: "residue" },
]);

function safeCandidateIndex(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value >= POST_WALK_AXIS_RECIPES.length) {
    throw new TypeError("Post-WALK axis recipe candidateIndex must be an integer from 0 through 5.");
  }
  return value;
}

function buildPostWalkAxisRecipe(candidateIndex) {
  const index = safeCandidateIndex(candidateIndex);
  const recipe = POST_WALK_AXIS_RECIPES[index];
  const core = {
    schema: POST_WALK_AXIS_RECIPE_SCHEMA,
    policyVersion: POST_WALK_AXIS_RECIPE_POLICY,
    candidateIndex: index,
    response: recipe.response,
    scope: recipe.scope,
    consequence: recipe.consequence,
    send: structuredClone(FOUNDING_SEND),
  };
  return deepFreeze({
    ...core,
    recipeHash: hashCanonical(core, POST_WALK_AXIS_RECIPE_HASH_DOMAIN),
  });
}

function assertAddressedRecipe(recipe) {
  if (!recipe || typeof recipe !== "object" || Array.isArray(recipe)) {
    throw new TypeError("Post-WALK axis recipe must be an addressed recipe object.");
  }
  if (
    recipe.schema !== POST_WALK_AXIS_RECIPE_SCHEMA ||
    recipe.policyVersion !== POST_WALK_AXIS_RECIPE_POLICY ||
    typeof recipe.recipeHash !== "string"
  ) {
    throw new TypeError("Post-WALK axis recipe identity is invalid.");
  }
  const expected = buildPostWalkAxisRecipe(recipe.candidateIndex);
  if (expected.recipeHash !== recipe.recipeHash) {
    throw new TypeError("Post-WALK axis recipe hash does not match its canonical recipe.");
  }
  return expected;
}

function consequenceParameters(consequence) {
  if (consequence === "clean-return") {
    return {
      ...structuredClone(ORDINARY_TOPOLOGY_PARAMETERS.grab),
      recoil: 1,
      residualVectorX: 0,
      residualVectorY: 0,
      residualStretch: 0,
    };
  }
  if (consequence === "residue") {
    return {
      ...structuredClone(ORDINARY_TOPOLOGY_PARAMETERS.grab),
      recoil: 0.35,
      residualVectorX: 0.08,
      residualVectorY: -0.04,
      residualStretch: 0.06,
    };
  }
  throw new TypeError(`Unknown Post-WALK consequence: ${String(consequence)}.`);
}

function buildAxisGrabRequest({ timeline, rootSeed, slotIndex, recipe } = {}) {
  if (!timeline || typeof timeline !== "object" || Array.isArray(timeline)) {
    throw new TypeError("Post-WALK axis GRAB requires a ResolvedTimeline.");
  }
  if (!Number.isSafeInteger(slotIndex) || slotIndex < 0) {
    throw new TypeError("Post-WALK axis GRAB slotIndex must be a non-negative safe integer.");
  }
  const addressedRecipe = assertAddressedRecipe(recipe);
  const count = opportunityCount(timeline);
  let selected = null;
  let selectedOpportunityIndex = null;
  for (let opportunityIndex = 0; opportunityIndex < count; opportunityIndex += 1) {
    const window = boundedOpportunityWindow(timeline, {
      rootSeed,
      slotIndex,
      opportunityIndex,
    });
    if (!window) continue;
    selected = window;
    selectedOpportunityIndex = opportunityIndex;
    break;
  }

  if (!selected) {
    return deepFreeze({
      ok: false,
      refusal: {
        reason: "no-lawful-axis-event-window",
        recipeHash: addressedRecipe.recipeHash,
      },
    });
  }

  return deepFreeze({
    ok: true,
    request: {
      id: `axis-grab-${slotIndex}-${addressedRecipe.recipeHash.slice(0, 12)}`,
      kind: "grab",
      ...structuredClone(selected),
      parameters: consequenceParameters(addressedRecipe.consequence),
      evidenceRefs: [
        `policy:${POST_WALK_AXIS_GRAMMAR_POLICY}`,
        `axis-recipe:${addressedRecipe.recipeHash}`,
        `opportunity:${selectedOpportunityIndex}`,
      ],
    },
  });
}

module.exports = {
  FOUNDING_SEND,
  POST_WALK_AXIS_GRAMMAR_POLICY,
  POST_WALK_AXIS_GRAMMAR_SCHEMA,
  POST_WALK_AXIS_RECIPES,
  POST_WALK_AXIS_RECIPE_POLICY,
  POST_WALK_AXIS_RECIPE_SCHEMA,
  buildAxisGrabRequest,
  buildPostWalkAxisRecipe,
};
