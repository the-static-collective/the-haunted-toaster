# The Haunted Toaster 0.4.0 demo runbook

## Demo sentence

**Drop in a finished song. The Haunted Toaster makes one complete local music video and leaves a cryptographic receipt.**

## Prepare before showing it

Use a 30–90 second MP3 for the fastest live render. Keep these beside it:

- one square or landscape PNG/JPG/WebP;
- either plain lyrics or a reviewed LRC file;
- enough free disk space for the MP4 and receipt.

For the cleanest lyric demonstration, use LRC. Plain text remains intentionally approximate. The optional local Listener can infer line entrances on 64-bit Windows, but a live model installation is not part of the core demo.

## Launch

From a repository checkout on Windows, double-click:

```text
START_HAUNTED_TOASTER.bat
```

The first launch requires Node.js 22+ and internet access while `npm ci` installs the desktop shell and bundled media tools. Rendering is local afterward.

A packaged demo can instead use the unsigned installer or portable executable produced by the `Haunted Toaster proof and package` GitHub Actions workflow.

## Five-minute path

1. Point out **Local only — No upload. Zero credits.**
2. Drop in the song and show the detected duration, codec, and energy sections.
3. Add the image and timed lyrics.
4. Switch between Porchlight, Wire Orchard, and Absolute Residual.
5. Click **Make full video** and show progress/cancellation behavior.
6. Play the complete MP4.
7. Reveal the adjacent receipt and show:
   - source and output SHA-256 hashes;
   - source/output media facts;
   - garment and section map;
   - lyric timing provenance;
   - audio handling;
   - accepted duration delta.

## Claims this demo supports

- finished song in → complete 1080p MP4 out;
- no account, upload, subscription, API key, or media credits;
- original MP3/AAC stream copied where MP4 permits it;
- deterministic procedural garments and audio-reactive section changes;
- plain, imported timed, manually reviewed, or locally inferred lyric timing;
- preview/render cue-selection parity;
- frame-rate-independent motion timing;
- accepted outputs receive cryptographic receipts and duration proof.

## Honest boundary

Version 0.4.0 is the stable demo cut of the existing instrument. It does **not** yet include the planned portable `VisualScore`, circular topology, mutation engine, score breeding, or replay/diff surface. Those belong to the next architectural generation and are deliberately excluded from this release candidate.

The Windows package is unsigned and may trigger SmartScreen. The compact Listener targets English vocals on 64-bit Windows and may need visible human correction for dense mixes, overlapping singers, effects, or sustained syllables.

## Release gate

Do not call the demo candidate ready until the pull request workflow passes all of these:

- `npm ci`;
- `npm run check`;
- `npm test`;
- `npm audit --omit=dev --audit-level=high`;
- `npm run smoke` with uploaded MP4/receipt proof.

After merge, run the workflow manually to produce the Windows installer and portable artifact. A later `v0.4.0` tag may use the same packaging path.
