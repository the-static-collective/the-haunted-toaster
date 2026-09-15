const crypto = require("node:crypto");
const fs = require("node:fs");
const fsPromises = require("node:fs/promises");
const path = require("node:path");
const {
  buildDogramTraceSource,
  isTraceableVideoReceipt,
} = require("./dogram-trace.cjs");
const { promoteTopologyResponseEvidence } = require("./visual-compiler-evidence.cjs");

const HAUNTED_HAIKU_SCHEMA = "haunted-haiku/v1";
const HAUNTED_HAIKU_TAGS = Object.freeze([
  "#HauntedToaster",
  "#TheStaticCollective",
  "#ExperimentalVideo",
]);
const HAUNTED_HAIKU_LINES = Object.freeze([
  Object.freeze([
    "porch light under daylight",
    "static sleeping in the orchard",
    "rain waiting behind the glass",
    "one lamp awake at noon",
    "empty chairs facing weather",
    "dust moving through blue light",
    "the hallway keeps humming",
    "late snow on the antenna",
    "a window holding thunder",
    "soft wires under moonlight",
    "the kitchen after midnight",
    "one red light in the field",
    "old film breathing slowly",
    "the doorway full of morning",
    "a quiet screen in winter",
    "the room between stations",
  ]),
  Object.freeze([
    "the reflection leaves first",
    "one frame remembers rain",
    "the shadow stays lit",
    "the picture turns before us",
    "the silence misses a beat",
    "the floor keeps yesterday",
    "the signal answers sideways",
    "the second hand walks backward",
    "the curtain moves without wind",
    "the empty chair changes places",
    "the image blinks once",
    "the horizon arrives too early",
    "the echo takes another door",
    "the color refuses its name",
    "the wall keeps one warm spot",
    "the last light comes back",
  ]),
  Object.freeze([
    "the camera does not react",
    "nobody asks it to stop",
    "morning keeps its place",
    "the house keeps the receipt",
    "nothing else moves",
    "the song continues anyway",
    "the room refuses to explain",
    "we keep the frame",
    "the witness stays quiet",
    "the door remains open",
    "the field says nothing",
    "the tape keeps rolling",
    "no one turns around",
    "the light keeps count",
    "the weather passes through",
    "the frame is left intact",
  ]),
]);

async function hashFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

function receiptPathFor(outputPath) {
  const parsed = path.parse(outputPath);
  return path.join(parsed.dir, `${parsed.name}.video-receipt.json`);
}

function dogramPathFor(outputPath) {
  const parsed = path.parse(outputPath);
  return path.join(parsed.dir, `${parsed.name}.dogram.json`);
}

function buildProvenance() {
  const buildInfo = require("../build-info.cjs");
  return Object.freeze({
    version: buildInfo.version,
    commit: buildInfo.commit,
    dirty: Boolean(buildInfo.dirty),
    builtAt: buildInfo.builtAt || null,
    sourceMode: Boolean(buildInfo.sourceMode),
  });
}

function cleanPublicationText(value, maxLength = 160) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function hauntedHaikuSeed(receipt) {
  const basis = [
    receipt?.schema,
    receipt?.source?.sha256,
    receipt?.canonicalExecution?.timelineHash,
    receipt?.output?.sha256,
    receipt?.treatment?.garment?.id,
    receipt?.treatment?.toastFeel?.id,
    receipt?.treatment?.title,
  ]
    .map((value) => String(value || ""))
    .join("\n");
  return crypto.createHash("sha256").update(basis, "utf8").digest("hex");
}

function pickHaikuLine(seedSha256, lineIndex) {
  const options = HAUNTED_HAIKU_LINES[lineIndex];
  const offset = (lineIndex * 14) % (seedSha256.length - 2);
  const sample = Number.parseInt(seedSha256.slice(offset, offset + 2), 16);
  return options[sample % options.length];
}

function decorateReceiptWithHauntedHaiku(receipt) {
  if (
    !receipt ||
    receipt.validation?.accepted !== true ||
    !receipt.output?.sha256
  ) {
    return null;
  }

  const seedSha256 = hauntedHaikuSeed(receipt);
  const lines = HAUNTED_HAIKU_LINES.map((_options, lineIndex) =>
    pickHaikuLine(seedSha256, lineIndex),
  );
  const title = cleanPublicationText(
    receipt.treatment?.title || path.parse(receipt.output.filename || "video").name,
  );
  const artist = cleanPublicationText(receipt.treatment?.artist);
  const provenance = [
    title,
    "Haunted Toaster specimen",
    artist || "The Static Collective",
  ].filter(Boolean);
  const youtubeDescription = [
    lines.join("\n"),
    provenance.join(" · "),
    HAUNTED_HAIKU_TAGS.join(" "),
  ].join("\n\n");
  const hauntedHaiku = {
    schema: HAUNTED_HAIKU_SCHEMA,
    authority: "descriptive-only",
    seedSha256,
    lines,
    provenance: provenance.join(" · "),
    hashtags: [...HAUNTED_HAIKU_TAGS],
    youtubeDescription,
  };

  receipt.publication = {
    ...(receipt.publication || {}),
    hauntedHaiku,
  };
  return hauntedHaiku;
}

function promoteVisualCompilerInReceipt(receipt) {
  if (!receipt?.render?.visualCompiler) return receipt;
  receipt.render.visualCompiler = promoteTopologyResponseEvidence(
    receipt.render.visualCompiler,
  );
  return receipt;
}

async function writeReceipt(receipt, outputPath) {
  promoteVisualCompilerInReceipt(receipt);
  decorateReceiptWithHauntedHaiku(receipt);
  receipt.build = buildProvenance();
  const receiptPath = receiptPathFor(outputPath);
  const dogramPath = dogramPathFor(outputPath);

  if (!isTraceableVideoReceipt(receipt)) {
    await fsPromises.rm(dogramPath, { force: true }).catch(() => {});
    await fsPromises.writeFile(
      receiptPath,
      `${JSON.stringify(receipt, null, 2)}\n`,
      "utf8",
    );
    return receiptPath;
  }

  const dogramTrace = buildDogramTraceSource(receipt);
  await fsPromises.writeFile(
    dogramPath,
    `${JSON.stringify(dogramTrace, null, 2)}\n`,
    "utf8",
  );
  try {
    await fsPromises.writeFile(
      receiptPath,
      `${JSON.stringify(receipt, null, 2)}\n`,
      "utf8",
    );
  } catch (error) {
    await fsPromises.rm(dogramPath, { force: true }).catch(() => {});
    throw error;
  }
  return receiptPath;
}

module.exports = {
  HAUNTED_HAIKU_SCHEMA,
  buildProvenance,
  decorateReceiptWithHauntedHaiku,
  dogramPathFor,
  hashFile,
  hauntedHaikuSeed,
  promoteVisualCompilerInReceipt,
  receiptPathFor,
  writeReceipt,
};
