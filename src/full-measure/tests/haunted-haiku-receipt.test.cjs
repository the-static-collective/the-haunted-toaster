const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const receiptModule = require("../src/render/receipt.cjs");

function specimenReceipt(overrides = {}) {
  return {
    schema: "full-measure.video-receipt.v1",
    receiptId: "haunted-haiku-proof",
    source: {
      filename: "rearrange-the-light.wav",
      sha256: "1".repeat(64),
    },
    canonicalExecution: {
      timelineHash: "2".repeat(64),
    },
    treatment: {
      title: "Rearrange the Light",
      artist: "The Static Collective",
      garment: { id: "openField", name: "Open Field" },
      toastFeel: { id: "low-and-slow", name: "Low & Slow" },
    },
    output: {
      filename: "rearrange-the-light.mp4",
      sha256: "3".repeat(64),
      sizeBytes: 4096,
    },
    validation: {
      accepted: true,
    },
    ...overrides,
  };
}

test("Haunted Haiku receipt decorator is an explicit downstream capability", () => {
  assert.equal(
    typeof receiptModule.decorateReceiptWithHauntedHaiku,
    "function",
    "receipt.cjs should expose a deterministic Haunted Haiku decorator",
  );
});

test("accepted video receipts get deterministic descriptive-only YouTube copy", () => {
  const decorate = receiptModule.decorateReceiptWithHauntedHaiku;
  assert.equal(typeof decorate, "function");

  const first = specimenReceipt();
  const second = specimenReceipt();
  const firstPublication = decorate(first);
  const secondPublication = decorate(second);

  assert.deepEqual(firstPublication, secondPublication);
  assert.equal(first.publication.hauntedHaiku.schema, "haunted-haiku/v1");
  assert.equal(first.publication.hauntedHaiku.authority, "descriptive-only");
  assert.equal(first.publication.hauntedHaiku.lines.length, 3);
  assert.ok(first.publication.hauntedHaiku.lines.every((line) => line.length > 0));
  assert.equal(first.publication.hauntedHaiku.seedSha256.length, 64);
  assert.match(
    first.publication.hauntedHaiku.youtubeDescription,
    /Rearrange the Light · Haunted Toaster specimen · The Static Collective/,
  );
  assert.match(
    first.publication.hauntedHaiku.youtubeDescription,
    /#HauntedToaster #TheStaticCollective #ExperimentalVideo/,
  );
  assert.ok(
    first.publication.hauntedHaiku.youtubeDescription.startsWith(
      first.publication.hauntedHaiku.lines.join("\n"),
    ),
  );
});

test("unaccepted receipts are not given publication copy", () => {
  const decorate = receiptModule.decorateReceiptWithHauntedHaiku;
  assert.equal(typeof decorate, "function");

  const receipt = specimenReceipt({ validation: { accepted: false } });
  assert.equal(decorate(receipt), null);
  assert.equal(receipt.publication, undefined);
});

test("writeReceipt persists Haunted Haiku only after accepted completion", async () => {
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "haunted-haiku-test-"));
  try {
    const outputPath = path.join(tempDirectory, "specimen.mp4");
    const receipt = specimenReceipt();
    const receiptPath = await receiptModule.writeReceipt(receipt, outputPath);
    const written = JSON.parse(await fs.readFile(receiptPath, "utf8"));

    assert.equal(written.publication.hauntedHaiku.authority, "descriptive-only");
    assert.equal(written.publication.hauntedHaiku.lines.length, 3);
    assert.match(written.publication.hauntedHaiku.youtubeDescription, /Haunted Toaster specimen/);
  } finally {
    await fs.rm(tempDirectory, { recursive: true, force: true });
  }
});
