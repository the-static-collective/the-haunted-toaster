const base = require("./render-base.cjs");
const { buildVisualCompilerEvidence } = require("./visual-compiler-evidence.cjs");

module.exports = {
  ...base,
  buildVisualCompilerEvidence,
};
