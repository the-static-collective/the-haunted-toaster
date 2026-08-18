const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "src", "renderer", "index.html"), "utf8");
const script = fs.readFileSync(path.join(root, "src", "renderer", "past-toasts-ui.js"), "utf8");

function toast(overrides = {}) {
  return {
    receiptSha256: "a".repeat(64),
    createdAt: "2026-08-17T21:10:00.000Z",
    title: "Dreamstate Divide",
    artist: "The Static Collective",
    visualIdentity: { garmentId: "openField", toastFeelId: "wire-heat", topology: "split-horizon" },
    features: ["topology:split-horizon", "toastFeel:wire-heat"],
    availability: { receipt: true, score: true, timeline: true, srt: false, vtt: false, video: true },
    availableArtifacts: ["receipt", "score", "timeline", "video"],
    latestVerdict: { rating: 4, disposition: "keep", wouldReToast: true },
    ...overrides,
  };
}

async function setup(toasts = []) {
  const dom = new JSDOM(html, {
    runScripts: "outside-only",
    url: "http://localhost/",
    pretendToBeVisual: true,
  });
  const calls = { verdicts: [], arms: [], clears: 0, opens: [], generations: 0 };
  let current = toasts.map((item) => structuredClone(item));
  dom.window.fullMeasure = {
    listPastToasts: async () => current.map((item) => structuredClone(item)),
    getPastToast: async (receiptSha256) => structuredClone(current.find((item) => item.receiptSha256 === receiptSha256)),
    submitToastVerdict: async (config) => {
      calls.verdicts.push(structuredClone(config));
      const target = current.find((item) => item.receiptSha256 === config.renderReceiptSha256);
      target.latestVerdict = {
        rating: config.rating,
        disposition: config.disposition,
        wouldReToast: config.wouldReToast,
      };
      return structuredClone(target.latestVerdict);
    },
    armReToast: async (receiptSha256) => {
      calls.arms.push(receiptSha256);
      return { receiptSha256 };
    },
    clearReToast: async () => {
      calls.clears += 1;
      return true;
    },
    openPastToastArtifact: async (config) => {
      calls.opens.push(structuredClone(config));
      return true;
    },
    generateCandidates: async () => {
      calls.generations += 1;
      return null;
    },
  };
  dom.window.eval(script);
  await new Promise((resolve) => dom.window.setTimeout(resolve, 0));
  return { dom, calls };
}

test("Past Toasts door renders an honest empty state", async () => {
  const { dom } = await setup([]);
  const document = dom.window.document;
  assert.equal(document.querySelector("#pastToastsOpen")?.textContent.trim(), "Past Toasts");
  document.querySelector("#pastToastsOpen").click();
  await new Promise((resolve) => dom.window.setTimeout(resolve, 0));
  assert.equal(document.querySelector("#pastToastsDrawer")?.classList.contains("is-hidden"), false);
  assert.match(document.querySelector("#pastToastsList")?.textContent || "", /No past toasts yet/i);
});

test("Past Toast card exposes proof, exactly five rating choices, and missing-media truth", async () => {
  const missing = toast({
    availability: { receipt: true, score: true, timeline: true, srt: false, vtt: false, video: false },
    availableArtifacts: ["receipt", "score", "timeline"],
  });
  const { dom, calls } = await setup([missing]);
  const document = dom.window.document;
  document.querySelector("#pastToastsOpen").click();
  await new Promise((resolve) => dom.window.setTimeout(resolve, 0));

  const card = document.querySelector(`[data-past-toast="${missing.receiptSha256}"]`);
  assert.ok(card);
  assert.match(card.textContent, /Dreamstate Divide/);
  assert.match(card.textContent, /Video unavailable/);
  assert.equal(card.querySelectorAll("[data-toast-rating]").length, 5);
  assert.equal(card.querySelector('[data-toast-artifact="receipt"]')?.disabled, false);
  assert.equal(card.querySelector('[data-toast-artifact="video"]')?.disabled, true);

  card.querySelector('[data-toast-rating="5"]').click();
  card.querySelector('[data-toast-disposition="weird"]').click();
  card.querySelector('[data-toast-would-retoast]').checked = true;
  card.querySelector('[data-toast-save-verdict]').click();
  await new Promise((resolve) => dom.window.setTimeout(resolve, 0));
  assert.deepEqual(calls.verdicts[0], {
    renderReceiptSha256: missing.receiptSha256,
    rating: 5,
    disposition: "weird",
    wouldReToast: true,
  });

  card.querySelector('[data-toast-artifact="receipt"]').click();
  await new Promise((resolve) => dom.window.setTimeout(resolve, 0));
  assert.deepEqual(calls.opens[0], {
    receiptSha256: missing.receiptSha256,
    kind: "receipt",
    reveal: false,
  });
});

test("Re-toast arms ancestry, closes history, and never auto-generates", async () => {
  const specimen = toast();
  const { dom, calls } = await setup([specimen]);
  const document = dom.window.document;
  let eventDetail = null;
  dom.window.addEventListener("toaster-retoast-armed", (event) => {
    eventDetail = event.detail;
  });
  document.querySelector("#pastToastsOpen").click();
  await new Promise((resolve) => dom.window.setTimeout(resolve, 0));
  document.querySelector(`[data-past-toast="${specimen.receiptSha256}"] [data-toast-retoast]`).click();
  await new Promise((resolve) => dom.window.setTimeout(resolve, 0));

  assert.deepEqual(calls.arms, [specimen.receiptSha256]);
  assert.equal(calls.generations, 0);
  assert.equal(document.querySelector("#pastToastsDrawer").classList.contains("is-hidden"), true);
  assert.equal(document.querySelector("#retoastBadge")?.classList.contains("is-hidden"), false);
  assert.match(document.querySelector("#retoastBadge")?.textContent || "", /Re-toast armed.*Dreamstate Divide/i);
  assert.equal(eventDetail.receiptSha256, specimen.receiptSha256);
  assert.equal(eventDetail.title, specimen.title);

  document.querySelector("#retoastClear").click();
  await new Promise((resolve) => dom.window.setTimeout(resolve, 0));
  assert.equal(calls.clears, 1);
  assert.equal(document.querySelector("#retoastBadge").classList.contains("is-hidden"), true);
});
