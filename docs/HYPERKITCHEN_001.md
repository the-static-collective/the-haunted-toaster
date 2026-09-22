# HYPERKITCHEN-001 — finite HyperFood motion → HTML projection → VSPantry

**Status: isolated developer laboratory.** Branch base: experimental Video Phrase Grammar PR #282, which already contains the renderer-independent HyperFood ABI, graph, PULSE and FRAME-EAT-FRAME trace evaluators. The Blender/Toaster exchange producer and consumer remain on distinct draft PRs #7 and #296; this branch does not merge either ancestry, modify the ordinary app/UI, or promote the Video Phrase Grammar mutant to main.

## The executable local food cycle

1. Create a completed Blender alchemical MP4 plus manifest and receipt using the existing exchange branch.
2. Import it with the existing exchange consumer CLI. This produces a VSPantry-admitted clip and an immutable exchange entry.
3. On the isolated HyperKitchen branch, invoke:

    node src/full-measure/scripts/hyperkitchen-local.cjs \
      --toaster-home /actual/path/to/toaster-home \
      --video /local/transferred/blender-clip.mp4 \
      --exchange-entry /actual/path/to/toaster-home/VSPantry/exchanges/v1/MANIFEST_SHA/entry.json \
      --duration-ms 1000 \
      --events /local/explicit-events.json

The events JSON must be an array of timed, user-supplied objects such as:

    [{"tMs":0,"strength":1},{"tMs":500,"strength":0.8}]

The explicit developer command refuses an unadmitted source path, changed source bytes, mismatched archived exchange evidence, audio-bearing source, insufficient clip duration, impossible HyperFood graph, unsupported timeline/dimensions, unbounded nesting, failed browser capture, and failed output encoding.

4. HyperKitchen creates an ordinary canonical hf0_ HyperFood specimen with a four-node graph: admitted source Surface → FRAME-EAT-FRAME@0.1.0 → PULSE@0.1.0, plus explicit EVENT-GRID. It calls the **existing** HyperFood single-organism evaluators for each absolute frame timestamp, preserving the combined graph lineage without minting new organism semantics.
5. The compiled independent projection model carries the canonical specimen ID, VSPantry source ID, frame/pulse trace, optional Blender exchange digest, exact duration/FPS and projection-only authority. It builds an HTML document with a fixed-size root, explicit data-composition-id, data-width, data-height, data-duration, and an absolute-time GSAP timeline when pinned GSAP is available. A local absolute-seek fallback is used if the CDN is intentionally blocked.
6. The local proof verifies that each source frame is extracted from the exact admitted MP4; headless Chromium captures the HTML frame at every fixed absolute sample time; FFmpeg encodes a real 320×180, 24fps, silent output. Input video bytes are rehashed before and after processing.
7. One scoped local projection receipt identifies the HyperFood specimen, trace digest, projection ID, source media and optional exchange ancestry, actual Chromium version, frame count and output digest. The resulting MP4 is admitted via the **existing** VSPantry for use as a new material specimen. A saved projection may be rerun idempotently without erasing its original receipt.

Output is preserved locally under TOASTER_HOME/HyperKitchen/projections/PROJECTION_ID/, including the canonical specimen, projection model, generated index.html, finite source frame set, screenshots, render.mp4 and render.receipt.json. No network upload of source media occurs. Chromium's external URL requests are disabled for the local proof.

## Specific limits and honesty

- This is a **HyperFrames-style HTML source/project authored for its absolute-time composition contract**, rendered in the proof by local Chromium and FFmpeg. It has **not** passed the hosted HyperFrames service's own lint, inspect or render gates; a distinct, opt-in actual HyperFrames run is needed before claiming that. The optional GSAP URL in the HTML is version-pinned, not a self-contained offline dependency; the local fallback uses the same precomputed absolute-time transform states.
- The finite FRAME-EAT-FRAME is layered nested viewports over the same source frame at the same sampled time. It does not compute a new frame from the previous rendered frame and does not claim semantic morphing, actual reflection or generative video.
- Timing/event input is explicit, not purportedly inferred from the Blender clip or an unheard song. Source-image creative relations remain attributed artist proposals, not machine-verified historical facts.
- No Toaster accepted VisualScore, ResolvedTimeline, candidate KEEP/SCRAPE, VideoPhrasePlan or audio master is readjusted. HyperKitchen's output is **new material only**, not an accepted song render.
- HyperFood specimen identity is defined upstream of projection ID and output digest; renderer environment, optional external exchange reference and target choice cannot reconstitute the semantic organism.
- This implementation uses the app's existing development Playwright dependency. It is not a packaged, user-ready GUI or a guarantee that local Chromium matches hosted HyperFrames or that rendered video bytes replay identically across machines.
- Source files are private local input. Neither personal photos nor user-owned videos, paths or receipts are committed to GitHub. The cross-repository CI uses only synthetic two-color PNG images.

## Reproducible proof

    node --test src/full-measure/tests/hyperkitchen-hyperframes.test.cjs

The dedicated workflow checks out pinned Blender PR #7 @ 42162d7 and exchange consumer PR #296 @ fccce08 **as independent source trees**, renders synthetic Blender alchemy material, transfers receipt and media, admits it to existing VSPantry, composes the two existing HyperFood organisms, captures HTML locally, encodes a new MP4, re-admits the actual output, checks exact lineage, tests idempotence and source-byte mutation refusal. It does not merge the sibling branches or publish private media.

The main Toaster workflow continues to check existing application behavior separately. A real hosted HyperFrames lint/inspect/render receipt, packaged field witness and acceptance of the multi-branch mutant remain separate future gates.

## Next supported frontier

1. Validate generated HTML with the actual HyperFrames service **only on opt-in, non-sensitive test material**, retain its own adapter/version and output receipt; compare absolute frame/transform traces against the local capture.
2. Make the Blender exchange and HyperFood branch ancestry converge through targeted re-ports after their own gates; never assume PR #282 and PR #296 were merged by this test.
3. Promote one reviewed HyperKitchen output as an ordinary Toaster ingredient through the existing candidate → accepted timeline → actual song render path; bind a cook receipt and a second-generation result. This slice already re-admits the local output, but **does not run a subsequent full song render**.
