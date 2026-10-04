# LISTENER × LOOK-TWICE-001

Issue: #316

## Question

Can AutoDisco v20's isolated first-listen protocol add useful diagnostic evidence to difficult Haunted Toaster Listener placements without contaminating the first hearing or granting that hearing placement authority?

This experiment is deliberately outside ordinary Toaster production behavior.

## Crossing

```text
difficult Listener region
        |
        v
AutoDisco AUDIO WINDOW
sample-exact bounded carrier
        |
        +------------------+
        |                  |
   isolated ear A      isolated ear B
        |                  |
        +--------+---------+
                 |
          SEALED FIRSTS
                 |
       only now may Toaster
       hypotheses be revealed
                 |
          support annotation
                 |
       later human correction
                 |
        diagnostic receipt
```

## Donor boundary

The experiment does **not** reimplement AutoDisco's window or sealed-first-listen verification.

The executable receiver imports the donor's own:

- `verifyAudioWindow`
- `verifyAudioPair`
- `verifyAudioFirstResponses`

The CI witness pins the inspected AutoDisco v20 carrier at:

```text
the-static-collective/The-AutodiscoV.20.-question-marks-
7ad77a46debc7e8c05fc7434c9091f3e36870651
```

The Toaster owns only the post-seal diagnostic receipt and its local interpretation.

```text
AUTODISCO SEMANTICS STAY DONOR-OWNED
DONOR VERIFICATION != TOASTER PLACEMENT AUTHORITY
```

## Receipt

`full-measure.listener-look-twice-receipt/v0` binds:

- exact source/window/audio digests and sample-bounded window identity;
- exact AutoDisco pair identity;
- both immutable sealed first responses;
- rival Listener placement hypotheses admitted only after the seal;
- human post-seal support annotations referencing first-response observation indices;
- later human correction;
- a mechanically derived descriptive result;
- `authority: diagnostic-only`.

Current result vocabulary:

- `both-support`
- `one-support`
- `mixed`
- `misdirected`
- `no-signal`
- `candidate-only-no-direct-match`
- `unresolved`

None of those states may move a lyric.

## Evidence classes

### `contract-fixture`

Used by CI to prove the crossing, hashing, refusals, and receipt shape.

It is always:

```text
empirical_eligible = false
```

Synthetic sealed text in the contract test is not represented as a real listening event.

### `field`

Reserved for actual isolated first-listen artifacts produced by the donor workflow.

The receiver refuses obvious fixture/test/mock model identities from being relabeled as field evidence.

That is a guardrail, not a claim of cryptographic model-execution attestation. Origin authenticity remains donor-owned.

## Hard laws

```text
SAME AUDIO WINDOW != SHARED CONTEXT
FIRST LISTEN PRECEDES CROSS-READ
LISTENER EVIDENCE MUST NOT ENTER FIRST-LISTEN PACKETS
SEALED FIRST RESPONSE != PLACEMENT AUTHORITY
DIAGNOSTIC SUPPORT != HUMAN CORRECTION
HUMAN ANCHOR REMAINS AUTHORITATIVE
CONTRACT FIXTURE != FIELD EVIDENCE
AUTODISCO SEMANTICS STAY DONOR-OWNED
```

## Run the contract witness

Check out the pinned AutoDisco donor beside this repository and set:

```bash
AUTODISCO_V20_ROOT=/path/to/The-AutodiscoV.20.-question-marks- \
  node --test experiments/listener-look-twice-001/listener-look-twice.test.mjs
```

The GitHub Actions witness performs this exact cross-repo checkout automatically.

## Field protocol

After the contract is green, choose approximately ten **historical difficult Listener windows**.

Do not cherry-pick only windows that make the idea look good.

For each specimen:

1. freeze the exact disputed audio window;
2. preserve the preexisting Listener rival placements;
3. withhold those placements and lyrics/history from the two first-listen packets;
4. obtain and seal both independent first listens;
5. only after sealing, reveal the Listener hypotheses;
6. annotate whether specific untouched observations support a candidate, remain ambiguous, conflict, or provide no signal;
7. record the eventual human correction independently;
8. freeze the diagnostic receipt.

The question is not whether the fresh ears are poetic or persuasive.

The question is:

> Did uncontaminated hearing preserve information that would have helped distinguish the eventual human-corrected placement?

## Stop condition

Do not wire this into ordinary Listener placement merely because the architecture is elegant.

First collect field receipts.

If repeated specimens show no useful signal, preserve the experiment and stop.

If they do show useful signal, the next design question is how to expose that evidence to a human reviewer while keeping:

```text
TESTIMONY != AUTHORITY
```

No Listener thresholds, VisualScore, ResolvedTimeline, renderer behavior, KEEP behavior, or production runtime dependency change in this slice.
