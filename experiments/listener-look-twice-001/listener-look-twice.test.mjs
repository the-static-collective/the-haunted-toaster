import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import {
  buildDiagnosticReceipt,
  deriveDiagnosticResult,
  loadAutodiscoV20,
} from "./listener-look-twice.mjs";

const DONOR_REPOSITORY = "the-static-collective/The-AutodiscoV.20.-question-marks-";
const DONOR_COMMIT = "7ad77a46debc7e8c05fc7434c9091f3e36870651";

function wavHeader(dataBytes) {
  const sampleRate = 44_100;
  const channels = 2;
  const bits = 16;
  const bytesPerFrame = channels * (bits / 8);
  const buffer = Buffer.alloc(44);
  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write("WAVE", 8, "ascii");
  buffer.write("fmt ", 12, "ascii");
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * bytesPerFrame, 28);
  buffer.writeUInt16LE(bytesPerFrame, 32);
  buffer.writeUInt16LE(bits, 34);
  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(dataBytes, 40);
  return buffer;
}

async function donorModules(root) {
  const audioWindow = await import(
    pathToFileURL(path.join(root, "scripts", "audio-window.mjs")).href
  );
  const lookTwice = await import(
    pathToFileURL(path.join(root, "scripts", "audio-look-twice.mjs")).href
  );
  return { audioWindow, lookTwice };
}

async function contractFixture() {
  const donorRoot = process.env.AUTODISCO_V20_ROOT;
  assert.ok(donorRoot, "AUTODISCO_V20_ROOT must point at the pinned v20 checkout");

  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "listener-look-twice-"));
  const sourcePath = path.join(temporary, "fixture.wav");
  const frames = 44_100 * 2;
  const pcm = Buffer.alloc(frames * 4);
  await fs.writeFile(sourcePath, Buffer.concat([wavHeader(pcm.length), pcm]));

  const { audioWindow, lookTwice } = await donorModules(donorRoot);
  const verifier = await loadAutodiscoV20(donorRoot);
  const window = await audioWindow.buildAudioWindow({
    schema: "autodisco.audio-window-request/v0",
    source_path: sourcePath,
    start_ms: 250,
    end_ms: 1250,
    declared_metadata: {
      window_label: "contract fixture only",
    },
  });
  const pair = lookTwice.prepareAudioLookTwice({
    schema: "autodisco.audio-look-twice-prepare-request/v0",
    window,
  });

  const responses = pair.packets.map((packet, index) =>
    lookTwice.sealAudioFirstResponse(
      pair,
      packet.packet_id,
      {
        observations: [
          {
            mode: "OBSERVED",
            text: index === 0
              ? "A compact event appears in the latter half of the window."
              : "The window contains two distinguishable temporal regions.",
          },
          {
            mode: "DERIVED",
            text: index === 0
              ? "The latter region may be the stronger return point."
              : "Either region could plausibly anchor a repeated phrase.",
          },
        ],
        lingering_intrigue: true,
        closing_line: index === 0
          ? "The later region carries more structural weight."
          : "The two regions remain distinguishable.",
      },
      "fixture-contract-only",
    )
  );

  return {
    cleanup: () => fs.rm(temporary, { recursive: true, force: true }),
    verifier,
    window,
    pair,
    responses,
  };
}

