# Haunted Toaster — CURRENT SPINE

> Repository-owned reconciliation ledger. This file records which lineage is current, which pull requests are historical shells, and where still-valid work must be rescued instead of merged from stale ancestry.
>
> Last reconciled: 2026-09-04

## Law of use

**Newer is not automatically canonical.** A successor belongs here only when repository evidence names the retained invariant, exact commit/PR, and present disposition.

Closing a superseded PR does **not** erase its history. The old branch remains provenance. A stale branch must not be merged merely because its idea is still valid; still-valid work is re-ported onto the current spine with fresh tests and current authority semantics.

### Status vocabulary

- **ACTIVE** — current work intentionally remains a live landing, design, rescue, or witness target.
- **LANDED-SUPERSEDED** — the PR itself is no longer a landing target because its still-valid behavior was adopted or composed into a named successor.
- **RESCUE-PARTS** — valuable code/concepts remain, but stale ancestry must not be merged; port selected parts onto the present spine with fresh proof.
- **ARCHIVE** — preserve the branch and history, but keep it dormant until a named future gate reopens the work.

A closed PR may still carry one of the latter three statuses. **Closed is transport state; reconciliation status explains why.**

## 2026-09-04 reconciliation cut — WALK E authority carrier / Stage A queue

This cut records a new field-spine fact without pretending that field work is on `main`.

### `main`

- Ledger parent before this docs-only reconciliation update: `a42aaab5fced936aed9e85156389cadcc2119c9f`.
- PR #216, the first `CURRENT_SPINE.md` landing, merged earlier as `10f65ca1f6d721178355c5c67b933e0183753c45`.
- PR #215 is landed on `main` as `b4ceaabc4a4d9334177180812acbf1e0e01ff69f`, not an open design target. #219 remains its planning successor.
- This ledger update changes documentation only; it does not promote WALK E, Stage A, a package, tag, or release onto `main`.

### WALK E field spine

- Parent composition lane: PR #244 / branch `walk/e-sequential-braid`.
- PR #249 (`#248 Topology event authority carrier`) was explicitly landing-approved on 2026-09-04 and squash-landed **into the WALK E branch, not `main`**.
- Landed WALK E head: `dce000c8d04e81e65a1b0011b904588fc2bf19ce`.
- The landed tree is `f54e2a52122db49d3e95ddeeefa2808fae5f52d0`, the same tree freshly verified on the PR merge ref before landing.
- Fresh exact-head proof before landing: Full Measure check 254 scripts; 566/566 tests; full render smoke; candidate six-up smoke; production audit 0 vulnerabilities; canonical renderer-witness comparison green; fresh Windows package green.
- #249's narrow human authority-carrier gate is satisfied by the attributable GRAB witness. Broader WALK E perceptual graduation on #234 remains open: SPEAK/APERTURE are under-characterized by eye and GROW/BODY/KITCHEN SINK remain unestablished by that specimen.
- CROSS remains only a machine transition specimen for the authority seam; it does not silently enter WALK E product/UI human-witness scope.

### Stage A queue after #249

- **#251 ACTIVE WITNESS ANCESTRY** — original Stage A `RESPONSE STANCE × SCOPE × CONSEQUENCE` RED/GREEN machine/semantic witness. Exact witnessed head: `9d31eab1e4e695fb226031034203b0b50c72b411`; exact tree: `5a2a55f2d8d461bd182d0d267ecc1a1cc00c3be4`. Preserve; do not rewrite or use as the current landing carrier.
- **#254 ACTIVE WITNESS ANCESTRY** — original narrow human-witness bridge stacked on #251. Exact witnessed head: `a27ccd1292f870063bceb3d60d64996a5cd70de2`; exact tree: `5fc954c01525a655a38c8e13c97e2ffbb6f6e2b7`. Preserve; do not use as the current human-test carrier.
- **#256 ACTIVE CURRENT CARRIER** — fresh Stage A re-port directly parented by landed WALK E `dce000c8…`. Head `d408a58754f4a53d1ca2c60141b3086bae21a22e`; tree exactly equals #251's witnessed tree `5a2a55f2…`. Fresh workflow run 2143: 259-script check; 582/582 tests; both smokes green; production audit 0 vulnerabilities; renderer witness build and canonical comparison green. No Windows/package/release promotion.
- **#257 ACTIVE HUMAN-TEST CARRIER** — fresh narrow bridge directly parented by #256 `d408a587…`. Head `5b693ca8760253a902920884ff33692ac30d5c03`; tree exactly equals #254's witnessed tree `5fc954c0…`. Fresh workflow run 2145: 260-script check; 587/587 tests; both smokes green; production audit 0 vulnerabilities; renderer witness build green; 12/12 browser witness states green. No Windows/package/release promotion.
- #257 is now the human doorway: `existing six-up → explicit Stage A opt-in → six addressed creatures → existing preview/render`.
- Human Stage A witness remains outstanding. Neither #256 nor #257 receives landing approval from this reconciliation entry.

