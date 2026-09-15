const {
  deepFreeze,
  hashCanonical,
} = require("../generation/canonical.cjs");

const FOREIGN_MATERIAL_LIFECYCLE_SCHEMA = "haunted-toaster/foreign-material-lifecycle/v1";
const FOREIGN_MATERIAL_LIFECYCLE_POLICY = "foreign-material-lifecycle-v1";
const FOREIGN_MATERIAL_LIFECYCLE_HASH_DOMAIN = "HauntedToaster-ForeignMaterialLifecycle-v1";
const FUTURE_PRESSURE_KINDS = new Set([
  "constraint",
  "affordance",
  "candidate-input",
]);

function nonEmptyString(value, label) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new TypeError(`${label} is required.`);
  return normalized;
}

function normalizeVideoBinding(videoBinding) {
  if (!videoBinding) return null;
  if (!videoBinding || typeof videoBinding !== "object" || Array.isArray(videoBinding)) {
    throw new TypeError("Foreign-material lifecycle requires an admitted Video binding object.");
  }
  const sourceSpecimenId = nonEmptyString(videoBinding.specimenId, "Video specimenId");
  const sourceSha256 = nonEmptyString(videoBinding.sourceSha256, "Video sourceSha256").toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(sourceSha256)) {
    throw new TypeError("Video sourceSha256 must be a lowercase SHA-256 digest.");
  }
  const sourceByteLength = Number(videoBinding.byteLength);
  if (!Number.isSafeInteger(sourceByteLength) || sourceByteLength <= 0) {
    throw new TypeError("Video byteLength must be a positive safe integer.");
  }
  if (!videoBinding.probe || typeof videoBinding.probe !== "object" || Array.isArray(videoBinding.probe)) {
    throw new TypeError("Video probe evidence is required.");
  }
  return {
    sourceSpecimenId,
    sourceSha256,
    sourceByteLength,
    sourceProbe: structuredClone(videoBinding.probe),
    bindingSchema: String(videoBinding.schema || "").trim() || null,
  };
}

function normalizeSourcePointers(sourcePointers = {}) {
  if (!sourcePointers || typeof sourcePointers !== "object" || Array.isArray(sourcePointers)) {
    throw new TypeError("Lifecycle sourcePointers must be an object.");
  }
  return {
    currentSpineHead: String(sourcePointers.currentSpineHead || "").trim() || null,
    witnessRef: String(sourcePointers.witnessRef || "").trim() || null,
  };
}

function assimilationStage(binding, foreignMaterialPlan, compilerEvidence) {
  if (!foreignMaterialPlan || !compilerEvidence) {
    return {
      status: "unresolved",
      sourceSpecimenId: binding.sourceSpecimenId,
      planHash: foreignMaterialPlan?.planHash || null,
      operatorId: foreignMaterialPlan?.assimilationPolicy?.operatorId || null,
      compilerEvidence: false,
    };
  }
  if (foreignMaterialPlan.sourceSpecimenId !== binding.sourceSpecimenId) {
    throw new TypeError("Foreign-material plan specimen identity does not match the admitted Video binding.");
  }
  if (foreignMaterialPlan.sourceSha256 !== binding.sourceSha256) {
    throw new TypeError("Foreign-material plan source SHA does not match the admitted Video binding.");
  }
  const planHash = nonEmptyString(foreignMaterialPlan.planHash, "Foreign-material planHash");
  const operatorId = nonEmptyString(
    foreignMaterialPlan.assimilationPolicy?.operatorId,
    "Foreign-material operatorId",
  );
  if (compilerEvidence.planHash !== planHash) {
    throw new TypeError("Foreign-material compiler evidence does not match the admitted planHash.");
  }
  if (compilerEvidence.sourceSpecimenId !== binding.sourceSpecimenId) {
    throw new TypeError("Foreign-material compiler evidence does not match the admitted specimen.");
  }
  if (compilerEvidence.operatorId !== operatorId) {
    throw new TypeError("Foreign-material compiler evidence does not match the admitted operator.");
  }
  return {
    status: "supported",
    sourceSpecimenId: binding.sourceSpecimenId,
    planHash,
    clipAnalysisHash: foreignMaterialPlan.clipAnalysisHash || null,
    operatorId,
    compilerEvidence: true,
  };
}

function residueStage(binding, assimilation, residueEvidence) {
  if (!residueEvidence) {
    return {
      status: "absent",
      sourceSpecimenId: binding.sourceSpecimenId,
      kind: null,
      receiptId: null,
      planHash: assimilation.planHash || null,
    };
  }
  if (!residueEvidence || typeof residueEvidence !== "object" || Array.isArray(residueEvidence)) {
    throw new TypeError("Foreign-material residue evidence must be an object.");
  }
  const sourceSpecimenId = nonEmptyString(
    residueEvidence.sourceSpecimenId,
    "Residue sourceSpecimenId",
  );
  if (sourceSpecimenId !== binding.sourceSpecimenId) {
    throw new TypeError("Foreign-material residue is not attributable to the admitted specimen.");
  }
  const planHash = nonEmptyString(residueEvidence.planHash, "Residue planHash");
  if (!assimilation.planHash || planHash !== assimilation.planHash) {
    throw new TypeError("Foreign-material residue is not attributable to the assimilated plan.");
  }
  return {
    status: "supported",
    sourceSpecimenId,
    kind: nonEmptyString(residueEvidence.kind, "Residue kind"),
    receiptId: nonEmptyString(residueEvidence.receiptId, "Residue receiptId"),
    planHash,
  };
}

