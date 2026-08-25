const {
  canonicalStringify,
  deepFreeze,
  hashCanonical,
} = require("./canonical.cjs");
const {
  MIX_PLAN_POLICY_V2,
  bindMixPlanToTimeline,
  buildMixPlanFromRequests,
} = require("./l-branch.cjs");
const {
  ORDINARY_TOPOLOGY_PARAMETERS,
  boundedOpportunityWindow,
  opportunityCount,
} = require("./ordinary-topology-activity.cjs");
const {
  resolveTopologyEvents,
} = require("./topology-events.cjs");

const POST_WALK_AXIS_GRAMMAR_SCHEMA = "haunted-toaster/post-walk-axis-grammar/v1";
const POST_WALK_AXIS_GRAMMAR_POLICY = "post-walk-axis-grammar-v1";
const POST_WALK_AXIS_RECIPE_SCHEMA = "haunted-toaster/post-walk-axis-recipe/v1";
const POST_WALK_AXIS_RECIPE_POLICY = "post-walk-axis-recipe-v1";
const POST_WALK_AXIS_RECIPE_HASH_DOMAIN = "HauntedToaster-PostWalkAxisRecipe-v1";
const POST_WALK_AXIS_TIMELINE_SCHEMA = "haunted-toaster/post-walk-axis-timeline/v1";
const POST_WALK_AXIS_TIMELINE_POLICY = "post-walk-axis-timeline-v1";
const RESOLVED_TIMELINE_HASH_DOMAIN = "HauntedToaster-ResolvedTimeline-v1";

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

function bindPostWalkAxisToTimeline(timeline, recipe, acceptedTopologyTimeline) {
  const {
    timelineHash: _timelineHash,
    canonicalJson: _canonicalJson,
    postWalkAxis: _postWalkAxis,
    ...baseBody
  } = timeline;
  const postWalkAxis = {
    schema: POST_WALK_AXIS_TIMELINE_SCHEMA,
    policyVersion: POST_WALK_AXIS_TIMELINE_POLICY,
    recipeHash: recipe.recipeHash,
    candidateIndex: recipe.candidateIndex,
    topologyPlanSha256: acceptedTopologyTimeline.topologyEvents.planSha256,
    mixPlanHash: timeline.lBranch.mixPlan.planHash,
    mixExecutionHash: timeline.lBranch.execution.executionHash,
  };
  const body = {
    ...structuredClone(baseBody),
    postWalkAxis,
  };
  return deepFreeze({
    ...body,
    timelineHash: hashCanonical(body, RESOLVED_TIMELINE_HASH_DOMAIN),
    canonicalJson: canonicalStringify(body),
  });
}

function composePostWalkAxisRecipe({
  family,
  candidate,
  authority,
  laneBank,
  recipe,
  rootSeed,
  slotIndex,
} = {}) {
  if (!family?.candidates?.length) {
    throw new TypeError("Post-WALK axis composition requires a CandidateFamily.");
  }
  if (!candidate?.timeline || typeof candidate.timelineHash !== "string") {
    throw new TypeError("Post-WALK axis composition requires an accepted candidate timeline.");
  }
  if (family.candidates[candidate.index]?.timelineHash !== candidate.timelineHash) {
    throw new TypeError("Post-WALK axis candidate does not belong to the supplied family.");
  }
  const addressedRecipe = assertAddressedRecipe(recipe);
  const grab = buildAxisGrabRequest({
    timeline: candidate.timeline,
    rootSeed,
    slotIndex,
    recipe: addressedRecipe,
  });
  if (!grab.ok) return grab;

  const acceptedTopologyTimeline = resolveTopologyEvents(candidate.timeline, {
    authority,
    events: [grab.request],
  });
  if (
    acceptedTopologyTimeline.topologyEvents?.refusal ||
    acceptedTopologyTimeline.topologyEvents?.eventCount !== 1 ||
    acceptedTopologyTimeline.topologyEvents?.events?.[0]?.kind !== "grab"
  ) {
    return deepFreeze({
      ok: false,
      refusal: {
        reason:
          acceptedTopologyTimeline.topologyEvents?.refusal?.reason ||
          "axis-topology-event-not-accepted",
        recipeHash: addressedRecipe.recipeHash,
      },
    });
  }

  const topologyCandidate = {
    ...candidate,
    timeline: acceptedTopologyTimeline,
    timelineHash: acceptedTopologyTimeline.timelineHash,
  };
  const mixPlan = buildMixPlanFromRequests({
    laneBank,
    candidate: topologyCandidate,
    strategyId: `post-walk-axis:${addressedRecipe.recipeHash}`,
    requests: [{
      ...structuredClone(addressedRecipe.send),
      response: addressedRecipe.response,
      scope: addressedRecipe.scope,
    }],
    policyVersion: MIX_PLAN_POLICY_V2,
  });
  const lBranchTimeline = bindMixPlanToTimeline(
    acceptedTopologyTimeline,
    laneBank,
    mixPlan,
  );
  const timeline = bindPostWalkAxisToTimeline(
    lBranchTimeline,
    addressedRecipe,
    acceptedTopologyTimeline,
  );

  return deepFreeze({
    ok: true,
    recipe: addressedRecipe,
    request: grab.request,
    acceptedTopologyTimeline,
    mixPlan,
    mixExecution: timeline.lBranch.execution,
    timeline,
  });
}

module.exports = {
  FOUNDING_SEND,
  POST_WALK_AXIS_GRAMMAR_POLICY,
  POST_WALK_AXIS_GRAMMAR_SCHEMA,
  POST_WALK_AXIS_RECIPES,
  POST_WALK_AXIS_RECIPE_POLICY,
  POST_WALK_AXIS_RECIPE_SCHEMA,
  POST_WALK_AXIS_TIMELINE_POLICY,
  POST_WALK_AXIS_TIMELINE_SCHEMA,
  buildAxisGrabRequest,
  buildPostWalkAxisRecipe,
  composePostWalkAxisRecipe,
};
