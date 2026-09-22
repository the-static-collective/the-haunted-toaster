"use strict";

// Explicit local laboratory: HTML timeline -> Chromium screenshots -> FFmpeg MP4.
// This is not an invocation or certification of the hosted HyperFrames service.
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const { pathToFileURL } = require("node:url");
const { chromium } = require("@playwright/test");
const { resolveFfmpeg, runProcess } = require("../render/tooling.cjs");
const { hashFile, admitVideo } = require("../video-pantry/admit.cjs");
const { loadCatalog } = require("../video-pantry/catalog.cjs");
const { videoPantryCatalogPath } = require("../toaster-home.cjs");
const {
  buildKitchenSpecimen,
  compileHyperFramesProjection,
  renderHyperFramesHtml,
} = require("./hyperkitchen-hyperframes.cjs");

const RENDER_RECEIPT_SCHEMA = "haunted-toaster/hyperkitchen-local-projection-receipt/v1";

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

async function assertSource({ rootDir, videoPath, exchangeEntryPath = null }) {
  const selected = path.resolve(videoPath);
  const catalogPath = videoPantryCatalogPath(rootDir);
  const hash = await hashFile(selected);
  const specimenId = "sha256:" + hash.sha256 + ":" + hash.byteLength;
  const catalog = await loadCatalog(catalogPath);
  const admitted = catalog.specimens.find((item) => item.specimenId === specimenId);
  if (!admitted || !admitted.paths.some((name) => path.resolve(name) === selected)) {
    throw new TypeError("HyperKitchen requires this exact video path to be admitted in the existing VSPantry.");
  }
  if (admitted.sourceSha256 !== hash.sha256 || admitted.byteLength !== hash.byteLength) {
    throw new Error("Admitted source identity differs from observed video bytes.");
  }
  if (admitted.probe?.hasAudio !== false) {
    throw new TypeError("HyperKitchen v1 requires a separately probed silent Blender clip.");
  }
  let exchangeManifestSha256 = null;
  if (exchangeEntryPath) {
    const entryFile = path.resolve(exchangeEntryPath);
    const entry = JSON.parse(await fs.readFile(entryFile, "utf8"));
    if (entry.schema !== "haunted-toaster/blender-pantry-exchange-entry/v1"
      || entry.specimenId !== specimenId || entry.videoSha256 !== hash.sha256
      || entry.videoByteLength !== hash.byteLength
      || entry.renderAuthority !== "none"
      || entry.status !== "catalogued-for-proposal"
      || !/^[a-f0-9]{64}$/.test(entry.manifestSha256)) {
      throw new TypeError("Blender exchange entry disagrees with this admitted source.");
    }
    const archiveDir = path.join(path.resolve(rootDir), "VSPantry", "exchanges", "v1", entry.manifestSha256);
    if (entryFile !== path.join(archiveDir, "entry.json")) {
      throw new TypeError("Exchange entry must be the existing archived evidence file.");
    }
    const manifestBytes = await fs.readFile(path.join(archiveDir, "manifest.json"));
    if (sha256(manifestBytes) !== entry.manifestSha256) {
      throw new TypeError("Blender exchange manifest bytes are missing or corrupt.");
    }
    exchangeManifestSha256 = entry.manifestSha256;
  }
  return { specimenId, hash, exchangeManifestSha256, catalogPath };
}

