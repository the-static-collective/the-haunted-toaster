# Receipt Memory + Witness Loop — Execution Order

The reviewed Slice B plan executes in this order:

1. immutable receipt archive;
2. append-only human verdicts;
3. deterministic memory projection;
4. MemoryCapsule + Influence Trace + witness disposition;
5. one bounded memory-influenced candidate lane + explicit Re-toast ancestry;
6. witness encounter receipts + memory service;
7. narrow Electron IPC integration;
8. Past Toasts/rating/Re-toast UI;
9. Thoughtline UI;
10. canonical browser witness states;
11. full verification and packaged filesystem witness.

Foundation tasks 1–4 do not depend on renderer changes and are the preferred first implementation batch.
