# HUMKIN / Golden Yellow Blue — Haunted Toaster real-song field test

Status: **source adapter staged, native execution not yet witnessed**. This document must never be represented as a successful packaged or official render until an actual run and receipt validate.

## Selection

- Song: **Golden Yellow Blue**, from **HUMKIN — MUTANT POP**.
- Asset source: user's locally held original `Golden Yellow Blue.mp3` (do not check audio or artwork into a public repository).
- Visual source: user-held `Cozy Mutant Pop Kitchen Jam.png`, whose printed predecessor artist label is **the hum**. For any public-facing video use the current artist name **HUMKIN**, not the old label; keep the original artwork as provenance.
- Aim: a complete native Facebook-compatible video playing within the Facebook post, no Suno app redirect.
- Target shape: 720×900 (4:5), 24 fps, MP4; the native renderer may choose its actual audio encoder and records those details in the receipt.
- Composition: `wireOrchard` preset + `wire-heat` Toaster feel, six candidates, explicit KEEP, accepted resolved timeline, final video + sidecars.
- Base branch: experimental NEXTGEN-TOASTER-026 (#359). The newest experimental editor features are **not** asserted to render pixels; this runner only uses the existing official six-up/renderer modules.

## Run on a machine with the repository and Node 22+

```bash
npm --prefix src/full-measure ci
node src/full-measure/scripts/field-test-humkin-golden-yellow-blue.cjs \
  --audio "/path/to/Golden Yellow Blue.mp3" \
  --image "/path/to/Cozy Mutant Pop Kitchen Jam.png" \
  --out "/path/to/output/GOLDEN_YELLOW_BLUE_OFFICIAL_TOASTER.mp4"
```

The first invocation saves exactly six canonical candidate thumbnails and `field-test-six-up.json`; it does **not** continue a candidate on its own. After reviewing the previews, repeat the command with explicit `--keep N` (1–6) to render.

**Required evidence to graduate this test:** successful source/package execution, actual native video, song-duration match, source-audio preservation, selected score/timeline binding, verified receipt and sidecar hashes, human visual inspection, and a Facebook native upload/playback check. Do not equate the independent local sample with this result.

An independent **Facebook-first visual proof** was also prepared outside the official package from the owner's MP3 and the user's existing manga artwork. This is useful for immediate posting, but **it is not** a Haunted Toaster render and carries no Toaster receipt.

## Next improvement

This is a concrete test for a missing operator path: allow a remote agent to give the Toaster locally-held music, inspect six-up previews, and retrieve the final MP4 with receipt **without uploading private song bytes to public GitHub**. Preserve user KEEP authority; expose a remote execution boundary only with explicit, inspectable media custody.
