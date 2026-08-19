# Second Six-Up Move Deck — Approved Design

Status: approved in conversation on 2026-08-19.
Parent: #180, #148.
Builds on: #179 candidate ecology and exact two-parent CROSS.

## Product sentence

The Toaster presents six creatures, the human selects one, and the Toaster deals six lawful next-move proposals. A single `DEAL SIX MORE` control changes only the proposals, never the creature family or render authority.

## Interaction law

1. The first six-up remains the current exact candidate family.
2. No modifier deck is actionable until one current creature is selected.
3. Selecting a creature deals exactly six move proposals.
4. The first deal contains these mechanics:
   - `EXPAND` — descend from the selected candidate under its inherited Toastmood lane.
   - `MUTATE` — create a new deterministic descendant family from the selected candidate.
   - `CONVERGE` — use the existing lawful frontier replacement path.
   - `STOMP` — use the existing stranger-descendant path.
   - two `CROSS` proposals — selected candidate × two deterministically suggested current-family partners.
5. `CROSS` proposals replace the old A/B marking ceremony in the primary UI. Backend CROSS remains exact two-parent CROSS.
6. `DEAL SIX MORE` increments only a local proposal-deal index and deterministically re-deals six addressed proposals for the same family + selected candidate + locks. It does not invoke candidate generation, mutate selection, bind render authority, or change accepted history.
7. Changing candidate family, selected candidate, or locks resets/recomputes the proposal deck from the new context.
8. Choosing a proposal invokes an already-authoritative candidate operation. Proposal cards have no renderer authority.
9. `Use selected timeline` remains a distinct explicit human acceptance step.
10. `VisualScore -> ResolvedTimeline -> preview -> render -> sidecars -> receipt` remains unchanged.

## EXPAND semantics

`EXPAND` is not a new generator and not a new Creative Verb ontology entry. It is a user-facing intent over the existing branch mutation primitive. Current candidate-session law already derives branch Toast Feel from `parent.toastmoodLane.id`; therefore the selected lane remains the bounded search pressure. `EXPAND` gets a distinct deterministic root-seed kind so replay can distinguish the human intent from ordinary `MUTATE`.

## Proposal address

The proposal deck is a pure deterministic function of:

- policy: `candidate-move-deck/v1`
- current `familyHash`
- selected candidate index + score address + Toastmood lane
- sorted lock list
- non-negative `dealIndex`

Each proposal carries an address derived from the above context plus its action parameters. The address is evidence for the proposal only; it is not executable authority.

## CROSS partner dealing

For a six-candidate family there are five possible partners for the selected creature. The deck deterministically orders those partners from the proposal context. Deal 0 exposes two partners; later re-deals rotate through the remaining partner suggestions before repeating. CROSS execution still submits exactly two current indexes to `candidate:cross`.

## UI shape

The modal becomes:

```text
SIX CREATURES
[1] [2] [3]
[4] [5] [6]
       ↓ choose one

SIX MOVES                         [↻ DEAL SIX MORE]
[EXPAND] [MUTATE] [CONVERGE]
[STOMP ] [CROSS ] [CROSS   ]

locks                              [USE SELECTED TIMELINE]
```

Move cards are compact and contextual. CROSS cards name the proposed partner. EXPAND names the selected Toastmood lane when present.

## Non-goals

- no new renderer mode;
- no generalized lineage graph;
- no three-parent breeding;
- no hidden random entropy;
- no mutation caused by re-deal;
- no automatic winner selection;
- no replacement of exact candidate previews;
- no change to receipt/render semantics;
- no implementation of MOLT/HAUNT/COMPOST until those primitives have their own authority contracts.

## Acceptance proof

- fresh field still yields six ordinary Toastmood representatives;
- selecting any candidate yields exactly six proposal cards;
- EXPAND, MUTATE, CONVERGE, STOMP and two CROSS proposals are present on the first deal;
- proposal addresses are deterministic for identical context;
- re-deal changes proposal deal/address and partner suggestions without invoking generation;
- CROSS proposal always names and submits exactly the selected candidate plus one distinct current-family partner;
- locks are included in proposal context and still passed unchanged to execution;
- accepted selection is cleared when a new family is generated, exactly as today;
- legacy Mark CROSS / CROSS A+B controls are removed from the primary UI;
- browser witness proves the second six-up is visible and understandable;
- packaged Electron witness is required because preload changes;
- repository check/test/smoke suite remains green.
