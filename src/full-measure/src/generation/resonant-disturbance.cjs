const {
  canonicalStringify,
  deepFreeze,
  hashCanonical,
} = require("./canonical.cjs");

const RESONANT_DISTURBANCE_POLICY = "resonant-disturbance-v0";
const DISTURBANCE_BODY_SCHEMA = "haunted-toaster/resonant-disturbance-body/v0";
const DISTURBANCE_PRESSURE_SCHEMA = "haunted-toaster/resonant-disturbance-pressure/v0";
const DISTURBANCE_PLAN_SCHEMA = "haunted-toaster/resonant-disturbance-plan/v0";
const DISTURBANCE_EVENT_KINDS = Object.freeze([
  "pressure", "threshold-cross", "transfer", "recoil", "terminal",
]);
const DISTURBANCE_TERMINALS = Object.freeze(["settled", "exhausted", "refused"]);

const BODY_KEYS = new Set(["schema", "policyVersion", "bodyId", "cells", "couplings", "maxEvents"]);
const CELL_KEYS = new Set(["id", "initialLoad", "threshold", "recoil"]);
const COUPLING_KEYS = new Set(["id", "sourceCellId", "targetCellId", "transfer"]);
const PRESSURE_KEYS = new Set(["schema", "policyVersion", "sourceRef", "targetCellId", "amount", "authority"]);
const PRESSURE_AUTHORITIES = new Set(["fixture", "testimony-only", "influence-only"]);

function ownDataValue(object, key) {
  const descriptor = Object.getOwnPropertyDescriptor(object, key);
  if (!descriptor || !Object.hasOwn(descriptor, "value")) {
    throw new TypeError(`Expected data property ${key}.`);
  }
  return descriptor.value;
}

function assertPlainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be a plain object.`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${label} must be a plain object.`);
  }
  return value;
}

function assertExactKeys(object, allowed, label) {
  for (const key of Reflect.ownKeys(object)) {
    if (typeof key !== "string" || !allowed.has(key)) {
      throw new TypeError(`${label} contains unknown field ${String(key)}.`);
    }
  }
}

function assertSafeInteger(value, label, { positive = false, nonNegative = false } = {}) {
  if (!Number.isSafeInteger(value)) throw new TypeError(`${label} must be a safe integer.`);
  if (positive && value <= 0) throw new TypeError(`${label} must be positive.`);
  if (nonNegative && value < 0) throw new TypeError(`${label} must be non-negative.`);
  return value;
}

function assertNonEmptyString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
  return value;
}

function assertIdentity(actual, expected, label) {
  if (actual !== expected) throw new TypeError(`${label} must be ${expected}.`);
  return actual;
}

