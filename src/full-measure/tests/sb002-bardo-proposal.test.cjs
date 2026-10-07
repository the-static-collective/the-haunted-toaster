const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "../../..");
const PROPOSAL = path.join(ROOT, "experiments", "supabardo-sb002-001", "proposal.json");
const SMOKE = path.join(ROOT, "src", "full-measure", "scripts", "smoke-candidates.cjs");

test("SB-002 proposal remains unresolved and non-render-authoritative", () => {
  const proposal = JSON.parse(fs.readFileSync(PROPOSAL, "utf8"));

  assert.equal(proposal.schema, "toaster.candidate-proposal/v0");
  assert.equal(proposal.specimen, "SB-002");
  assert.equal(proposal.state.proposal_only, true);
  assert.equal(proposal.state.source_selected_candidate, false);
  assert.equal(proposal.state.destination_disposition, null);
  assert.equal(proposal.state.render_authority, false);
  assert.deepEqual(proposal.destination_choices, ["KEEP", "HOLD", "REFUSE"]);
  assert.equal(proposal.requested_effect.destination_disposition, "local");
  assert.equal(proposal.requested_effect.automatic_keep, false);
  assert.equal(proposal.requested_effect.automatic_render, false);
  assert.ok(proposal.laws.includes("PROPOSAL != KEEP"));
  assert.ok(proposal.laws.includes("SOURCE != DESTINATION AUTHORITY"));
});

test("existing Toaster candidate flow requires KEEP before render handoff", () => {
  const source = fs.readFileSync(SMOKE, "utf8");

  const selectAt = source.indexOf("session.select(");
  const keepAt = source.indexOf("session.keep(");
  const executionAt = source.indexOf("session.executionForRender(");
  const renderAt = source.indexOf("renderVideo({");

  assert.notEqual(selectAt, -1);
  assert.notEqual(keepAt, -1);
  assert.notEqual(executionAt, -1);
  assert.notEqual(renderAt, -1);
  assert.ok(selectAt < keepAt, "selection must occur before explicit KEEP");
  assert.ok(keepAt < executionAt, "KEEP must precede render execution handoff");
  assert.ok(executionAt < renderAt, "render execution must be resolved before render");
});

test("HOLD leaves the proposal non-render-authoritative", () => {
  const proposal = JSON.parse(fs.readFileSync(PROPOSAL, "utf8"));
  const held = structuredClone(proposal);
  held.state.destination_disposition = "HOLD";

  assert.equal(held.state.render_authority, false);
  assert.equal(held.state.source_selected_candidate, false);
  assert.ok(held.destination_choices.includes("KEEP"));
  assert.ok(held.destination_choices.includes("REFUSE"));
});
