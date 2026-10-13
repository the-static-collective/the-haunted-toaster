# RELAY-001 eighth organ — Haunted Toaster six-up

This is a **bounded candidate-generation experiment**, not a release, KEEP, final video, or public release of the source music.

Source: `Blue Night Morning Bloom`, SHA-256 `6ae3a6916c6214f7582da048246596d36a6cf355effe1dd68c47d685fef3acc6`.

## The operation

The `src/full-measure/scripts/relay001-candidates.cjs` adapter invokes actual Toaster application APIs:
- `inspectAudio` on local media;
- `createCandidateSession()`, `noteAudio()`, optionally `noteImage()`;
- `session.generate()` with `presetId=porchlight`, `toastFeelId=porch-ghost`, and a root seed derived from the exact audio bytes;
- emits six native PNG previews, independent score addresses, native timeline hashes, analysis, and source-locked JSON.

The adapter does not call `select`, `keep`, `scrape`, `executionForRender`, `renderVideo`, or any external API. Any future final video requires a **separate human KEEP** selecting one of these six exact candidates and a separately authorized render; this experiment is not a KEEP verdict.

## Private original run

Obtain the original song from the owner-local relay packet, not from GitHub. The parent planZ `mission-offer.json` can be passed to verify a real plan identity before any audio probing.

```sh
FULL_MEASURE_FFMPEG=/usr/bin/ffmpeg FULL_MEASURE_FFPROBE=/usr/bin/ffprobe \
node src/full-measure/scripts/relay001-candidates.cjs \
  --audio '/private/source/song.mp3' \
  --mission '/private/seventh-organ/mission-offer.json' \
  --artwork '/private/source/embedded-cover.jpg' \
  --lyrics '/private/source/lyrics-embedded.txt' \
  --out '/private/eighth-organ/native-six-up'
```

Output records are local and may carry nonpublic analysis/candidate information; don't publish them automatically. The song, original artwork and lyrics are NOT committed into this repository.

## CI and limits

GitHub Actions uses an unrelated synthetic 6-second WAV and the **real native Toaster** session; asserts six PNG previews, unique score addresses and lack of continuation/render authority; packages the exact source snapshot needed for the owner's local execution.

The preview images are candidate thumbnails **from Toaster's procedural rendering**, not six completed music videos. The source song remains the sole prospective soundtrack, but no final soundtrack-bearing video is created yet.

`planZ proposal != Toaster KEEP != render authorization != publication`.

This work is review-only and does not modify BETA 0.0.0 release selection, the CANNON field or the existing candidate continuation policy.