function requestFor(fixture, overrides = {}) {
  return {
    schema: "full-measure.listener-look-twice-request/v0",
    donor: {
      repository: DONOR_REPOSITORY,
      commit: DONOR_COMMIT,
    },
    evidence_class: "contract-fixture",
    window: fixture.window,
    pair: fixture.pair,
    first_responses: fixture.responses,
    listener_hypotheses: {
      schema: "full-measure.listener-placement-hypotheses/v0",
      line_id: "line-17",
      lyric_text_sha256: "0".repeat(64),
      candidates: [
        {
          id: "candidate-a",
          start_ms: 350,
          end_ms: 520,
          status: "medium",
          confidence: 0.66,
        },
        {
          id: "candidate-b",
          start_ms: 820,
          end_ms: 990,
          status: "low",
          confidence: 0.58,
        },
      ],
    },
    support_annotations: [
      {
        listener_id: fixture.responses[0].listener.id,
        disposition: "supports-candidate",
        candidate_id: "candidate-b",
        observation_indices: [0, 1],
        note: "Post-seal human annotation only; no placement authority.",
      },
      {
        listener_id: fixture.responses[1].listener.id,
        disposition: "ambiguous",
        candidate_id: null,
        observation_indices: [0, 1],
        note: "First listen distinguishes regions but does not choose.",
      },
    ],
    human_correction: {
      kind: "candidate",
      candidate_id: "candidate-b",
      start_ms: null,
      note: "Contract fixture correction.",
    },
    ...overrides,
  };
}

test("freezes a donor-verified diagnostic receipt only after two sealed first listens", async () => {
  const fixture = await contractFixture();
  try {
    const receipt = buildDiagnosticReceipt(requestFor(fixture), fixture.verifier);
    assert.equal(receipt.schema, "full-measure.listener-look-twice-receipt/v0");
    assert.equal(receipt.diagnostic_result, "one-support");
    assert.equal(receipt.authority, "diagnostic-only");
    assert.equal(receipt.evidence_class, "contract-fixture");
    assert.equal(receipt.empirical_eligible, false);
    assert.equal(receipt.sealed_first_responses.length, 2);
    assert.equal(receipt.window_ref.window_id, fixture.window.window_id);
    assert.equal(receipt.pair_id, fixture.pair.pair_id);
    assert.match(receipt.receipt_id, /^full-measure-listener-look-twice-v0:[0-9a-f]{64}$/);
  } finally {
    await fixture.cleanup();
  }
});

test("refuses fewer than two sealed first listens before Listener hypotheses can cross", async () => {
  const fixture = await contractFixture();
  try {
    const request = requestFor(fixture, {
      first_responses: [fixture.responses[0]],
    });
    assert.throws(
      () => buildDiagnosticReceipt(request, fixture.verifier),
      /REQUIRES_TWO_SEALED_RESPONSES/,
    );
  } finally {
    await fixture.cleanup();
  }
});

test("donor-native verification refuses a tampered sealed first response", async () => {
  const fixture = await contractFixture();
  try {
    const tampered = structuredClone(fixture.responses);
    tampered[0].response.observations[0].text = "tampered after seal";
    const request = requestFor(fixture, { first_responses: tampered });
    assert.throws(
      () => buildDiagnosticReceipt(request, fixture.verifier),
      /ID_MISMATCH/,
    );
  } finally {
    await fixture.cleanup();
  }
});

test("contract fixtures cannot be relabeled as empirical field evidence", async () => {
  const fixture = await contractFixture();
  try {
    const request = requestFor(fixture, { evidence_class: "field" });
    assert.throws(
      () => buildDiagnosticReceipt(request, fixture.verifier),
      /CONTRACT_FIXTURE_CANNOT_BECOME_FIELD_EVIDENCE/,
    );
  } finally {
    await fixture.cleanup();
  }
});

test("diagnostic result remains descriptive and mechanically separate from correction", () => {
  assert.equal(
    deriveDiagnosticResult(
      [
        { disposition: "supports-candidate", candidate_id: "b" },
        { disposition: "supports-candidate", candidate_id: "b" },
      ],
      { kind: "candidate", candidate_id: "b" },
    ),
    "both-support",
  );
  assert.equal(
    deriveDiagnosticResult(
      [
        { disposition: "supports-candidate", candidate_id: "a" },
        { disposition: "supports-candidate", candidate_id: "b" },
      ],
      { kind: "candidate", candidate_id: "b" },
    ),
    "mixed",
  );
  assert.equal(
    deriveDiagnosticResult(
      [
        { disposition: "ambiguous", candidate_id: null },
        { disposition: "no-signal", candidate_id: null },
      ],
      { kind: "candidate", candidate_id: "b" },
    ),
    "no-signal",
  );
});
