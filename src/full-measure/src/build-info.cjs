// Source-mode provenance. Packaging replaces this file with a witnessed build manifest.
const packageInfo = require("../package.json");
const { deriveBuildCapabilities } = require("./build-capabilities.cjs");

const derived = deriveBuildCapabilities();

module.exports = Object.freeze({
  version: packageInfo.version,
  commit: "source",
  builtAt: null,
  sourceMode: true,
  rendererProfileGeneration: derived.rendererProfileGeneration,
  capabilities: [...derived.capabilities],
  topologyCompilers: derived.topologyCompilers,
  semanticCompilers: derived.semanticCompilers,
});
