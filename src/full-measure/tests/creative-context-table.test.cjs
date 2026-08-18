const test = require("node:test");
const assert = require("node:assert/strict");
const generation = require("../src/generation/index.cjs");

function entry(overrides = {}) {
  return {
    providerId: "source/song",
    policyVersion: "song-source-v1",
    evidenceRef: "sha256:" + "1".repeat(64),
    authorityClass: "source-truth",
    ancestryClass: "none",
    allowedDecisions: ["family-composition"],
    required: true,
    availability: "available",
    payload: { analysisHash: "a".repeat(64) },
    ...overrides,
  };
}

test("Creative Context Table normalization is deterministic and provider-order independent", () => {
  const source = entry();
  const memory = entry({
    providerId: "memory/receipt-v1",
    policyVersion: "toaster-memory-influence-v1",
    evidenceRef: "sha256:" + "2".repeat(64),
    authorityClass: "influence-only",
    required: false,
    allowedDecisions: ["coverage", "palette"],
    payload: { policy: "toaster-memory-influence-v1", target: "paletteLogic:duotone" },
  });
  const first = generation.buildCreativeContextTable({ entries: [source, memory] });
  const second = generation.buildCreativeContextTable({ entries: [memory, source] });

  assert.equal(first.schema, generation.CREATIVE_CONTEXT_TABLE_SCHEMA);
  assert.equal(first.tableHash, second.tableHash);
  assert.deepEqual(first.entries, second.entries);
  assert.deepEqual(first.entries.map((item) => item.providerId), ["memory/receipt-v1", "source/song"]);
  assert.equal(Object.isFrozen(first), true);
});

test("contradictory duplicate provider identities are refused", () => {
  assert.throws(
    () => generation.buildCreativeContextTable({
      entries: [entry(), entry({ evidenceRef: "sha256:" + "9".repeat(64) })],
    }),
    /duplicate creative context provider source\/song/i,
  );
});

test("unknown authority classes are refused", () => {
  assert.throws(
    () => generation.buildCreativeContextTable({
      entries: [entry({ authorityClass: "wizard-authority" })],
    }),
    /unknown creative context authority class/i,
  );
});

test("required unavailable evidence refuses while optional unavailable evidence is explicit", () => {
  assert.throws(
    () => generation.buildCreativeContextTable({
      entries: [entry({ availability: "unavailable" })],
    }),
    /required creative context provider source\/song is unavailable/i,
  );

  const table = generation.buildCreativeContextTable({
    entries: [
      entry(),
      entry({
        providerId: "memory/receipt-v1",
        evidenceRef: null,
        authorityClass: "influence-only",
        required: false,
        availability: "unavailable",
        payload: null,
      }),
    ],
  });
  assert.equal(
    generation.findCreativeContextEntry(table, "memory/receipt-v1").availability,
    "unavailable",
  );
});
