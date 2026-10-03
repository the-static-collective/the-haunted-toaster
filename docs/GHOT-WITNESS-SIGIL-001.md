# GHoT Witness Sigil 001

This is a deliberately small Haunted Toaster execution aperture.

It exposes one existing deterministic Toaster instrument through a generic GHoT external-adapter manifest:

```text
canonical SHA-256 digest
        ↓
Haunted Toaster witness-sigil/v0.1
        ↓
SVG + recipe + Toaster receipt
```

The adapter does not render a music video and does not imply KEEP.

It uses the existing canonical witness-sigil implementation rather than duplicating that visual grammar in GHoT.

## Capability

`creative.toaster.witness-sigil`

Input:

- `digest`: canonical lowercase SHA-256 digest;
- `output_dir`: optional bounded output directory; when omitted, the executing body writes beneath its own `GHOT_HOME`;
- `basename`: safe local filename stem.

Outputs:

- deterministic SVG;
- deterministic recipe JSON;
- Toaster adapter receipt.

## Laws

```text
WITNESS SIGIL != AUTHENTICATION
DIGEST != INTERPRETATION
PROJECTION != SOURCE AUTHORITY
GHOT EXECUTION != TOASTER CONTINUATION VERDICT
```

The GHoT bridge executes the Toaster. It does not own the projection semantics.

For remote execution, the adapter also returns the bounded SVG, recipe, and receipt bytes inline with their hashes. A caller therefore does not need shared filesystem access to the executing body.
