# Haunted Toaster — CURRENT SPINE

> Repository-owned reconciliation ledger. This file records which lineage is current, which open pull requests are historical shells, and where still-valid work must be rescued instead of merged from stale ancestry.
>
> Last reconciled: 2026-08-22

## Law of use

**Newer is not automatically canonical.** A successor belongs here only when repository evidence names the retained invariant, exact commit/PR, and present disposition.

Closing a superseded PR does **not** erase its history. The old branch remains provenance. A stale branch must not be merged merely because its idea is still valid; still-valid work is re-ported onto the current spine with fresh tests and current authority semantics.

### Status vocabulary

- **ACTIVE** — current work intentionally remains a live landing or witness target.
- **LANDED-SUPERSEDED** — the PR itself is no longer a landing target because its still-valid behavior was adopted or composed into a named successor.
- **RESCUE-PARTS** — valuable code/concepts remain, but stale ancestry must not be merged; port selected parts onto the present spine with fresh proof.
- **ARCHIVE** — preserve the branch and history, but keep it dormant until a named future gate reopens the work.

## Canonical `main` spine

| Stage | Canonical commit / PR | What is carried forward | Status / successor |
| --- | --- | --- | --- |
| alpha.8 packaged test line | `a0dfa4f45c79d1e4b7d54805943e36c0d86321b2` / #126 | UI Witness, Toast Feels, Native Color, seeded STOMP/MADD CLOWN, alpha.8 package identity | Historical ancestor → #175 |
| Receipt-memory foundation | `765cc5e1c89b52783bd89f462334a4e1f4daa16e` / #164 | immutable receipt archive, human verdicts, deterministic memory projection/capsules/traces | On `main`; foundation for #166 rescue |
| **BETA spine splice** | `e56281c26279c5277a6d0e5ad7959c0241630d34` / #175 | alpha.9 semantic core, receipt evidence, CONVERGE, range calibration, elastic topology response, Track 0 renderer/Listener trust repairs, frame reservoir, Creative Context contracts | **Canonical successor for the stranded alpha.9 stack** |
| Candidate ecology / CROSS | `e8901fa7f52741e9e19a131ca6a9ed59eea841ac` / #179 | candidate ecology and exact two-parent CROSS | On `main` → #182 |
| BETA Home Bench | `fb1f8661ce595b189f38fee4a5e4e9e3df2a7f56` / #182 | presentation-only Home projection, BETA integration, Video/VSPantry, bounded recent history | On `main` → #189 |
| Contextual second six-up | `c5c90b39c973df2986048828098c5c73bc5d0a52` / #189 | deterministic second six-up move deck; proposal-only contextual moves | On `main` → #192 |
| BETA field package | `133e514c48d1f1ff041b5e0af21dcc14e6ed56f8` / #192 | current-main Listener hardening + live VSPantry progress | On `main` → #193 |
| BETA field witness closure | `cf56d71883ff3e61bd54239e16c330df1ac734dd` / #193 | packaged human witness passed; VSPantry live counts preserved; Listener findings continue separately | On `main` |
| Topology Events design | `d9a668db48131e86969acc49223e25ca5d026fe9` / #196 | accepted topology-event authority/integrity design | On `main`; implementation field spine begins at #200 |
| Resolution Field design | `7d0d7560b224684d0e4a46b6499dce21e3770d5f` / #198 | bounded internal-resolution primitive and human-gated experiment | On `main`; implementation field spine begins at #201 |
| Sigil Grammar v0 | `899a920b17019a54dadfb0c6bb321cc6e4cf860b` / #211 | generation-only Witness Sigil compatibility, topology expressions/plans, deterministic six-utterance families, replay | **Current `main` head at reconciliation cut** |

## Active field/witness spine — not yet `main`

This is a **witness lineage**, not permission to pretend its ancestors landed individually:

```text
#200 GRAB topology event
  ↓
#201 Resolution Field
  ↓
#205 Atmosphere alpha preservation
  ↘
   #212 fresh Resolution + Listener witness  ← #204 Listener anchor bridge repair
      ↓
   #214 TEST 6 forced witness harness
```

- **#212** is the active composed human-test specimen for GRAB + Resolution + Listener.
- **#214** is a separate TEST 6 feature branch and must be finished independently of repository reconciliation.
- **#215** is a separate `main`-based Sigil Language Witness design lane. It is not part of the GRAB/Resolution field ancestry.

## Open-PR reconciliation ledger

