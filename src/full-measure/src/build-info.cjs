// Source-mode provenance. Packaging replaces this file with a witnessed build manifest.
const { execFileSync } = require("node:child_process");
const path = require("node:path");
const packageInfo = require("../package.json");
const { deriveBuildCapabilities } = require("./build-capabilities.cjs");

const root = path.resolve(__dirname, "..");

function gitValue(args) {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

const derived = deriveBuildCapabilities();
const commit = gitValue(["rev-parse", "HEAD"]) || "unknown";
const dirty = Boolean(gitValue(["status", "--porcelain"]));

module.exports = Object.freeze({
  version: packageInfo.version,
  commit,
  dirty,
  builtAt: null,
  sourceMode: true,
  rendererProfileGeneration: derived.rendererProfileGeneration,
  capabilities: [...derived.capabilities],
  topologyCompilers: derived.topologyCompilers,
  semanticCompilers: derived.semanticCompilers,
});
