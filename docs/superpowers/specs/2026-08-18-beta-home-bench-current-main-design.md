# BETA Home Bench — Current-Main Integration Design

**Date:** 2026-08-18

**Status:** Approved for implementation

**Project:** The Haunted Toaster

**Ancestors:** #175 BETA spine, #179 Candidate Ecology + exact two-parent CROSS, #135 Node-24 Actions migration

**Supersedes implementation assumptions in:** #167 / `2026-08-17-beta-home-bench-and-thoughtline-render-design.md`

## Purpose

Bring the BETA Home Bench onto current `main` without reviving pre-ecology assumptions or creating a second candidate authority path.

Working law:

> **Home is a window into the creature that already exists. It is not another creature factory.**

## Authority boundary

#179 owns candidate behavior and state:

- ordinary initial six-up without mandatory Toast Feel preselection;
- Toastmood-field family composition and evidence;
- exact two-parent CROSS and genealogy;
- locks, mutation, CONVERGE, STOMP, selection, acceptance, and render authority.

Home Bench owns presentation only:

- Video source row and VSPantry home window;
- Six-Up contact-sheet projection of the current candidate family;
- Recent Toasts aperture when a real Past Toasts bridge exists;
- compact and canonical browser witness states.

The Home Bench MUST NOT:

- invent a second root-seed domain;
- decide candidate Toast Feel independently from `candidate-ui.js` / candidate session;
- duplicate family state;
- implement separate mutate/CROSS/accept behavior;
- alter files under `src/full-measure/src/render/`;
- alter candidate generation semantics under `src/full-measure/src/generation/` except for a narrowly derived capability declaration if needed.

## Truthful ecology capability

Current `main` implements Candidate Ecology but does not yet advertise the old #167 capability string.

Add a derived `betaCandidateEcologyV1` capability only when the runtime actually exposes both canonical policies required by the Home Bench contract:

- `toastmood-field-v1` for ordinary no-preselection initial families;
- `two-parent-cross-v1` for exact two-parent CROSS.

The capability is descriptive evidence, not a feature switch that changes generation behavior.

## Home Six-Up projection

When `betaCandidateEcologyV1` is present:

- retire the permanent Toast Feel preselection furniture from the ordinary home surface;
- reveal a compact 3×2 Six-Up contact sheet;
- project the exact current `family.candidates` thumbnails, indexes, signatures, and selected state;
- generating from Home calls the same existing `generateCandidates` path;
- clicking a home candidate selects the same candidate index and opens the existing focused Six-Up room;
- after Mutate, CONVERGE, STOMP, or CROSS, the Home projection updates from the returned family;
- clearing/changing source clears both views.

The focused Six-Up room remains authoritative for creative verbs and final acceptance.

The Home projection MUST preserve #179's outer-shell scrollbar repair: the modal shell never acquires a native right-hand scrollbar; only the bounded candidate region may scroll.

## Video and VSPantry

Keep the prior Home Bench visual design:

- Video uses the compact source-row grammar already established by Image;
- `Add to VSPantry` defaults on;
- VSPantry status/folder intake live in a bounded lower-left home window;
- adding or clearing a current Video remains session evidence only;
- VSPantry existence does not imply ToastPack state or renderer authority.

## Recent Toasts

Recent Toasts remains absent unless `listPastToasts` actually exists on the bridge.

When present:

- display at most three witnessed encounters;
- use stable display fields only;
- do not fabricate thumbnails, ratings, receipt availability, or archive state;
- navigation to detail exists only when an actual bridge exists.

## Thoughtline

Thoughtline remains design-only in this slice. No cognition widget and no renderer integration are added here.

## Witness contract

Fresh proof is required after current-main integration.

Required automated witness:

- unsupported state keeps legacy/explicit Toast Feel UI truthful;
- beta ecology state shows exactly six projected candidates;
- Home projection does not modify the candidate generation config beyond calling the existing path;
- CROSS descendants replace the same Home family projection;
- VSPantry source/home-window geometry is valid;
- Recent Toasts is absent without a bridge and capped at three with a bridge;
- canonical desktop witness remains valid;
- `beta-home`, `beta-history`, and 1080×720 compact witness states pass;
- #179 outer-scroll/sidebar witness remains green.

Required human browser witness before landing:

1. generate ordinary six from Home with no explicit Toast Feel preselection;
2. enter focused Six-Up from a Home candidate and return without state divergence;
3. mark exactly two parents, CROSS, and observe the replacement six on Home;
4. verify no outer right-edge scrollbar/sidebar churn;
5. verify compact Home geometry remains usable.

## Stop condition

This slice is ready only when Home truthfully answers:

1. What source/material is present?
2. What six visual creatures are currently alive?
3. What persistent visual material is available?
4. What recent witnessed toasts exist, if the bridge can prove them?

No tag or release is implied by landing this slice.
