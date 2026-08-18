const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { buildCandidateCreativeContext } = require("../src/creative-context-providers.cjs");

const root = path.resolve(__dirname, "..");
const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const analysis = readJson("fixtures/analysis/sectional.v1.json");
const constraints = readJson("constraints/porchlight.v2.json");

test("candidate context contains required song and garment boundaries", () => {
  const table = buildCandidateCreativeContext({ analysis, constraints });
  const ids = table.entries.map((entry) => entry.providerId);
  assert.ok(ids.includes("source/song"));
  assert.ok(ids.includes("constraint/garment"));
  assert.equal(table.entries.find((entry) => entry.providerId === "source/song").required, true);
  assert.equal(
    table.entries.find((entry) => entry.providerId === "constraint/garment").authorityClass,
    "constraint",
  );
});

test("Native Color and receipt memory appear only when truthfully available", () => {
  const table = buildCandidateCreativeContext({
    analysis,
    constraints,
    nativeChromaticProfile: {
      schema: "haunted-toaster/native-chromatic-profile/v1",
      profileSha256: "a".repeat(64),
      dominant: [12, 34, 56],
    },
    memoryInfluence: {
      policy: "toaster-memory-influence-v1",
      target: "paletteLogic:duotone",
      reason: "positive-verdict-pressure",
    },
  });
  const image = table.entries.find((entry) => entry.providerId === "source/image-native-color");
  const memory = table.entries.find((entry) => entry.providerId === "memory/receipt-v1");
  assert.equal(image.authorityClass, "creative-material");
  assert.equal(memory.authorityClass, "influence-only");
  assert.deepEqual(memory.payload.target, "paletteLogic:duotone");
});

test("optional providers are absent rather than fabricated when no evidence exists", () => {
  const table = buildCandidateCreativeContext({ analysis, constraints });
  const ids = table.entries.map((entry) => entry.providerId);
  assert.equal(ids.includes("source/image-native-color"), false);
  assert.equal(ids.includes("memory/receipt-v1"), false);
});

test("same normalized evidence produces the same table identity", () => {
  const first = buildCandidateCreativeContext({ analysis, constraints });
  const second = buildCandidateCreativeContext({
    analysis: structuredClone(analysis),
    constraints: structuredClone(constraints),
  });
  assert.equal(first.tableHash, second.tableHash);
});
