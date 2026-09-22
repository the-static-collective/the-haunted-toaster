# NUKLEAR PANTRY EXCHANGE-001 — Blender → Toaster (experimental)

This is the Toaster-side child of TOASTER-PANTRY-001, built on its branch and the existing VSPantry. The producer is Blender's experimental N1 Alchemical Compiler; the separate Blender Pantry improvement branch remains independent.

## Current executable boundary

The importer at src/video-pantry/blender-exchange.cjs accepts three **explicit local files**: a Blender alchemy MP4, its Blender render receipt and the Blender exchange JSON. It checks receipt-byte digest, producer recipe/snapshot/ordered participant claims, completed status, actual media SHA-256 and byte length before admission. The existing MP4/WebM VSPantry machinery still owns the actual video specimen identity, probing and deduplication.

Only after admission does the importer archive the manifest, original producer receipt and a compact local exchange entry under TOASTER_HOME/VSPantry/exchanges/v1/MANIFEST_SHA256. It saves a regular TOASTER-PANTRY-001 recipe proposal with this imported specimen as an ingredient and a proposed clip-luma-texture-v1 digestion, without promoting Blender recipe fields to renderer authority.

Developer CLI:

    node src/full-measure/scripts/import-blender-exchange.cjs \
      --toaster-home /path/to/actual/toaster-home \
      --manifest /path/to/alchemy.exchange.json \
      --receipt /path/to/alchemy.mp4.receipt.json \
      --video /path/to/alchemy.mp4

Use the same Toaster home that the desktop application uses. The CLI cannot determine Electron userData without a running application.

## Explicit nonclaims

- Neither recipe manifest nor saved Toaster proposal executes a video render or enters the accepted VisualScore/ResolvedTimeline chain.
- The manifest's artist-proposed relation is not an observed physical relationship. Its source-image SHA fields are producer claims; the Toaster importer verifies imported MP4 bytes and receipt/manifest consistency, but does not pretend that it had the Blender originals.
- The producer receipt may contain the Blender machine's absolute output path. It is retained **locally** for historical verification; do not sync/publish this receipt archive without deliberate review.
- SHA-256 is content identity, not proof of who authored the source or that the rights/likeness consent was granted.
- This is a developer CLI and library. No menu, packaged desktop import, direct Blender shot export, automatic candidate selection, or AgentBroko runtime integration is included.
- If archiving fails after VSPantry admission, the media may remain in the catalogue *without* an exchange claim. Rerun import to reconcile; do not fabricate completed provenance.

## Verification

    node --test src/full-measure/tests/blender-pantry-exchange.test.cjs
    npm run verify

Synthetic consumer fixtures exercise external JSON in the same wire format Blender emits, including key-order variation. Blender's companion CI executes a **real** FFmpeg alchemy preview through the producer exporter and checks tampered sources/receipts/video. Cross-application installed UI/render testing and the cooked-dish round trip remain separate gates tracked in TOASTER-PANTRY-002.