async function renderHyperKitchen({
  rootDir, videoPath, exchangeEntryPath = null, events = undefined,
  durationMs = 1000, seed = 0, frameParameters = undefined,
  pulseParameters = undefined,
  ffmpegPath = resolveFfmpeg(), chromiumImpl = chromium,
} = {}) {
  if (!rootDir || !videoPath) throw new TypeError("HyperKitchen needs a Toaster home and admitted video path.");
  const home = path.resolve(rootDir);
  const input = await assertSource({ rootDir: home, videoPath, exchangeEntryPath });
  const specimenInput = {
    sourceSha256: input.hash.sha256,
    byteLength: input.hash.byteLength,
    durationMs, seed,
  };
  if (events !== undefined) specimenInput.events = events;
  if (frameParameters !== undefined) specimenInput.frameParameters = frameParameters;
  if (pulseParameters !== undefined) specimenInput.pulseParameters = pulseParameters;
  const { spec, specimenId } = buildKitchenSpecimen(specimenInput);
  if (input.hash.byteLength > 150 * 1024 * 1024) {
    throw new RangeError("Experimental HyperKitchen v1 limits video input to 150 MiB.");
  }
  const durationAvailableMs = Math.floor(Number(
    (await loadCatalog(input.catalogPath)).specimens.find((x) => x.specimenId === input.specimenId).probe?.durationSeconds,
  ) * 1000);
  if (!Number.isFinite(durationAvailableMs) || durationAvailableMs < spec.timing.durationMs + 50) {
    throw new RangeError("Source clip does not contain the complete requested projection window.");
  }
  const model = compileHyperFramesProjection({
    spec, sourceSpecimenId: input.specimenId,
    exchangeManifestSha256: input.exchangeManifestSha256,
  });
  const html = renderHyperFramesHtml(model);
  const dest = path.join(home, "HyperKitchen", "projections", model.projectionId);
  const priorReceiptPath = path.join(dest, "render.receipt.json");

  async function previousIfIntact() {
    try {
      const previous = JSON.parse(await fs.readFile(priorReceiptPath, "utf8"));
      const videoHash = await hashFile(path.join(dest, "render.mp4"));
      if (previous.schema !== RENDER_RECEIPT_SCHEMA
        || previous.status !== "scoped_complete"
        || previous.projectionId !== model.projectionId
        || previous.output.sha256 !== videoHash.sha256
        || previous.output.byteLength !== videoHash.byteLength
        || previous.sourceSpecimenId !== input.specimenId) {
        throw new Error("Existing HyperKitchen projection has changed; immutable output refused.");
      }
      return previous;
    } catch (error) {
      if (error.code === "ENOENT") return null;
      throw error;
    }
  }

  const prior = await previousIfIntact();
  if (prior) return { receipt: prior, path: path.join(dest, "render.mp4"), reused: true };

  const tempBase = path.join(home, "HyperKitchen", "tmp");
  await fs.mkdir(tempBase, { recursive: true });
  const temp = await fs.mkdtemp(path.join(tempBase, "projection-"));
  let browser;
  try {
    const assets = path.join(temp, "assets");
    const framesDir = path.join(temp, "rendered");
    await fs.mkdir(assets);
    await fs.mkdir(framesDir);
    const extraction = [
      "-nostdin", "-v", "error", "-y",
      "-i", path.resolve(videoPath), "-t", String(model.durationMs / 1000),
      "-vf", "fps=24,scale=320:180:force_original_aspect_ratio=decrease,"
        + "pad=320:180:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1",
      "-start_number", "0", path.join(assets, "frame-%04d.png"),
    ];
    await runProcess(ffmpegPath, extraction);
    const frames = (await fs.readdir(assets)).filter((file) => /^frame-[0-9]{4}\.png$/.test(file));
    if (frames.length !== model.frameBudget) {
      throw new Error("Source video frame materialization differs from finite HyperFood frame budget.");
    }
    const sourceRecheck = await hashFile(path.resolve(videoPath));
    if (sourceRecheck.sha256 !== input.hash.sha256 || sourceRecheck.byteLength !== input.hash.byteLength) {
      throw new Error("Blender source video changed during frame extraction.");
    }
    await fs.writeFile(path.join(temp, "index.html"), html);
    await fs.writeFile(path.join(temp, "specimen.json"), JSON.stringify(spec, null, 2) + "\n");
    await fs.writeFile(path.join(temp, "projection.json"), JSON.stringify(model, null, 2) + "\n");

    browser = await chromiumImpl.launch({ headless: true });
    const browserVersion = browser.version();
    const page = await browser.newPage({ viewport: { width: 320, height: 180 },
      deviceScaleFactor: 1, reducedMotion: "reduce" });
    await page.route("**/*", (route) => route.request().url().startsWith("file:")
      ? route.continue() : route.abort());
    await page.goto(pathToFileURL(path.join(temp, "index.html")).href, { waitUntil: "load" });
    const detected = await page.evaluate(() => ({
      identity: window.__hyperkitchen?.model?.projectionId,
      timeline: typeof window.__timelines?.[window.__hyperkitchen?.model?.projectionId]?.seek,
    }));
    if (detected.identity !== model.projectionId || detected.timeline !== "function") {
      throw new Error("HyperFrames HTML timeline registration or projection identity is missing.");
    }
    for (const frame of model.frames) {
      const actual = await page.evaluate(async (tMs) => {
        const index = window.__hyperkitchen.draw(tMs / 1000);
        const images = [...document.querySelectorAll(".layer img")]
          .filter((img) => img.parentNode.style.display !== "none");
        await Promise.all(images.map((img) => img.decode()));
        return index;
      }, frame.tMs);
      if (actual !== frame.index) throw new Error("HTML timeline diverged from canonical HyperFood frame order.");
      await page.locator("#stage").screenshot({
        path: path.join(framesDir, "frame-" + String(frame.index).padStart(4, "0") + ".png"),
        animations: "disabled",
      });
    }
    await browser.close();
    browser = null;
    await runProcess(ffmpegPath, [
      "-nostdin", "-v", "error", "-y", "-framerate", "24",
      "-start_number", "0", "-i", path.join(framesDir, "frame-%04d.png"),
      "-frames:v", String(model.frameBudget), "-an",
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
      path.join(temp, "render.mp4"),
    ]);
    const output = await hashFile(path.join(temp, "render.mp4"));
    const sourceFinalCheck = await hashFile(path.resolve(videoPath));
    if (sourceFinalCheck.sha256 !== input.hash.sha256
      || sourceFinalCheck.byteLength !== input.hash.byteLength) {
      throw new Error("Blender source video changed before HyperKitchen receipt.");
    }
    const receipt = {
      schema: RENDER_RECEIPT_SCHEMA,
      status: "scoped_complete",
      claim: "local Chromium HTML-trace projection of two existing HyperFood organisms",
      nonclaims: [
        "This MP4 is not a hosted HyperFrames render or a HyperFrames lint/inspect witness.",
        "Source creative relation is artist-proposed; source-image bytes are not independently checked here.",
        "No accepted Toaster song timeline, candidate or video phrase plan was changed.",
        "Specimen/trace identity does not imply byte-identical output across renderer environments.",
      ],
      authority: "experimental-projection-only",
      specimenId,
      projectionId: model.projectionId,
      traceSha256: model.traceSha256,
      sourceSpecimenId: input.specimenId,
      sourceSha256: input.hash.sha256,
      sourceByteLength: input.hash.byteLength,
      exchangeManifestSha256: input.exchangeManifestSha256,
      organismLineage: model.graphLineage,
      events: spec.timing.events,
      adapter: model.adapter,
      renderer: { id: "local-chromium-offline/v1", browserVersion,
        ffmpegBinary: path.basename(ffmpegPath), fps: model.fps,
        width: model.width, height: model.height, frameCount: model.frameBudget },
      output: { filename: "render.mp4", sha256: output.sha256, byteLength: output.byteLength },
      determinism: {
        specimen: "canonical-hyperfood-identity",
        timeline: "fixed-absolute-frame-trace",
        pixels: "not-independently-replayed",
        encodedBytes: "not-independently-replayed",
      },
    };
    await fs.writeFile(path.join(temp, "render.receipt.json"), JSON.stringify(receipt, null, 2) + "\n");
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.rename(temp, dest); // One atomic same-filesystem promotion of complete evidence.
    const admitted = await admitVideo(path.join(dest, "render.mp4"), {
      catalogPath: input.catalogPath, persist: true,
    });
    if (admitted.binding.sourceSha256 !== output.sha256
      || admitted.binding.byteLength !== output.byteLength) {
      throw new Error("Rendered child VSPantry admission differs from the signed-off local output bytes.");
    }
    return { receipt, path: path.join(dest, "render.mp4"),
      childSpecimenId: admitted.binding.specimenId, reused: false };
  } finally {
    if (browser) await browser.close().catch(() => {});
    await fs.rm(temp, { recursive: true, force: true }).catch(() => {});
  }
}

module.exports = { RENDER_RECEIPT_SCHEMA, assertSource, renderHyperKitchen };