function futurePressureStage(binding, residue, futurePressureEvidence) {
  if (!futurePressureEvidence) {
    return {
      status: "absent",
      sourceSpecimenId: binding.sourceSpecimenId,
      kind: null,
      evidenceId: null,
      residueRef: residue.receiptId || null,
      effectRef: null,
    };
  }
  if (residue.status !== "supported") {
    throw new TypeError("Future pressure cannot be attributable without retained residue evidence.");
  }
  if (
    !futurePressureEvidence ||
    typeof futurePressureEvidence !== "object" ||
    Array.isArray(futurePressureEvidence)
  ) {
    throw new TypeError("Foreign-material future-pressure evidence must be an object.");
  }
  const sourceSpecimenId = nonEmptyString(
    futurePressureEvidence.sourceSpecimenId,
    "Future-pressure sourceSpecimenId",
  );
  if (sourceSpecimenId !== binding.sourceSpecimenId) {
    throw new TypeError("Future pressure is not attributable to the admitted specimen.");
  }
  const residueRef = nonEmptyString(futurePressureEvidence.residueRef, "Future-pressure residueRef");
  if (residueRef !== residue.receiptId) {
    throw new TypeError("Future pressure does not cite the retained residue it claims to descend from.");
  }
  const kind = nonEmptyString(futurePressureEvidence.kind, "Future-pressure kind");
  if (!FUTURE_PRESSURE_KINDS.has(kind)) {
    throw new TypeError(`Unsupported future-pressure kind: ${kind}.`);
  }
  return {
    status: "supported",
    sourceSpecimenId,
    kind,
    evidenceId: nonEmptyString(futurePressureEvidence.evidenceId, "Future-pressure evidenceId"),
    residueRef,
    effectRef: nonEmptyString(futurePressureEvidence.effectRef, "Future-pressure effectRef"),
  };
}

function lifecycleDisposition({ assimilation, residue, futurePressure }) {
  if (assimilation.status !== "supported") {
    return { result: "unresolved", reason: "assimilation-not-attributable" };
  }
  if (residue.status !== "supported") {
    return { result: "refuses", reason: "no-attributable-residue" };
  }
  if (futurePressure.status !== "supported") {
    return { result: "refuses", reason: "no-attributable-future-pressure" };
  }
  return {
    result: "supports",
    reason: "attributable-residue-changes-later-possibility",
  };
}

function projectForeignMaterialLifecycle({
  videoBinding = null,
  foreignMaterialPlan = null,
  compilerEvidence = null,
  residueEvidence = null,
  futurePressureEvidence = null,
  sourcePointers = {},
} = {}) {
  const binding = normalizeVideoBinding(videoBinding);
  if (!binding) return null;

  const encountered = {
    status: "supported",
    sourceSpecimenId: binding.sourceSpecimenId,
    sourceSha256: binding.sourceSha256,
    sourceByteLength: binding.sourceByteLength,
    sourceProbe: binding.sourceProbe,
    sourceCoordinate: `content:${binding.sourceSpecimenId}`,
  };
  const admitted = {
    status: "supported",
    sourceSpecimenId: binding.sourceSpecimenId,
    bindingSchema: binding.bindingSchema,
    authority: "evidence-only",
  };
  const assimilated = assimilationStage(binding, foreignMaterialPlan, compilerEvidence);
  const residue = residueStage(binding, assimilated, residueEvidence);
  const futurePressure = futurePressureStage(binding, residue, futurePressureEvidence);
  const disposition = lifecycleDisposition({
    assimilation: assimilated,
    residue,
    futurePressure,
  });

  const core = {
    schema: FOREIGN_MATERIAL_LIFECYCLE_SCHEMA,
    policyVersion: FOREIGN_MATERIAL_LIFECYCLE_POLICY,
    sourceSpecimenId: binding.sourceSpecimenId,
    stages: {
      encountered,
      admitted,
      assimilated,
      residue,
      futurePressure,
    },
    result: disposition.result,
    reason: disposition.reason,
    sourcePointers: normalizeSourcePointers(sourcePointers),
    authority: {
      grantsTimelineAuthority: false,
      grantsRendererAuthority: false,
      grantsLearningAuthority: false,
    },
  };

  return deepFreeze({
    ...core,
    projectionHash: hashCanonical(core, FOREIGN_MATERIAL_LIFECYCLE_HASH_DOMAIN),
  });
}

module.exports = {
  FOREIGN_MATERIAL_LIFECYCLE_HASH_DOMAIN,
  FOREIGN_MATERIAL_LIFECYCLE_POLICY,
  FOREIGN_MATERIAL_LIFECYCLE_SCHEMA,
  FUTURE_PRESSURE_KINDS,
  projectForeignMaterialLifecycle,
};