### Squash-ancestry rule discovered and fulfilled at this cut

#251 was built directly on the original #249 feature-branch ancestry. #249 was then squash-landed into WALK E as `dce000c8…` with equivalent tested tree content but a different commit ancestry.

Therefore:

- do **not** rewrite the witnessed #251/#254 branches merely to make ancestry look tidy;
- do **not** infer that equivalent trees make different commit lineages interchangeable provenance;
- do **not** directly retarget the witnessed #251 branch across the squash boundary and call that a normalized landing lineage;
- preserve #251/#254 as witness ancestry;
- constitute any landing/human-test successor from the current WALK E carrier with fresh proof.

That re-port is now constituted as #256 → #257. #256 has landed WALK E as its sole parent while retaining #251's exact source tree; #257 has #256 as its sole parent while retaining #254's exact source tree. The old witness branches remain provenance.

The fill is not the carrier: equivalent source trees preserve executable content, but the landing carrier must still be constituted on the current field spine.

## Canonical `main` spine

| Stage | Canonical commit / PR | What is carried forward | Status / successor |
| --- | --- | --- | --- |
| alpha.8 packaged test line | `a0dfa4f45c79d1e4b7d54805943e36c0d86321b2` / #126 | UI Witness, Toast Feels, Native Color, seeded STOMP/MADD CLOWN, alpha.8 package identity | Historical ancestor → #175 |
| Receipt-memory foundation | `765cc5e1c89b52783bd89f462334a4e1f4daa16e` / #164 | immutable receipt archive, human verdicts, deterministic memory projection/capsules/traces | On `main`; foundation for #217/#218 rescue |
| **BETA spine splice** | `e56281c26279c5277a6d0e5ad7959c0241630d34` / #175 | alpha.9 semantic core, receipt evidence, CONVERGE, range calibration, elastic topology response, Track 0 renderer/Listener trust repairs, frame reservoir, Creative Context contracts | **Canonical successor for the stranded alpha.9 stack** |
| Candidate ecology / CROSS | `e8901fa7f52741e9e19a131ca6a9ed59eea841ac` / #179 | candidate ecology and exact two-parent CROSS | On `main` → #182 |
| BETA Home Bench | `fb1f8661ce595b189f38fee4a5e4e9e3df2a7f56` / #182 | presentation-only Home projection, BETA integration, Video/VSPantry, bounded recent history | On `main` → #189 |
| Contextual second six-up | `c5c90b39c973df2986048828098c5c73bc5d0a52` / #189 | deterministic second six-up move deck; proposal-only contextual moves | On `main` → #192 |
| BETA field package | `133e514c48d1f1ff041b5e0af21dcc14e6ed56f8` / #192 | current-main Listener hardening + live VSPantry progress | On `main` → #193 |
| BETA field witness closure | `cf56d71883ff3e61bd54239e16c330df1ac734dd` / #193 | packaged human witness passed; VSPantry live counts preserved; Listener findings continue separately | On `main` |
| Topology Events design | `d9a668db48131e86969acc49223e25ca5d026fe9` / #196 | accepted topology-event authority/integrity design | On `main`; implementation field spine began at #200 |
| Resolution Field design | `7d0d7560b224684d0e4a46b6499dce21e3770d5f` / #198 | bounded internal-resolution primitive and human-gated experiment | On `main`; implementation field spine began at #201 |
| Sigil Grammar v0 | `899a920b17019a54dadfb0c6bb321cc6e4cf860b` / #211 | generation-only Witness Sigil compatibility, topology expressions/plans, deterministic six-utterance families, replay | On `main`; language/algebra study lanes remain non-renderer |
| Sigil Algebra v0 implementation plan | `3d0615ced52313db3232f79501b59357bdd211d8` / #221 | docs-only exact integer/rational Transform2 equivalence proof plan for #220; no renderer/UI/authority behavior | On `main`; no longer current HEAD |
| CURRENT_SPINE ledger | `10f65ca1f6d721178355c5c67b933e0183753c45` / #216 | repository-owned reconciliation law and ledger | Landed on `main`; living artifact updated by later reconciliation commits |
| Sigil Language Witness v0 design | `b4ceaabc4a4d9334177180812acbf1e0e01ff69f` / #215 | reviewed/frozen design-only language witness contract | Landed on `main`; planning successor #219 |

