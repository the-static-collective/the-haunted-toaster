const test = require("node:test");
const assert = require("node:assert/strict");

const {
  NEXTGEN_SCHEMA,
  NEXTGEN_RECEIPT_SCHEMA,
  ORGANS,
  PIPELINE,
  createNextGenProfile,
  sealNextGenProfile,
} = require("../src/nextgen/profile.cjs");

function passingEvidence() {
  return Object.fromEntries(
    PIPELINE.map((key) => [
      key,
      {
        repo:ORGANS[key].repo,
        ref:ORGANS[key].ref,
        sha:ORGANS[key].sha,
        status:"pass",
        proof:"focused-runtime-proof:" + key,
      },
    ]),
  );
}

test("NextGen profile is a bounded organ pipeline, not a branch merge", () => {
  const profile = createNextGenProfile();
  assert.equal(profile.schema, NEXTGEN_SCHEMA);
  assert.equal(profile.authority, "integration-plan-only");
  assert.deepEqual(profile.pipeline, [
    "listener",
    "listeningEye",
    "videoDigestion",
    "memoryPrism",
    "frankenComposer",
    "blender",
    "playdeck",
    "batchConsole",
    "census",
  ]);
  assert.equal(profile.organs.listener.authority, "diagnostic-only");
  assert.equal(profile.organs.listeningEye.authority, "influence-only");
  assert.equal(profile.organs.videoDigestion.authority, "proposal-only");
  assert.ok(profile.laws.includes("RUNTIME PASS != PRODUCT GRADUATION"));
});

test("same runtime evidence seals the same receipt regardless of evidence object order", () => {
  const evidence = passingEvidence();
  const reversed = Object.fromEntries(Object.entries(evidence).reverse());
  const kernelSha = "f".repeat(40);
  const first = sealNextGenProfile({kernelSha, evidence});
  const second = sealNextGenProfile({kernelSha, evidence:reversed});

  assert.equal(first.schema, NEXTGEN_RECEIPT_SCHEMA);
  assert.equal(first.status, "runtime-proofs-passed");
  assert.equal(first.receiptHash, second.receiptHash);
  assert.deepEqual(first.evidence, second.evidence);
});

test("seal refuses a branch whose tested SHA differs from the pinned organ", () => {
  const evidence = passingEvidence();
  evidence.videoDigestion.sha = "0".repeat(40);
  assert.throws(
    () => sealNextGenProfile({kernelSha:"f".repeat(40), evidence}),
    /videoDigestion SHA does not match/,
  );
});

test("seal refuses missing or non-passing runtime evidence", () => {
  const missing = passingEvidence();
  delete missing.playdeck;
  assert.throws(
    () => sealNextGenProfile({kernelSha:"f".repeat(40), evidence:missing}),
    /Missing runtime evidence for organ playdeck/,
  );

  const failed = passingEvidence();
  failed.memoryPrism.status = "fail";
  assert.throws(
    () => sealNextGenProfile({kernelSha:"f".repeat(40), evidence:failed}),
    /memoryPrism did not pass runtime proof/,
  );
});
