const WITNESS_DISPOSITION_POLICY = 'toaster-witness-disposition-v1';

function deriveWitnessDisposition(capsule) {
  const dispositions = [];
  for (const pressure of capsule?.pressures || []) {
    if (dispositions.length >= 3) break;
    if (pressure.kind === 'coverage-explore') {
      dispositions.push({
        kind: 'attention',
        target: pressure.target,
        evidenceRefs: [...pressure.evidenceRefs],
      });
    } else if (pressure.kind === 'relationship-favor') {
      dispositions.push({
        kind: 'fixation',
        target: pressure.target,
        evidenceRefs: [...pressure.evidenceRefs],
      });
    } else if (pressure.kind === 'saturation-avoid') {
      dispositions.push({
        kind: 'fatigue',
        target: pressure.avoids || pressure.target,
        evidenceRefs: [...pressure.evidenceRefs],
      });
    }
  }
  return {
    policy: WITNESS_DISPOSITION_POLICY,
    capsuleSha256: capsule?.capsuleSha256 || null,
    dispositions,
  };
}

module.exports = {
  WITNESS_DISPOSITION_POLICY,
  deriveWitnessDisposition,
};