function arrayDataValues(value, label, { nonEmpty = false } = {}) {
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array.`);
  if (nonEmpty && value.length === 0) throw new TypeError(`${label} must be non-empty.`);
  const output = [];
  for (let index = 0; index < value.length; index += 1) {
    output.push(ownDataValue(value, String(index)));
  }
  return output;
}

function normalizeCell(value, index) {
  const label = `body.cells[${index}]`;
  const cell = assertPlainObject(value, label);
  assertExactKeys(cell, CELL_KEYS, label);
  return {
    id: assertNonEmptyString(ownDataValue(cell, "id"), `${label}.id`),
    initialLoad: assertSafeInteger(ownDataValue(cell, "initialLoad"), `${label}.initialLoad`, { nonNegative: true }),
    threshold: assertSafeInteger(ownDataValue(cell, "threshold"), `${label}.threshold`, { positive: true }),
    recoil: assertSafeInteger(ownDataValue(cell, "recoil"), `${label}.recoil`, { nonNegative: true }),
  };
}

function normalizeCoupling(value, index) {
  const label = `body.couplings[${index}]`;
  const coupling = assertPlainObject(value, label);
  assertExactKeys(coupling, COUPLING_KEYS, label);
  return {
    id: assertNonEmptyString(ownDataValue(coupling, "id"), `${label}.id`),
    sourceCellId: assertNonEmptyString(ownDataValue(coupling, "sourceCellId"), `${label}.sourceCellId`),
    targetCellId: assertNonEmptyString(ownDataValue(coupling, "targetCellId"), `${label}.targetCellId`),
    transfer: assertSafeInteger(ownDataValue(coupling, "transfer"), `${label}.transfer`, { nonNegative: true }),
  };
}

function stableIdOrder(left, right) {
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

function normalizeDisturbanceBody(value) {
  const body = assertPlainObject(value, "body");
  assertExactKeys(body, BODY_KEYS, "body");
  const cells = arrayDataValues(ownDataValue(body, "cells"), "body.cells", { nonEmpty: true })
    .map(normalizeCell);
  const couplings = arrayDataValues(ownDataValue(body, "couplings"), "body.couplings")
    .map(normalizeCoupling);
  const cellIds = new Set();
  for (const cell of cells) {
    if (cellIds.has(cell.id)) throw new TypeError(`Duplicate cell id ${cell.id}.`);
    cellIds.add(cell.id);
  }
  const couplingIds = new Set();
  for (const coupling of couplings) {
    if (couplingIds.has(coupling.id)) throw new TypeError(`Duplicate coupling id ${coupling.id}.`);
    couplingIds.add(coupling.id);
    if (!cellIds.has(coupling.sourceCellId)) {
      throw new TypeError(`Coupling ${coupling.id} has undeclared source cell ${coupling.sourceCellId}.`);
    }
    if (!cellIds.has(coupling.targetCellId)) {
      throw new TypeError(`Coupling ${coupling.id} has undeclared target cell ${coupling.targetCellId}.`);
    }
  }
  const maxEvents = assertSafeInteger(ownDataValue(body, "maxEvents"), "body.maxEvents", { positive: true });
  if (maxEvents < 2) throw new TypeError("body.maxEvents must be at least 2.");
  const normalized = {
    schema: assertIdentity(ownDataValue(body, "schema"), DISTURBANCE_BODY_SCHEMA, "body.schema"),
    policyVersion: assertIdentity(ownDataValue(body, "policyVersion"), RESONANT_DISTURBANCE_POLICY, "body.policyVersion"),
    bodyId: assertNonEmptyString(ownDataValue(body, "bodyId"), "body.bodyId"),
    cells: cells.sort(stableIdOrder),
    couplings: couplings.sort(stableIdOrder),
    maxEvents,
  };
  canonicalStringify(normalized);
  return deepFreeze(normalized);
}

function normalizeDisturbancePressure(value) {
  const pressure = assertPlainObject(value, "pressure");
  assertExactKeys(pressure, PRESSURE_KEYS, "pressure");
  const authority = ownDataValue(pressure, "authority");
  if (!PRESSURE_AUTHORITIES.has(authority)) {
    throw new TypeError("pressure.authority must be an allowed authority.");
  }
  const normalized = {
    schema: assertIdentity(ownDataValue(pressure, "schema"), DISTURBANCE_PRESSURE_SCHEMA, "pressure.schema"),
    policyVersion: assertIdentity(ownDataValue(pressure, "policyVersion"), RESONANT_DISTURBANCE_POLICY, "pressure.policyVersion"),
    sourceRef: assertNonEmptyString(ownDataValue(pressure, "sourceRef"), "pressure.sourceRef"),
    targetCellId: assertNonEmptyString(ownDataValue(pressure, "targetCellId"), "pressure.targetCellId"),
    amount: assertSafeInteger(ownDataValue(pressure, "amount"), "pressure.amount", { nonNegative: true }),
    authority,
  };
  canonicalStringify(normalized);
  return deepFreeze(normalized);
}

function hashDisturbanceBody(body) {
  return hashCanonical(normalizeDisturbanceBody(body), "HauntedToaster-ResonantDisturbanceBody-v0");
}

function hashDisturbancePressure(pressure) {
  return hashCanonical(normalizeDisturbancePressure(pressure), "HauntedToaster-ResonantDisturbancePressure-v0");
}

function checkedAdd(left, right, label) {
  const result = left + right;
  if (!Number.isSafeInteger(result)) throw new TypeError(`${label} exceeded safe integer bounds.`);
  return result;
}

function disturbanceEvent(ordinal, kind, body) {
  const core = { ordinal, kind, ...body };
  return deepFreeze({
    ...core,
    eventSha256: hashCanonical(core, "HauntedToaster-ResonantDisturbanceEvent-v0"),
  });
}

function runResonantDisturbance(bodyInput, pressureInput) {
  const body = normalizeDisturbanceBody(bodyInput);
  const pressure = normalizeDisturbancePressure(pressureInput);
  const targetCell = body.cells.find((cell) => cell.id === pressure.targetCellId);
  if (!targetCell) {
    throw new TypeError(`Pressure has undeclared target cell ${pressure.targetCellId}.`);
  }

  const loads = Object.fromEntries(body.cells.map((cell) => [cell.id, cell.initialLoad]));
  const crossed = new Set();
  const lastLoadCauseOrdinal = Object.create(null);
  const events = [];
  let disposition = "settled";
  let reason = "no-eligible-uncrossed-cell";

  if (pressure.authority !== "fixture") {
    disposition = "refused";
    reason = "pressure-authority-not-admitted";
  } else {
    const loadBefore = loads[pressure.targetCellId];
    const loadAfter = checkedAdd(loadBefore, pressure.amount, "pressure load");
    const pressureEvent = disturbanceEvent(events.length, "pressure", {
      sourceRef: pressure.sourceRef,
      targetCellId: pressure.targetCellId,
      amount: pressure.amount,
      loadBefore,
      loadAfter,
    });
    events.push(pressureEvent);
    loads[pressure.targetCellId] = loadAfter;
    if (pressure.amount !== 0) lastLoadCauseOrdinal[pressure.targetCellId] = pressureEvent.ordinal;

    while (true) {
      const cell = body.cells.find((candidate) =>
        !crossed.has(candidate.id) && loads[candidate.id] >= candidate.threshold);
      if (!cell) break;

      const outgoing = body.couplings.filter((coupling) => coupling.sourceCellId === cell.id);
      const packageSize = 2 + outgoing.length;
      const remainingNonTerminalBudget = body.maxEvents - events.length - 1;
      if (packageSize > remainingNonTerminalBudget) {
        disposition = "exhausted";
        reason = "event-budget-cannot-admit-next-package";
        break;
      }

      // Preflight every transfer so an invalid package cannot partially mutate local state.
      const projectedLoads = { ...loads };
      const projectedTransfers = outgoing.map((coupling) => {
        const targetLoadBefore = projectedLoads[coupling.targetCellId];
        const targetLoadAfter = checkedAdd(targetLoadBefore, coupling.transfer, `coupling ${coupling.id} target load`);
        projectedLoads[coupling.targetCellId] = targetLoadAfter;
        return { coupling, targetLoadBefore, targetLoadAfter };
      });

      const thresholdEvent = disturbanceEvent(events.length, "threshold-cross", {
        cellId: cell.id,
        threshold: cell.threshold,
        loadBefore: loads[cell.id],
        causeEventOrdinal: lastLoadCauseOrdinal[cell.id] ?? null,
      });
      events.push(thresholdEvent);
      crossed.add(cell.id);

      for (const { coupling, targetLoadBefore, targetLoadAfter } of projectedTransfers) {
        const transferEvent = disturbanceEvent(events.length, "transfer", {
          couplingId: coupling.id,
          sourceCellId: coupling.sourceCellId,
          targetCellId: coupling.targetCellId,
          amount: coupling.transfer,
          targetLoadBefore,
          targetLoadAfter,
          causeEventOrdinal: thresholdEvent.ordinal,
        });
        events.push(transferEvent);
        loads[coupling.targetCellId] = targetLoadAfter;
        if (coupling.transfer !== 0) lastLoadCauseOrdinal[coupling.targetCellId] = transferEvent.ordinal;
      }

      const recoilLoadBefore = loads[cell.id];
      const recoilLoadAfter = Math.max(0, recoilLoadBefore - cell.recoil);
      events.push(disturbanceEvent(events.length, "recoil", {
        cellId: cell.id,
        amount: cell.recoil,
        loadBefore: recoilLoadBefore,
        loadAfter: recoilLoadAfter,
        causeEventOrdinal: thresholdEvent.ordinal,
        clampPolicy: "non-negative-zero-floor",
      }));
      loads[cell.id] = recoilLoadAfter;
    }
  }

  const terminal = deepFreeze({ disposition, reason });
  events.push(disturbanceEvent(events.length, "terminal", terminal));
  const core = {
    schema: DISTURBANCE_PLAN_SCHEMA,
    policyVersion: RESONANT_DISTURBANCE_POLICY,
    bodyHash: hashDisturbanceBody(body),
    pressureHash: hashDisturbancePressure(pressure),
    events,
    finalState: {
      loads: Object.fromEntries(body.cells.map((cell) => [cell.id, loads[cell.id]])),
      crossedCellIds: [...crossed].sort(),
    },
    terminal,
  };
  return deepFreeze({
    ...core,
    planSha256: hashCanonical(core, "HauntedToaster-ResonantDisturbancePlan-v0"),
  });
}

module.exports = {
  DISTURBANCE_BODY_SCHEMA,
  DISTURBANCE_EVENT_KINDS,
  DISTURBANCE_PLAN_SCHEMA,
  DISTURBANCE_PRESSURE_SCHEMA,
  DISTURBANCE_TERMINALS,
  RESONANT_DISTURBANCE_POLICY,
  hashDisturbanceBody,
  hashDisturbancePressure,
  normalizeDisturbanceBody,
  normalizeDisturbancePressure,
  runResonantDisturbance,
};
