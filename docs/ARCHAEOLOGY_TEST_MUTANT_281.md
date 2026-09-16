# Archaeology test mutant — #281

This branch recovers four seams identified by [archaeology PR #281](https://github.com/the-static-collective/the-haunted-toaster/pull/281), from product `main` at `e8e8fb0fa3c13c98aae8c3ca5e98cb4de9f19031`. Historical branches were not merged. This is a test mutant, not a new release or a claim that the full historical wishlist is implemented.

## Try it

Install the branch's application dependencies, then run the ordinary desktop:

```sh
npm --prefix src/full-measure ci
npm start
```

Choose a song and optionally a local MP4/WebM through Video/VSPantry, generate six, select and KEEP one, then render. Ordinary sessions automatically inspect the attached specimen in this mutant. The finished receipt retains `candidateGenealogy.archaeologyObservation`: the Context Table, six candidate-addressed diets, ToastPack, and Specimen Pulse evidence. The current screen layout stays the same. Analysis adds bounded local decode work before previews; the first twelve seconds are the measurement window, not a whole-film claim.

For a repeatable end-to-end test with synthetic media:

```sh
npm --prefix src/full-measure run archaeology:mutant
```

Or exercise a real clip against the synthetic master song:

```sh
npm --prefix src/full-measure run archaeology:mutant -- --video /absolute/path/clip.mp4
```

The harness writes `src/full-measure/test-artifacts/archaeology-mutant/`: a finished video, normal render receipt/sidecars, and `evidence.json` with all four seams. Existing files in that **test-artifact directory** are replaced on a rerun. The supplied clip is read only. The standalone body fixture is evaluated independently and never drives that video.

## What is connected

| Seam | Executable recovery | Deliberate limit |
|---|---|---|
| ToastPack | Content-bound, versioned analysis manifest reusing Frame Reservoir; up to six 16×16 RGB samples, mean color/luminance, spatial edge difference, temporal sample difference | Partial evidence, first twelve seconds; no optical flow, occupancy, affinity policy, HD tier, or inferred scene cuts |
| Context Table / Diet | Ordinary candidate-session materialization → addressed observational table/diets → KEEP → retained render genealogy | Optional recovered providers explicitly ignored; zero score/timeline/family delta. The table is scoped to song, garment, and archaeology, not a complete account of all existing generation influences |
| Specimen Pulse | Bounded mono 8 kHz PCM, 100 ms energy/peak windows, signed energy change, zero crossings, explicit onset proxy; optional influence-only provider | Clip-relative only; no specimen sound in master, beat/meter/stem/classification claims, spectral/periodicity inference, or HyperFood PULSE identity |
| Resonant Disturbance | Pure declared-body evaluator; deterministic thresholds, transfers, recoil, causal event history, bounded atomic packages, terminal disposition, replay hashes | Synthetic fixture admission only. No sensor→pressure adapter or visible consequence adapter |

Source bytes are checked before and after decoding. Path, filename, admission timestamp, and directory order do not enter measurement identity. Decoder identity is retained because different decoder builds may yield different samples. Unavailable decoding yields explicit partial/unavailable evidence; source identity mismatch cannot produce a material witness. Cancellation aborts without publishing a family. A song/image/video change during the new analysis await refuses stale observation.

The manifest names requested seek timestamps rather than claiming exact decoded frame PTS. Frame differences are sampled visual differences, not optical flow. Pulse energy uses mean-square parts per million, not decibels or perceived loudness. Onset proxy means only a positive window-energy delta of at least 20,000 ppm.

Programmatic excision control: `session.generate({ ...config, archaeologyObservation: false })`. Removing the optional evidence does not change generation. Forced TEST SIX is excluded. Existing master audio and the accepted VisualScore → ResolvedTimeline → preview/render chain remain authoritative.

## Next boundaries

A measured provider may eventually affect one candidate seat through a separately versioned proposal policy. This mutant deliberately supplies the prior zero-delta proof. HDToastPack, full spectral witnesses, sensor-to-body mapping, body-to-visible coupling, and HyperFood remain separate next work. Do not describe these foundations as already making the videos react to the specimen's audio.

## Provenance

- Archaeology source: #281 at `ff6edf236a1b1ee4f391e67855bcc8c18935b956`.
- LOADOUT owner `the-static-collective/LOADOUT`, default ref `main`, pinned `1adcb3d82f736f3ca8329c3c1d0d9eba398d49ee`.
- Loaded `.live/current-organ.json` and `skills/loadout/SKILL.md` at that SHA; owner/entrypoint verified; freshness resolved; no fallback.
- GitBook Front Room used for orientation only. Current Toaster executable contracts own integration.
- User request authorizes a test mutant. No merge, tag, publication, or release promotion is included.

## Verification receipt

Results are recorded in the implementation PR and final handoff. The local fixture harness is an executable product-path witness; it does not substitute for a Windows human test.

UI impact: behavioral (additional local material observation before previews; no visual controls)
browser witness: pending
visual delta: none expected
packaged witness required: yes
packaged witness: pending
GitBook ontology changed: no
