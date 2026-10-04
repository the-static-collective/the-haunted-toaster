# TOASTER-PANTRY-001 — recursive composition recipes

Status: bounded, local-first implementation on the existing Video/VSPantry and receipt-archive surfaces. This is **not** an alternative video renderer, a second pantry catalogue, an accepted timeline, or an AgentBroko dependency.

## Implemented seam

The existing VSPantry admits and identifies local MP4/WebM specimens; the existing receipt archive indexes witnessed successful renders. This slice adds immutable composition **proposal** manifests under the same Toaster home:

    TOASTER_HOME/VSPantry/recipes/v1/<sha256>.json

A recipe holds 1–16 **ordered** named ingredient slots. Supported ingredient kinds:

- video-specimen: exact identity already admitted into the existing VSPantry catalogue;
- archived-render: exact SHA-256 identity of an entry in the existing successful-render receipt archive;
- recipe: exact identity of an already-stored Pantry composition recipe.

It declares one versioned operator ID and a bounded canonical JSON parameter object. Operator IDs describe *proposed* composition; their presence **does not assert that any renderer implements them**. Neither accepted VisualScore/ResolvedTimeline nor output receipt is changed by declaring a Pantry recipe.

Recipe identity is a domain-separated hash over canonical schema, ingredient order, operator ID, parameters and proposal-only authority. Source filename, path, clock and import order do not enter identity. Missing catalogue, receipt or child references refuse admission; corrupt or mismatched stored recipes refuse on read. A recipe can be an ingredient of another recipe; traversal is bounded and detects cycles. Re-saving identical content is idempotent.

## Executable library seam

After an existing VSPantry video admission, an application-side Node consumer can do:

    const { createRecipe, admitRecipe, inspectRecipe } =
      require("./src/video-pantry/composition-recipes.cjs");
    const { resolveToasterHome } = require("./src/toaster-home.cjs");
    const rootDir = resolveToasterHome();
    const first = createRecipe({
      ingredients: [{ slot: "source", kind: "video-specimen", specimenId: admittedVideo.specimenId }],
      composition: { operatorId: "frame-layer/v1", parameters: { strength: 0.5 } },
    });
    await admitRecipe({ rootDir, recipe: first });
    const next = createRecipe({
      ingredients: [{ slot: "earlier-work", kind: "recipe", recipeId: first.recipeId }],
      composition: { operatorId: "revisit/v1", parameters: {} },
    });
    await admitRecipe({ rootDir, recipe: next });
    const ancestry = await inspectRecipe({ rootDir, recipe: next });

The example operator IDs are illustrative *proposal vocabulary*, NOT executable video effects. This library is intentionally not exposed through ordinary UI or renderer IPC in this slice.

## Truth boundaries

1. A catalogue reference proves admission of the identity, **not** that source media still exists or matches its historical hash. The returned bytesVerified: false makes this explicit. A later replay gate must rehash and probe source bytes.
2. A successful-render receipt may remain archived after its output video disappears. videoAvailable reports that separately. Historical render evidence is not the same as reusable video bytes.
3. A recipe is not evidence that its declared operator ran. A render is not a dish produced by that recipe until accepted execution and its receipt bind the recipe identity and concrete input/materialization witness.
4. Nested recipes preserve their child's identity/ancestry; they do not silently expand into, override or mutate an accepted timeline.
5. Existing historical scores, candidate Stage A recipes, renderer profiles, video ingestion, audio master, UI, preview/production behavior and sidecar receipts are unaffected.
6. AgentBroko can become an **optional** offline renderer/postproduction adapter only through a separately authorized and verified execution path.

## Next executable work

- Materialization gate: verify actual source bytes, report repairable missing paths and distinguish archived output from usable verified media.
- Render binding: resolve one selected, admitted recipe through existing accepted score/timeline and shared preview/production plan without claiming unsupported operators.
- Cook receipt: bind output hash, accepted recipe identity, material hashes, timeline/policy/renderer identities and witnessed success; speculative proposals never count as rendered dishes.
- Re-ingest the finished dish: admit the actual output video to existing VSPantry using its content identity, retain attributable recipe/receipt lineage, then compose again.
- Add image, audio and generative ingredients under explicit admission/provenance; add UI after it has an honest capability and materialization model.
- Optional AgentBroko adapter: validate tool/input availability, explicitly bind its chosen plan, render locally, inspect the result and retain the receipt.

## Proof and scope

Run:

    node --test src/full-measure/tests/video-pantry-composition-recipes.test.cjs
    npm --prefix src/full-measure test
    npm run verify

Focused tests cover canonical identity and order, idempotent persistence, nested ancestry, archived output availability, missing reference refusal, and tamper/invalid identity refusal.

UI impact: none
Browser witness: not required for this data-library-only slice
Visual delta: none
Packaged witness required: no (no UI, preload, IPC, native dialog or production render change)
GitBook ontology changed: no; this repository-owned note does not promote new doctrine.
