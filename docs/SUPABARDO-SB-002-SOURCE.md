# SupaBardo SB-002 source proposal

This branch contributes the **foreign creative specimen** for SupaBardo's second bounded crossing.

The payload is intentionally a proposal, not a render:

```text
Toaster candidate proposal
        |
        | no KEEP
        | no render authority
        v
     reLATTE crossing
        |
        v
     SupaBardo WAIT
        |
        v
destination-local
KEEP / HOLD / REFUSE
```

The proposal is grounded in Toaster's existing candidate flow, where a focused candidate is explicitly `KEEP`ed before `executionForRender` is available.

SB-002 therefore tests a different semantic family from SB-001:

- SB-001: software-world receipt → destination-local ADMIT;
- SB-002: creative proposal → destination-local KEEP/HOLD/REFUSE.

For the first live SB-002 ceremony the conservative destination disposition is **HOLD**. The operator authorized the experiment, but did not select this creative candidate for KEEP.

```text
RUN THE EXPERIMENT != KEEP THE ART
HOLD != REFUSE
HOLD != KEEP
PROPOSAL != RENDER AUTHORITY
```

The proposal remains available for a later explicit human KEEP or REFUSE without rewriting the Bardo history.