## Active field / design / rescue lanes — not yet `main`

These are active successors and witnesses, not permission to pretend their ancestor branches landed individually.

### Field witness lane

```text
#200 GRAB topology event                 [closed · superseded]
  ↓
#201 Resolution Field                   [closed · superseded]
  ↓
#205 Atmosphere alpha preservation      [closed · superseded]
  ↘
   #212 fresh Resolution + Listener witness  ← #204 Listener bridge [closed · superseded]
      ↓
   #214 TEST 6 forced witness harness
      ↓
   #244 WALK E sequential braid
      ↓
   #249 topology-event authority carrier [landed into WALK E]
      ├─ witness ancestry: #251 → #254
      ↓
   #256 Stage A current-WALK-E carrier
      ↓
   #257 Stage A human-test carrier
```

- **#212 ACTIVE** — composed human-test specimen for GRAB + Resolution/Atmosphere + Listener anchor integrity.
- **#214 ACTIVE** — deterministic TEST 6 feature/witness branch; exact-head machine proof is green, but packaged human witness remains required. Reconciliation commits do not belong there.
- **#244 ACTIVE** — WALK E composition lane. Its branch now carries the landed #249 authority carrier at `dce000c8…`; broader #234 perceptual graduation remains open.
- **#249 LANDED-SUPERSEDED** — closed/merged into `walk/e-sequential-braid`; no `main` promotion, tag, or release.
- **#251 ACTIVE WITNESS ANCESTRY** — preserve original Stage A machine/semantic proof on pre-squash #249 ancestry; #256 is the current carrier.
- **#254 ACTIVE WITNESS ANCESTRY** — preserve original human-bridge witness stacked on #251; #257 is the current human-test carrier.
- **#256 ACTIVE** — one-commit Stage A re-port on current WALK E; exact #251 source tree; fresh machine + renderer-witness proof green.
- **#257 ACTIVE** — one-commit bridge re-port on #256; exact #254 source tree; fresh machine + 12/12 browser-witness proof green. **Human Stage A evaluation belongs here next.**

### Sigil study lanes

- **#215 LANDED-SUPERSEDED** — design is on `main` at `b4ceaabc…`; #219 is the active planning successor.
- **#219 ACTIVE** — planning-only standalone Language Witness + separately gated disposable Field Lab convergence plan. It must not merge TEST 6 and Language Lab authority merely because they share a package.
- **#221 LANDED ON MAIN** — Sigil Algebra v0 implementation plan only; production implementation remains future work under #220.

### Foreign-material lane

- **#222 ACTIVE** — first renderer-facing foreign-material crossing for #44.
- Exact head recorded by the PR: `f4a575db65d1bdb9cc5e7b462c30226660d4b804`.
- Machine workflow `32615247440` is green for application proof, runtime audit, smoke, renderer witness build, and canonical witness-state comparison.
- **Human field gate remains mandatory:** one real admitted 5–10 second clip against a longer song must prove preview/final parity, receipt-bound source/plan evidence, contribution beyond literal clip duration, exact replay, Toaster assimilation rather than stock-video cutaway behavior, and clean return to the no-video path.
- Video remains foreign material; it does not gain an independent timeline or placement authority.

### Main-based design / reconciliation lanes

