// Source-mode provenance. Packaging replaces this file with a witnessed build manifest.
const packageInfo = require("../package.json");

module.exports = Object.freeze({
  version: packageInfo.version,
  commit: "source",
  builtAt: null,
  sourceMode: true,
  rendererProfileGeneration: "toaster-raster-1",
  capabilities: [],
});
