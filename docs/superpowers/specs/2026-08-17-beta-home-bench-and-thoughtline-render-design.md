# BETA Home Bench + Thoughtline Render Ingredient — Design

**Date:** 2026-08-17

**Status:** Approved design

**Project:** The Haunted Toaster

**Related:** #147, #148, #156, #157, #159, receipt-memory design, Video/VSPantry design

## 1. Purpose

The current Haunted Toaster renderer UI is aesthetically successful and should not be visually reinvented for beta. Beta growth should preserve the existing dark iron / paper / gold-orange-mint material language, serif ritual headings, receipt vocabulary, three-column appliance silhouette, and dedicated Listener / Six-Up focus surfaces.

The required change is spatial and semantic rather than cosmetic:

- add Video using the same compact source-row grammar as Image;
- move persistent VSPantry management into the otherwise unused lower-left region;
- turn the middle-column preselection furniture into a Six-Up window when the beta candidate ecology can generate without Toast Feel preselection;
- use the otherwise unused center of the right column for the three most recent witnessed toasts and a door into Past Toasts;
- treat Thoughtline primarily as a render ingredient derived from explicit influence evidence, not as an always-on UI visualization.

Working law:

> **Keep the appliance. Give its growing organs honest places to live.**

## 2. Home-screen geometry

The three columns keep their existing jobs but become more explicit:

```text
SOURCE / MATERIAL         CREATIVE FIELD               OUTPUT / HISTORY

Song                      Six-Up                       Render slate
Image                     1 · 2 · 3                    Recent toast 1
Video + pantry switch     4 · 5 · 6                    Recent toast 2
Words / credits           Song Shape                   Recent toast 3

VSPantry                  open focused Six-Up          Render
```

No generic application sidebar is introduced. Persistent objects appear as bounded windows inside the existing appliance chassis.

## 3. Video source row

Video sits directly below Image and reuses the same visual grammar:

```text
[video icon]  Add one video                 [+]
              Optional · MP4 or WebM
              [on] Add to VSPantry
```

Requirements:

- `Add to VSPantry` defaults on;
- the toggle is visually subordinate to choosing the current-session video;
- folder/bulk intake does not live in the source row;
- selecting Video remains session evidence and does not acquire renderer authority merely because it exists;
- clearing current Video does not delete VSPantry history.

## 4. VSPantry window

The lower-left region becomes a compact persistent-material status and door.

Minimum useful states:

### Empty

```text
VSPantry
No specimens yet.
Admitted videos can become reusable visual material.
[Import folder]
```

### Populated

```text
VSPantry
237 specimens
[optional active ToastPack status when a real bridge capability exists]
[Import folder] [Manage pantry]
```

The home window is not a file manager. Full browsing/repair/pack management belongs behind the door.

Never claim `No ToastPack loaded` merely because the current build lacks a ToastPack bridge. Unknown capability is not negative evidence.

## 5. Six-Up window

The approved beta ordinary path follows #147/#148:

```text
bring source
→ six creatures
→ recognize one, two, or none
→ creative verbs
→ accept
→ render
```

When the build exposes a declared beta candidate-ecology capability that genuinely permits fresh six-up generation without Toast Feel preselection, the permanent seven-card Toast Feel selector retires from the ordinary home surface and its region becomes a Six-Up contact sheet.

Before generation:

```text
SIX-UP
The toaster will listen, remember, and propose six different ways through.
[Generate six visions]
```

After generation:

- show the six actual 16:9 candidate thumbnails in a 3×2 contact sheet;
- clicking a cell selects it and opens/enters the existing full Six-Up focus room;
- the full focus room remains authoritative for locks, mutation, CROSS, CONVERGE, STOMP/joy behavior, and final acceptance;
- the contact sheet is a window into the same candidate family, never a second candidate implementation.

Until the backend truthfully exposes that capability, the current Toast Feel preselection UI remains visible and functional. Do not hide it while silently sending a default feel.

## 6. Detected Song Shape

Detected Song Shape remains immediately below the main creative population area. It is evidence about the source structure, not an advanced setting.

The visual hierarchy becomes:

```text
six visual hypotheses
↓
source song structure
↓
focused creative action / acceptance
```

## 7. Recent Toasts window

The right-column open region becomes the local history aperture when Receipt Memory / Past Toasts bridge capability exists.

Show at most three recent witnessed render encounters.

Each compact row may contain:

- title/song display identity;
- small rating/verdict state if present;
- receipt/media availability indicator;
- compact thumbnail only when cheaply and honestly available.

