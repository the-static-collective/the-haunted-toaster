const witness = require("./test-six-witness.cjs");

function generateTestSixWitnessFamily(options = {}) {
  const { toastFeelId: _surroundingToastFeelId, ...acceptedInputs } = options || {};
  return witness.generateTestSixWitnessFamily({
    ...acceptedInputs,
    toastFeelId: null,
  });
}

module.exports = {
  generateTestSixWitnessFamily,
};
