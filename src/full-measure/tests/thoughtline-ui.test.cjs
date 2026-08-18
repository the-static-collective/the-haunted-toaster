const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const root = path.resolve(__dirname, "..");
const script = fs.readFileSync(path.join(root, "src", "renderer", "thoughtline-ui.js"), "utf8");
const candidateUi = fs.readFileSync(path.join(root, "src", "renderer", "candidate-ui.js"), "utf8");
const memoryCss = fs.readFileSync(path.join(root, "src", "renderer", "memory-ui.css"), "utf8");

function trace() {
  return {
    schema: "haunted-toaster/influence-trace/v1",
    policy: "toaster-influence-trace-v1",
    capsuleSha256: "c".repeat(64),
    familyHash: "family-1",
    traceSha256: "d".repeat(64),
    nodes: [
      { id: "song", type: "current-song", label: "dense song", ref: "song:abc" },
      { id: "memory", type: "prior-toast", label: "Dreamstate Divide", ref: "render:" + "1".repeat(64) },
      { id: "candidate", type: "candidate", label: "split-horizon", candidateIndex: 5 },
    ],
    edges: [
      { from: "memory", to: "candidate", relation: "favored", evidenceRefs: ["render:" + "1".repeat(64), "verdict:v1"] },
      { from: "song", to: "candidate", relation: "underexplored", evidenceRefs: ["archive-cut:" + "a".repeat(64)] },
    ],
  };
}

function setup() {
  const dom = new JSDOM(`<!doctype html><body><button class="candidate-launch" type="button">six-up</button></body>`, {
    runScripts: "outside-only",
    url: "http://localhost/",
    pretendToBeVisual: true,
  });
  let generateCalls = 0;
  dom.window.fullMeasure = {
    generateCandidates: async () => {
      generateCalls += 1;
      return null;
    },
  };
  dom.window.eval(script);
  return { dom, getGenerateCalls: () => generateCalls };
}

test("Thoughtline renders exact bounded trace entities and evidence-backed edges", () => {
  const { dom } = setup();
  const { window } = dom;
  window.dispatchEvent(new window.CustomEvent("toaster-influence-trace", { detail: trace() }));
  const open = window.document.querySelector("#thoughtlineOpen");
  assert.ok(open);
  assert.equal(open.disabled, false);
  open.click();

  assert.equal(window.document.querySelectorAll("[data-thoughtline-node]").length, 3);
  assert.equal(window.document.querySelectorAll("[data-thoughtline-edge]").length, 2);
  for (const edge of window.document.querySelectorAll("[data-thoughtline-edge]")) {
    assert.match(edge.dataset.relation, /favored|underexplored/);
    assert.ok(Number(edge.dataset.evidenceCount) >= 1);
  }

  window.document.querySelector('[data-thoughtline-edge][data-relation="favored"]').dispatchEvent(
    new window.MouseEvent("click", { bubbles: true }),
  );
  const inspector = window.document.querySelector("#thoughtlineInspector");
  assert.match(inspector.textContent, /favored/i);
  assert.match(inspector.textContent, /render:/i);
  assert.match(inspector.textContent, /verdict:v1/i);
});

test("hiding and reopening Thoughtline changes no generation behavior", () => {
  const { dom, getGenerateCalls } = setup();
  const { window } = dom;
  window.dispatchEvent(new window.CustomEvent("toaster-influence-trace", { detail: trace() }));
  const before = getGenerateCalls();
  window.document.querySelector("#thoughtlineOpen").click();
  window.document.querySelector("#thoughtlineClose").click();
  window.document.querySelector("#thoughtlineOpen").click();
  assert.equal(getGenerateCalls(), before);
});

test("candidate UI publishes exact family trace and clears it with candidate state", () => {
  assert.match(candidateUi, /toaster-influence-trace/);
  assert.match(candidateUi, /detail:\s*view\.influenceTrace\s*\|\|\s*null/);
  assert.match(candidateUi, /detail:\s*null/);
});

test("Thoughtline honors reduced-motion preference in production CSS", () => {
  assert.match(memoryCss, /prefers-reduced-motion:\s*reduce/);
  assert.match(memoryCss, /thoughtline/);
});
