# Haunted Toaster UI change protocol

The production renderer is the UI authority. The browser witness is a generated view of that renderer, never a second implementation.

## Where UI truth lives

- `src/full-measure/src/renderer/index.html` owns semantic structure and truthful loading copy.
- `src/full-measure/src/renderer/styles.css` and the focused renderer stylesheets own presentation.
- Renderer controllers own presentation state only. Creative identity must arrive through `window.fullMeasure`; it must not be inferred from labels, CSS classes, icons, or DOM text.
- `src/full-measure/src/toast-feels.cjs` is the only Toast Feel vocabulary. Main exposes copies through `app:toast-feels`, preload exposes `getToastFeels()`, and `toast-feel-controller.js` renders that manifest.
- `src/full-measure/witness/` supplies deterministic desktop-bridge fixtures. `witness-dist/` is generated and must never be edited.

## Correct update order

1. Change the owning domain or bridge contract first. If the UI only changes presentation, leave creative contracts alone.
2. Add a failing focused test at that boundary: domain, main/preload bridge, JSDOM behavior, or screenshot state.
3. Update the production renderer. Keep raw HTML truthful before scripts run and preserve keyboard, focus, disabled, loading, refusal, and reduced-motion states.
4. Update the deterministic witness fixture only when the real bridge contract changed. Do not add witness-only product furniture.
5. Run semantic proof, build the witness, then run the real-browser screenshot suite without baseline updates.
6. If the visual change is intentional, inspect every changed screenshot at 1380×900 before updating baselines. Never accept clipping, missing copy, console errors, or an unexplained delta.
7. When preload, IPC, native dialogs, local files, or packaged behavior changed, run packaged Electron proof too. Browser proof cannot substitute for it.

```bash
npm --prefix src/full-measure test
npm --prefix src/full-measure run witness:build
npx --prefix src/full-measure playwright install chromium
npm --prefix src/full-measure run witness:test
```

Use `--update-snapshots` only after the changed pixels have been explained and reviewed. Commit reviewed baselines with the UI change that caused them.

## Creativity extension points

Toast Feel biases existing lawful axes; it is not a hidden preset. Alpha.8 has exactly seven feels. A future vocabulary change must version the contract, update the canonical manifest and capability proof, preserve replay meaning, and cross the main/preload boundary as data.

MADD CLOWN CRAZY SLOTS delegates to the existing STOMP outer rail. Add future “wild” modes by composing recorded, seeded generation policies—not with renderer branching, ambient randomness, or a second chaos engine.

Native Color alpha.8 has exactly `echo` and `counterpoint`, with one bounded return window. New relationships or local image zones are a new version, not a quiet UI option.

## Completion record

Every UI-bearing handoff records:

```text
UI impact: none | behavioral | visual | bridge
browser witness: PASS/FAIL @ commit
visual delta: expected | none | unexplained
packaged witness required: yes | no
packaged witness: PASS/FAIL/not-required
GitBook ontology changed: yes | no
```