| PR | Reconciliation status | Canonical successor / action |
| --- | --- | --- |
| #215 Sigil Language Witness design | **ACTIVE** | Continue as separate `main`-based design lane. |
| #214 TEST 6 witness harness | **ACTIVE** | Finish on its own branch; no stack-cleanup commits. Cannibalize only still-missing receipt/provenance ideas from #171. |
| #212 fresh Resolution + Listener witness | **ACTIVE** | Current composed field witness for #200/#201/#204/#205. |
| #205 Atmosphere alpha preservation | **LANDED-SUPERSEDED** | Value survives in #212; preserve branch history, retire PR shell. |
| #204 Listener anchor bridge repair | **LANDED-SUPERSEDED** | Value survives in #212; preserve branch history, retire PR shell. |
| #201 Resolution Field v0.1 | **LANDED-SUPERSEDED** | Value survives through #205 into #212; preserve branch history, retire PR shell. |
| #200 GRAB topology event v0.1 | **LANDED-SUPERSEDED** | Value survives in the #212 field lineage; preserve branch history, retire PR shell. |
| #171 alpha.9 field witness receipt | **RESCUE-PARTS** | Audit for TEST 6 receipt/build-provenance pieces; do not import obsolete alpha.9 witness questions or hidden operator path. Then retire. |
| #170 Creative Context Table foundation | **LANDED-SUPERSEDED** | #175 explicitly ports the Creative Context contract foundation onto BETA `main`. |
| #166 receipt memory + witness loop | **RESCUE-PARTS** | First rescue expedition: port missing memory-service / encounter / Re-toast / Past Toasts / Thoughtline layer onto current `main`, using #164 as the already-landed memory foundation. Fresh tests and present authority semantics required. |
| #161 private YouTube publish handoff | **ARCHIVE** | Preserve dormant. Re-port only after one canonical release spine exists; local render remains authoritative and publishing remains separate. |
| #155 Listener durable draft | **LANDED-SUPERSEDED** | #175 explicitly ports Track 0 renderer/Listener trust repairs. |
| #154 nested response compaction | **LANDED-SUPERSEDED** | #175 explicitly ports Track 0 renderer trust repair; preserve old proof as ancestry. |
| #146 elastic topology response | **LANDED-SUPERSEDED** | #175 explicitly ports Elastic Topology Response onto BETA `main`. |
| #137 alpha.9 creative range calibration | **LANDED-SUPERSEDED** | #175 explicitly ports alpha.9 creative range calibration onto BETA `main`. |
| #131 alpha.9 packaged test line | **LANDED-SUPERSEDED** | #175 is the canonical BETA re-port of the trusted alpha.9 semantic core. |

## Rescue expedition 001 — #166

The receipt-memory **foundation is already on `main` via #164**. The rescue therefore must not replay all 34 commits from #166.

Port only the still-missing layer, with fresh compatibility tests against current BETA/Sigil ancestry:

1. memory service facade over the existing receipt/verdict/projection/capsule foundation;
2. immutable witness encounter/disposition records;
3. explicit **Re-toast** as human-selected ancestry, never replay and never implicit authority;
4. bounded ordinary memory influence (at most one six-up lane unless a newer contract explicitly changes that law);
5. Past Toasts projection;
6. Thoughtline projection;
7. Electron/preload boundaries needed by those surfaces;
8. browser/package witness only after the current UI seam is integrated.

Do **not** wholesale merge the stale #166 branch. Do not let memory replace VisualScore / ResolvedTimeline production authority.

## #171 → TEST 6 cannibalization boundary

Potentially reusable idea: an immutable field-witness receipt that binds a human observation to an exact accepted render and packaged-build provenance.

Do not carry forward automatically:

- the old four alpha.9-specific pass/fail questions;
- `Ctrl+Shift+W` as the operator surface;
- any assumption that a field receipt changes render/candidate authority.

#214 already owns TEST 6's forced-witness semantics. #171 may donate provenance/receipt mechanics only where #214 demonstrably lacks them.

## Dormant publishing boundary — #161

YouTube transport is intentionally outside the current release spine. Preserve the branch as a future source, but do not make it a current dependency or UI authority. If revived, it must be re-ported from the then-current release ancestor and keep local render completion authoritative.

## Update rule

Update this ledger whenever any of these occurs:

1. a new canonical runtime splice lands on `main`;
2. an ACTIVE field witness is adopted, replaced, or abandoned;
3. a RESCUE-PARTS expedition gains a new current-spine successor;
4. an archived feature is deliberately revived;
5. package/release identity changes.

A PR may close. Its evidence does not vanish. **History is preserved; authority stays local to the current spine.**