The bottom action is:

`View all past toasts →`

Clicking a row opens the corresponding Past Toast detail; it does not overload the render slate.

If the current build lacks Past Toasts capability, the entire window stays absent rather than advertising a fake archive.

## 8. Progressive disclosure

The home screen should not grow vertically merely because the system knows more.

- source identity and current media are primary;
- title/artist/lyrics timing may use compact/disclosure behavior where necessary;
- pack internals, receipt internals, lineage internals, and memory projections stay behind their respective doors;
- the ordinary user should interact with acts and artifacts rather than backend ontology.

## 9. Thoughtline changes category

Thoughtline is not primarily an application visualization.

The durable source remains the explicit `Influence Trace` from Receipt Memory. Thoughtline is an artistic compiler over a bounded, recorded trace/capsule.

```text
Influence Trace
      ↓
thoughtline-v1 compiler
      ↓
spatial graph / paths / junctions / pulse plan
      ↓
ordinary accepted render ingredient
```

Possible evidence-backed relation mappings include:

- `recalled` → returning filament / route;
- `inhibited` → termination, recoil, avoidance;
- `underexplored` → branch into visually open territory;
- `inherited` → joining geometries;
- reinforced relationship → increased persistence or weight;
- `counterexampled` → broken or refused connection.

These mappings are versioned compiler semantics, not claims of literal cognition.

## 10. Thoughtline authority law

The literal graph must not be painted one-to-one simply because the data exists.

Thoughtline is a deterministic artistic interpretation of recorded provenance:

```text
recorded evidence
+ versioned Thoughtline policy
+ accepted current-song temporal evidence
→ replayable visual ingredient plan
```

The present song governs temporal manifestation. Memory/provenance may govern spatial lineage pressure. Neither may silently mutate an already accepted timeline.

Thoughtline can lawfully be:

- absent;
- barely perceptible;
- a background nervous system;
- a temporary emergence;
- a dominant topology;
- haunting residue.

No UI toggle is required for ordinary beta merely to prove the feature.

## 11. Sequencing

### Slice A — Home Bench UI

Safe to implement on top of Video/VSPantry Slice A because it changes renderer presentation and consumes existing narrow bridges.

- exact Video row + inline pantry toggle;
- VSPantry home window;
- capability-gated Six-Up contact-sheet home window;
- capability-gated Recent Toasts home window;
- witness states proving beta geometry without lying in production builds.

### Slice B — Thoughtline compiler contract

Safe to design now, but renderer-facing execution waits for the existing renderer-trust gate and Receipt Memory influence-trace substrate.

First executable Thoughtline work should be a pure deterministic compiler + schema/fixtures/tests before any pixel integration.

### Slice C — Thoughtline renderer integration

Only after trusted renderer ancestor and accepted trace/capsule authority exist:

- compile accepted Thoughtline plan into shared preview/final semantics;
- record compact policy/plan evidence in derivation/receipt sidecars;
- prove absent/subtle/dominant cases without making Thoughtline mandatory.

## 12. UI witness laws

Preserve the current canonical witness states and add explicit beta-state fixtures rather than rewriting alpha truth.

Required proof:

- Video row with default-on VSPantry switch;
- populated VSPantry home window;
- beta Six-Up contact sheet with six candidates under an explicit capability fixture;
- Recent Toasts window with exactly three rows under an explicit archive fixture;
- unsupported builds retain current Toast Feel preselection and do not expose fake Recent Toasts;
- compact desktop geometry remains usable near the Electron minimum window, not only 1380×900;
- reduced motion and keyboard/focus behavior remain valid.

## 13. Non-goals

- no general sidebar/navigation redesign;
- no SaaS dashboard aesthetic;
- no permanent memory-control panel;
- no fake ToastPack state;
- no hidden default Toast Feel when beta candidate ecology is absent;
- no second Six-Up implementation;
- no Thoughtline consciousness claim;
- no ambient/random Thoughtline renderer behavior;
- no renderer-semantic Thoughtline change inside the current renderer-repair line.

## 14. Stop condition

The beta home shell is ready when the current aesthetic remains recognizably intact while the screen can truthfully answer four questions at a glance:

1. **What source/material is in the Toaster?**
2. **What six visual creatures are currently alive?**
3. **What persistent visual material does this Toaster have access to?**
4. **What did the last few witnessed toasts become?**

Thoughtline is ready only when provenance can become visible art without becoming unrecorded renderer improvisation.
