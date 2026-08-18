const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { archiveSuccessfulRender } = require("../src/memory/receipt-archive.cjs");
const {
  appendWitnessEncounter,
  listWitnessEncounters,
} = require("../src/memory/witness-encounter.cjs");

async function fixture() {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "toaster-witness-"));
  const outputDir = path.join(rootDir, "output");
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, "song.mp4");
  const receiptPath = path.join(outputDir, "song.video-receipt.json");
  await fs.writeFile(outputPath, "video");
  const receipt = {
    schema: "full-measure.video-receipt.v1",
    createdAt: "2026-08-17T21:00:00.000Z",
    treatment: { title: "Witness Song", sections: [{ energy: 0.8 }] },
    render: {
      witnessWindow: {
        policyVersion: "witness-window-v1",
        width: 1920,
        height: 1080,
        sampleAspectRatio: "1:1",
        pixelFormat: "yuv420p",
        alphaPolicy: "flattened-none",
        observableVideoStreams: 1,
      },
    },
    output: { filename: "song.mp4", sha256: "abc", sizeBytes: 5 },
    validation: { accepted: true },
  };
  await fs.writeFile(receiptPath, JSON.stringify(receipt));
  const archived = await archiveSuccessfulRender({
    rootDir,
    renderResult: {
      outputPath,
      receiptPath,
      scorePath: null,
      timelinePath: null,
      srtPath: null,
      vttPath: null,
      receipt,
    },
  });
  return { rootDir, receiptPath, receipt, archived };
}

function memoryContext() {
  return {
    capsule: {
      capsuleSha256: "c".repeat(64),
      currentSongEnergyClass: "dense",
    },
    influenceTrace: { traceSha256: "d".repeat(64) },
    witnessDisposition: {
      policy: "toaster-witness-disposition-v1",
      capsuleSha256: "c".repeat(64),
      dispositions: [
        {
          kind: "attention",
          target: "topology:split-horizon",
          evidenceRefs: ["archive-cut:" + "a".repeat(64)],
        },
      ],
    },
    reToastAncestor: { receiptSha256: "1".repeat(64), scoreAddress: "htvs1_ancestor" },
  };
}

test("witness encounter appends separate evidence without changing render receipt bytes", async () => {
  const { rootDir, receiptPath, receipt, archived } = await fixture();
  const before = await fs.readFile(receiptPath);
  const witness = await appendWitnessEncounter({
    rootDir,
    renderReceiptSha256: archived.receiptSha256,
    renderReceipt: receipt,
    memoryContext: memoryContext(),
    now: () => new Date("2026-08-17T21:01:00.000Z"),
    uuid: () => "witness-1",
  });
  assert.deepEqual(await fs.readFile(receiptPath), before);
  assert.equal(witness.schema, "haunted-toaster/witness-encounter/v1");
  assert.deepEqual(witness.witnessWindow, receipt.render.witnessWindow);
  assert.equal(witness.memoryCapsuleSha256, "c".repeat(64));
  assert.equal(witness.influenceTraceSha256, "d".repeat(64));
  assert.equal(witness.currentSongEnergyClass, "dense");
  assert.equal(witness.disposition.dispositions[0].kind, "attention");
  assert.equal(witness.reToastAncestor.receiptSha256, "1".repeat(64));
  assert.deepEqual(await listWitnessEncounters({ rootDir }), [witness]);
});

test("witness event ids are immutable and unknown render refs are refused", async () => {
  const { rootDir, receipt, archived } = await fixture();
  const base = {
    rootDir,
    renderReceiptSha256: archived.receiptSha256,
    renderReceipt: receipt,
    memoryContext: memoryContext(),
    now: () => new Date("2026-08-17T21:01:00.000Z"),
    uuid: () => "same-witness",
  };
  await appendWitnessEncounter(base);
  await assert.rejects(
    appendWitnessEncounter({
      ...base,
      memoryContext: {
        ...memoryContext(),
        capsule: { ...memoryContext().capsule, capsuleSha256: "e".repeat(64) },
      },
    }),
    /immutable witness id collision/i,
  );
  await assert.rejects(
    appendWitnessEncounter({
      ...base,
      renderReceiptSha256: "f".repeat(64),
      uuid: () => "unknown-render",
    }),
    /unknown render receipt/i,
  );
});
