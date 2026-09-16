const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const generation = require("../src/generation/index.cjs");
const { CONSTRAINTS_BY_PRESET } = require("../src/candidate-session.cjs");
const { createMemoryService } = require("../src/memory/memory-service.cjs");

async function fixture() {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "toaster-memory-service-rescue-"));
  const outputDir = path.join(rootDir, "output");
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, "song.mp4");
  const receiptPath = path.join(outputDir, "song.video-receipt.json");
  const scorePath = path.join(outputDir, "song.score.json");
  const timelinePath = path.join(outputDir, "song.timeline.json");
  await fs.writeFile(outputPath, "video");

  const scoreArtifact = generation.createVisualScore({
    seed: "memory-service-current-spine-score",
    constraints: CONSTRAINTS_BY_PRESET.openField,
  });
  await fs.writeFile(scorePath, JSON.stringify(scoreArtifact.score));
  await fs.writeFile(timelinePath, JSON.stringify({ schema: "haunted-toaster/resolved-timeline/v1" }));
  const receipt = {
    schema: "full-measure.video-receipt.v1",
    createdAt: "2026-08-22T23:00:00.000Z",
    treatment: {
      title: "Memory Service Rescue Song",
      artist: "Static",
      garment: { id: "openField" },
      toastFeel: { id: "wire-heat" },
      sections: [
        { index: 0, label: "verse", startSeconds: 0, endSeconds: 10, energy: 0.25 },
        { index: 1, label: "chorus", startSeconds: 10, endSeconds: 20, energy: 0.8 },
      ],
    },
    render: {
      witnessWindow: { policyVersion: "witness-window-v1", width: 1920, height: 1080 },
      visualCompiler: { topology: scoreArtifact.score.topology, operators: [] },
    },
    output: { filename: "song.mp4", sha256: "abc", sizeBytes: 5 },
    validation: { accepted: true },
  };
  await fs.writeFile(receiptPath, JSON.stringify(receipt));
  const renderResult = {
    outputPath,
    receiptPath,
    scorePath,
    timelinePath,
    srtPath: null,
    vttPath: null,
    receipt,
  };
  const service = createMemoryService({ rootProvider: () => rootDir });
  const archived = await service.archiveSuccessfulRender(renderResult);
  return { service, archived, scoreArtifact };
}

test("current-spine memory service exposes safe Past Toasts and exact Re-toast ancestry", async () => {
  const { service, archived, scoreArtifact } = await fixture();
  let [toast] = await service.listPastToasts();
  assert.equal(toast.receiptSha256, archived.receiptSha256);
  assert.equal(toast.title, "Memory Service Rescue Song");
  assert.equal(toast.latestVerdict, null);
  assert.equal(Object.hasOwn(toast, "original"), false);
  assert.equal(Object.hasOwn(toast, "artifacts"), false);

  await service.submitVerdict({
    renderReceiptSha256: archived.receiptSha256,
    rating: 5,
    disposition: "keep",
    wouldReToast: true,
    now: () => new Date("2026-08-22T23:01:00.000Z"),
    uuid: () => "rescue-verdict",
  });
  toast = await service.getPastToast(archived.receiptSha256);
  assert.equal(toast.latestVerdict.rating, 5);
  assert.ok(toast.availableArtifacts.includes("receipt"));
  assert.ok(toast.availableArtifacts.includes("score"));
  assert.ok(toast.availableArtifacts.includes("timeline"));

  const ancestor = await service.resolveReToastAncestor(archived.receiptSha256);
  assert.equal(ancestor.receiptSha256, archived.receiptSha256);
  assert.equal(ancestor.scoreAddress, scoreArtifact.address);
  assert.deepEqual(ancestor.score, scoreArtifact.score);
});

test("current-spine memory service refuses arbitrary artifact kinds", async () => {
  const { service, archived } = await fixture();
  const receipt = await service.resolveArtifact({ receiptSha256: archived.receiptSha256, kind: "receipt" });
  assert.equal(receipt.exists, true);
  assert.ok(receipt.path.endsWith("receipt.json"));
  await assert.rejects(
    service.resolveArtifact({ receiptSha256: archived.receiptSha256, kind: "../../secret" }),
    /unknown archived artifact kind/i,
  );
});