- **#216 LANDED-SUPERSEDED** — original ledger transport PR is merged; `CURRENT_SPINE.md` remains the living reconciliation artifact on `main`.
- **#217 ACTIVE** — BETA Receipt Memory + Witness Loop rescue v2 design, based on current-spine law; #166 is ancestry only.

### Rescue implementation lane

- **#218 ACTIVE** — first executable current-spine rescue implementation for #166 concepts.
- Implementation ancestry began from `main` @ `899a920b17019a54dadfb0c6bb321cc6e4cf860b`; do not reinterpret that historical base as the current `main` cut.
- Fresh RED: **443 tests / 441 pass / exactly 2 fail**, both missing `memory-service.cjs` and `witness-encounter.cjs`.
- Exact GREEN head: `0f967b8f7f0544bf94160611a60fa3c9232504e9`.
- Workflow `32606946521`: renderer verify, consolidated application proof, runtime audit, smoke, renderer witness, and canonical witness-state comparison all PASS; package/release intentionally skipped for the draft rescue slice.
- Still downstream under #217: deterministic projection/capsule coordination, one-seat ordinary memory influence, replay, explicit Re-toast arming, narrow IPC, Past Toasts, Thoughtline, and packaged human witness.

## Reconciliation ledger

| PR | Reconciliation status | Repository disposition / successor |
| --- | --- | --- |
| #257 Stage A current human-test carrier | **ACTIVE** | Fresh one-commit re-port on #256; exact #254 tree; run 2145 green at 587/587 plus 12/12 browser witness. Human Stage A verdict is the next gate; no landing implied. |
| #256 Stage A current-WALK-E carrier | **ACTIVE** | Fresh one-commit re-port on landed WALK E `dce000c8…`; exact #251 tree; run 2143 green at 582/582 plus renderer witness. Current semantic landing carrier; no landing implied. |
| #254 Stage A narrow human-witness bridge | **ACTIVE** | Preserved witness ancestry only; exact behavior re-ported to #257. Do not test or land this stale-lineage branch as the current carrier. |
| #251 Stage A post-WALK axis grammar | **ACTIVE** | Preserved RED/GREEN witness ancestry only; exact behavior re-ported to #256. Do not rewrite or land this stale-lineage branch as the current carrier. |
| #249 topology-event authority carrier | **LANDED-SUPERSEDED** | Closed/merged into WALK E as `dce000c8…`; exact tested tree retained; no `main` promotion/tag/release. |
| #244 WALK E sequential braid | **ACTIVE** | Current field-spine parent. Carries #249; broader #234 perceptual graduation remains open. |
| #222 foreign-material Slice D | **ACTIVE** | Renderer-facing #44 crossing is machine-green but human field-gated; do not treat Video as timeline authority. |
| #219 Sigil Language Witness implementation plans | **ACTIVE** | Planning-only successor to merged #215; standalone language proof precedes any disposable Field Lab convergence. |
| #218 current-spine receipt-memory implementation | **ACTIVE** | Rescue implementation 001 under #217; first backend RED→GREEN complete, wider memory proof ladder remains. |
| #217 BETA receipt-memory rescue v2 design | **ACTIVE** | Current-spine design successor for #166. |
| #216 CURRENT_SPINE ledger PR | **LANDED-SUPERSEDED** | Closed/merged as `10f65ca1…`; living `CURRENT_SPINE.md` continues on `main`. |
| #215 Sigil Language Witness design | **LANDED-SUPERSEDED** | Closed/merged on `main` as `b4ceaabc…`; #219 is active planning successor. |
| #214 TEST 6 witness harness | **ACTIVE** | Machine-green field harness; packaged human witness remains. #171 donates only typed receipt/build-provenance mechanics; old alpha.9 questionnaire/operator path rejected. |
| #212 fresh Resolution + Listener witness | **ACTIVE** | Composed field witness for #200/#201/#204/#205; do not confuse its field ancestry with `main`. |
| #205 Atmosphere alpha preservation | **LANDED-SUPERSEDED** | **Closed unmerged.** Valid behavior survives in #212. |
| #204 Listener anchor bridge repair | **LANDED-SUPERSEDED** | **Closed unmerged.** Valid repair survives in #212. |
| #201 Resolution Field v0.1 | **LANDED-SUPERSEDED** | **Closed unmerged.** Value survives through #205 into #212. |
| #200 GRAB topology event v0.1 | **LANDED-SUPERSEDED** | **Closed unmerged.** Value survives in #212 field lineage; no claim that GRAB is on `main`. |
| #171 alpha.9 field witness receipt | **RESCUE-PARTS** | **Closed unmerged.** Useful provenance law consumed by #214; alpha.9-specific witness/operator semantics retired. |
| #170 Creative Context Table foundation | **LANDED-SUPERSEDED** | **Closed unmerged.** #175 explicitly ports the Creative Context contract foundation onto BETA `main`. |
| #166 receipt memory + witness loop | **RESCUE-PARTS** | **Closed unmerged.** Current successors: #217 design + #218 implementation. Preserve branch as ancestry only. |
| #161 private YouTube publish handoff | **ARCHIVE** | **Closed unmerged.** Preserve dormant until a canonical release spine exists; local render remains authoritative. |
| #155 Listener durable draft | **LANDED-SUPERSEDED** | **Closed unmerged.** #175 explicitly ports Track 0 renderer/Listener trust repairs. |
| #154 nested response compaction | **LANDED-SUPERSEDED** | **Closed unmerged.** #175 explicitly ports Track 0 renderer trust repair. |
| #146 elastic topology response | **LANDED-SUPERSEDED** | **Closed unmerged.** #175 explicitly ports Elastic Topology Response. |
| #137 alpha.9 creative range calibration | **LANDED-SUPERSEDED** | **Closed unmerged.** #175 explicitly ports alpha.9 creative range calibration. |
| #131 alpha.9 packaged test line | **LANDED-SUPERSEDED** | **Closed unmerged.** #175 is the canonical BETA re-port of the trusted alpha.9 semantic core. |

