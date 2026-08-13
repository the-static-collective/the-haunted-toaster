# Haunted Toaster alpha.8 — Implementation Plan Index

Approved release design: `docs/superpowers/specs/2026-08-13-alpha8-creative-expansion-design.md`.

Implementation is deliberately split into separately reviewable lines:

1. **Failure evidence floor** — existing issue #116 / PR #119 implementation line. Historical crash reproduction is not required once the diagnostic bundle floor is landed.
2. **UI Witness Gate** — existing issue #122 / PR #124 plan/implementation line. Must land before visible Toastmoods cutover.
3. **Toastmoods / Seven Toast Feels** — `docs/superpowers/plans/2026-08-13-alpha8-toastmoods-implementation-plan.md`.
4. **Native Color Witness v1** — `docs/superpowers/plans/2026-08-13-alpha8-native-color-implementation-plan.md`.
5. **Integration / package / tag gate** — `docs/superpowers/plans/2026-08-13-alpha8-integration-release-plan.md`.

Dependency order:

```text
failure evidence floor -----------┐
                                  |
UI Witness Gate                   |
  -> Toastmoods                   |
       -> Native Color v1         |
             -> combined witness -┴-> alpha.8 package/tag
```

Failure evidence is an insurance prerequisite and may land independently of the UI/creative line. UI Witness is the hard ordering gate before Toastmoods. Native Color follows Toastmoods because its relationship preference consumes canonical Toast Feel identity. Integration/release follows all four landed slices.

## Plan review invariants

- VisualScore v1 is not rewritten merely to carry Toast Feel or Native Color identity.
- Toast Feel domain truth has one CommonJS authority and crosses to renderer UI through main/preload IPC.
- Ordinary Toast Feel pressure rebuilds Primitive/Atmosphere state, then Possession Arc, while retaining Color Drift through the Primitive resolver, before Lyric Resonance is reattached.
- MADD CLOWN delegates to existing `visible-outcome-stomp-v1` rather than creating a second chaos system.
- Native Color v1 has exactly `echo` and `counterpoint`.
- Native Color is expressive-renderer-only and old/non-expressive timelines remain unchanged.
- Candidate preview already shares the production timeline compiler; Native Color extends that shared seam rather than creating preview-only color law.
- Universal H.264 remains the required release transport; HEVC remains optional/experimental.
- Final tag is created only from the exact proven `main` commit after browser + Windows package + field witness.

## Self-review result

The approved design and all three new implementation plans were checked for scope coverage, placeholder language, conflicting authority, and cross-plan interface consistency. No unresolved implementation placeholder remains in the alpha.8 plan set.

The review corrected three concrete seams before execution:

- renderer Toast Feel furniture receives its manifest through the existing sandbox bridge rather than duplicating/importing CommonJS in browser code;
- Toast-pressured score re-resolution explicitly rebuilds the current semantic timeline stack so Possession Arc is not lost;
- Native Color resolves feel preference from canonical `toastFeelId` and extends the already-shared preview/production compiler.

## Execution modes

The plan set is ready for either Superpowers subagent-driven execution or inline plan execution. The implementation order and review gates are identical in both modes; only how work is dispatched changes.

## Stop line

alpha.8 is complete when the packaged appliance proves:

1. a richer Toast Feel entry surface reaches accepted six-up/render evidence;
2. the source image's own color can influence treatment and lawfully return;
3. browser witness, packaged appliance, receipt, and build identity agree on what executed.

Then ship and return to field mining instead of absorbing alpha.9 research.