const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const uiPath = path.join(__dirname, "..", "src", "renderer", "recent-toasts-ui.js");

function makeDom() {
  return new JSDOM(`
    <section class="home-window recent-toasts-window is-hidden" id="recentToastsWindow">
      <div id="recentToastsList"></div>
      <button id="pastToastsOpen" type="button">View all past toasts →</button>
    </section>
  `);
}

function makeSlateDom() {
  return new JSDOM(`
    <dl>
      <div>
        <dt>Toast Feel</dt>
        <dd id="slateToastFeel">Loading…</dd>
      </div>
    </dl>
  `);
}

test("beta creative-field slate survives later alpha refreshes", async () => {
  const { applyBetaHomeSlate } = require(uiPath);
  const dom = makeSlateDom();
  const api = {
    async getBuildInfo() {
      return { capabilities: ["betaCandidateEcologyV1"] };
    },
  };

  assert.equal(await applyBetaHomeSlate({ document: dom.window.document, api }), true);
  const value = dom.window.document.querySelector("#slateToastFeel");
  const label = value.closest("div").querySelector("dt");
  assert.equal(label.textContent, "Creative field");
  assert.equal(value.textContent, "Six-Up field");

  value.textContent = "Loading…";
  label.textContent = "Toast Feel";
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(label.textContent, "Creative field");
  assert.equal(value.textContent, "Six-Up field");
  dom.window.close();
});

test("Recent Toasts stays absent when the receipt-memory bridge does not exist", async () => {
  const { installRecentToasts } = require(uiPath);
  const dom = makeDom();
  const installed = await installRecentToasts({ document: dom.window.document, api: {} });
  assert.equal(installed, false);
  assert.equal(dom.window.document.querySelector("#recentToastsWindow").classList.contains("is-hidden"), true);
});

test("Recent Toasts renders at most three witnessed encounters", async () => {
  const { installRecentToasts } = require(uiPath);
  const dom = makeDom();
  const calls = [];
  const records = [
    { id: "r1", title: "Jubilee", rating: 5, disposition: "keep", mediaAvailable: true, receiptAvailable: true },
    { id: "r2", title: "ice9", rating: 3, disposition: "weird", mediaAvailable: true, receiptAvailable: true },
    { id: "r3", title: "Residual", rating: null, disposition: null, mediaAvailable: false, receiptAvailable: true },
    { id: "r4", title: "Should not render", rating: 1, disposition: "compost", mediaAvailable: true, receiptAvailable: true },
  ];
  const api = {
    async listPastToasts(options) { calls.push(["list", options]); return { toasts: records }; },
    async openPastToast(id) { calls.push(["open", id]); },
    async openPastToasts() { calls.push(["all"]); },
  };

  assert.equal(await installRecentToasts({ document: dom.window.document, api }), true);
  const window = dom.window.document.querySelector("#recentToastsWindow");
  const rows = [...dom.window.document.querySelectorAll(".recent-toast-row")];
  assert.equal(window.classList.contains("is-hidden"), false);
  assert.equal(rows.length, 3);
  assert.match(rows[0].textContent, /Jubilee/);
  assert.match(rows[0].textContent, /5\/5/);
  assert.match(rows[0].textContent, /KEEP/);
  assert.match(rows[2].textContent, /media missing/i);
  assert.deepEqual(calls[0], ["list", { limit: 3 }]);

  rows[0].click();
  dom.window.document.querySelector("#pastToastsOpen").click();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(calls.slice(1), [["open", "r1"], ["all"]]);
});

test("Recent Toasts remains display-only when detail-opening capability is absent", async () => {
  const { installRecentToasts } = require(uiPath);
  const dom = makeDom();
  const api = {
    async listPastToasts() {
      return [{ id: "r1", title: "History", rating: 4, disposition: "keep", mediaAvailable: true, receiptAvailable: true }];
    },
  };

  assert.equal(await installRecentToasts({ document: dom.window.document, api }), true);
  const row = dom.window.document.querySelector(".recent-toast-row");
  assert.equal(row.tagName, "DIV");
  assert.equal(dom.window.document.querySelector("#pastToastsOpen").classList.contains("is-hidden"), true);
});
