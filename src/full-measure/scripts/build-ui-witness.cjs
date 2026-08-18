const fs = require("node:fs");
const path = require("node:path");
const packageInfo = require("../package.json");
const { deriveBuildCapabilities } = require("../src/build-capabilities.cjs");
const { UI_WITNESS_POLICY } = require("../src/ui-witness-policy.cjs");

const RENDERER_FILES = Object.freeze([
  "styles.css",
  "candidate-ui.css",
  "listener-transport.css",
  "youtube-publish.css",
  "toast-feel-controller.js",
  "app.js",
  "candidate-ui.js",
  "lyric-foundry-ui.js",
  "sync-keyboard.js",
  "youtube-publish-ui.js",
]);

const WITNESS_FILES = Object.freeze([
  "witness-bridge.js",
  "witness-controller.js",
]);

function attributeValue(value) {
  return String(value || "local").replace(/[^A-Za-z0-9._-]/g, "-");
}

function buildUiWitness({ rootDir, outputDir, commit }) {
  const rendererDir = path.join(rootDir, "src", "renderer");
  const witnessDir = path.join(rootDir, "witness");
  const productionHtml = fs.readFileSync(path.join(rendererDir, "index.html"), "utf8");
  const firstRendererScript = '<script src="./toast-feel-controller.js"></script>';
  if (!productionHtml.includes(firstRendererScript)) {
    throw new Error("Production renderer script seam is missing.");
  }

  const safeCommit = attributeValue(commit);
  const toastFeels = JSON.stringify(require("../src/toast-feels.cjs").listToastFeels())
    .replace(/</g, "\\u003c");
  const derived = deriveBuildCapabilities();
  const buildInfo = JSON.stringify({
    version: packageInfo.version,
    commit: safeCommit,
    sourceMode: true,
    builtAt: null,
    rendererProfileGeneration: derived.rendererProfileGeneration,
    capabilities: [...derived.capabilities],
  }).replace(/</g, "\\u003c");
  const generatedHtml = productionHtml
    .replace("<body>", `<body data-ui-witness-commit="${safeCommit}">`)
    .replace(
      firstRendererScript,
      `<script>window.__uiWitnessToastFeels = ${toastFeels}; window.__uiWitnessBuildInfo = ${buildInfo};</script>\n    <script src="./witness-bridge.js"></script>\n    <script src="./witness-controller.js"></script>\n    ${firstRendererScript}`,
    );

  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "index.html"), generatedHtml, "utf8");

  for (const filename of RENDERER_FILES) {
    fs.copyFileSync(path.join(rendererDir, filename), path.join(outputDir, filename));
  }
  for (const filename of WITNESS_FILES) {
    const source = path.join(witnessDir, filename);
    if (fs.existsSync(source)) {
      fs.copyFileSync(source, path.join(outputDir, filename));
    }
  }

  return Object.freeze({
    outputDir,
    rendererFiles: [...RENDERER_FILES],
    commit: safeCommit,
    policy: UI_WITNESS_POLICY,
  });
}

if (require.main === module) {
  const rootDir = path.resolve(__dirname, "..");
  buildUiWitness({
    rootDir,
    outputDir: path.join(rootDir, "witness-dist"),
    commit: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || "local",
  });
}

module.exports = {
  RENDERER_FILES,
  UI_WITNESS_POLICY,
  buildUiWitness,
};