## Rescue expedition 001 — #166 → #217 / #218

The receipt-memory **foundation is already on `main` via #164**. The rescue therefore does not replay #166's 34 commits.

Current authority:

- **#217** defines the BETA-native rescue contract and `toaster-memory-seat-v2` boundary.
- **#218** is the executable implementation expedition from a fresh current-spine branch at expedition start.
- **#166** remains historical design/implementation evidence only.

Rescue target, in proof order:

1. Memory Service facade over existing receipt/verdict/projection/capsule foundation;
2. immutable Witness Encounter testimony;
3. deterministic projection/capsule coordination;
4. BETA-native one-seat ordinary memory influence, with special/forced families excluded;
5. exact replay;
6. explicit **Re-toast** as human-selected ancestry for fresh generation — never timeline replay;
7. receipt/authority separation;
8. narrow Electron/preload operations;
9. current-BETA Past Toasts projection;
10. read-only Thoughtline projection of actual influence trace evidence;
11. browser/package/human witness.

Do **not** let memory replace VisualScore / ResolvedTimeline production authority. Missing or corrupt memory evidence degrades to no ambient influence or explicit refusal; it never becomes permission to invent.

## #171 → TEST 6 cannibalization result

The useful donor law was explicitly transferred to #214:

- typed / fail-closed witness evidence;
- binding human testimony to an accepted render identity;
- exact build/package provenance;
- append-only witness testimony separate from render authority.

Rejected donor baggage:

- the old four alpha.9-specific pass/fail questions;
- `Ctrl+Shift+W` as the operator surface;
- Toast Feel-specific witness semantics;
- any assumption that a witness receipt changes candidate/render authority.

#171 is closed unmerged. Its history remains provenance.

## Dormant publishing boundary — #161

YouTube transport is intentionally outside the current release spine. The PR is closed unmerged and preserved as a future source. If revived, it must be re-ported from the then-current release ancestor and keep local render completion authoritative.

## Update rule

Update this ledger whenever any of these occurs:

1. a new canonical runtime or repository-owned design/plan splice materially changes the current cut on `main`;
2. an ACTIVE field witness is adopted, replaced, or abandoned;
3. a RESCUE-PARTS expedition gains or changes its current-spine successor;
4. an archived feature is deliberately revived;
5. package/release identity changes;
6. a new live PR introduces a materially distinct authority or field-test lane.

A PR may close. Its evidence does not vanish. **History is preserved; authority stays local to the current spine.**