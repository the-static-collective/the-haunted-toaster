const {
  normalizeHyperFoodSpec,
} = require("./schema.cjs");
const {
  specimenId,
} = require("./identity.cjs");

const ALLOWED_OPS = Object.freeze(new Set(["add", "replace", "remove"]));
const ALLOWED_ROOTS = Object.freeze(new Set([
  "organism",
  "assets",
  "inputs",
  "timing",
  "parameters",
  "seed",
  "target",
  "graph",
]));
const FORBIDDEN_SEGMENTS = Object.freeze(new Set([
  "__proto__",
  "prototype",
  "constructor",
]));

function decodePointerSegment(segment) {
  if (/~(?:[^01]|$)/.test(segment)) {
    throw new TypeError(`Invalid HyperFood mutation pointer escape: ${segment}`);
  }
  return segment.replace(/~1/g, "/").replace(/~0/g, "~");
}

function parseMutationPath(path) {
  const text = String(path || "");
  if (!text || text === "/") {
    throw new TypeError("HyperFood mutation cannot replace the root object.");
  }
  if (!text.startsWith("/")) {
    throw new TypeError("HyperFood mutation path must be an absolute JSON pointer.");
  }
  const rawSegments = text.slice(1).split("/");
  if (rawSegments.some((segment) => segment.length === 0)) {
    throw new TypeError("HyperFood mutation path cannot contain empty segments.");
  }
  const segments = rawSegments.map(decodePointerSegment);
  if (!ALLOWED_ROOTS.has(segments[0])) {
    throw new TypeError(`Unsupported HyperFood mutation root: ${segments[0]}`);
  }
  for (const segment of segments) {
    if (FORBIDDEN_SEGMENTS.has(segment)) {
      throw new TypeError(`Forbidden HyperFood mutation path segment: ${segment}`);
    }
  }
  return { text, segments };
}

function normalizeMutationDelta(delta) {
  if (!Array.isArray(delta) || delta.length === 0) {
    throw new TypeError("HyperFood mutation delta must be a non-empty array.");
  }
  return delta.map((operation, index) => {
    if (!operation || typeof operation !== "object" || Array.isArray(operation)) {
      throw new TypeError(`HyperFood mutation operation ${index} must be an object.`);
    }
    const op = String(operation.op || "").trim();
    if (!ALLOWED_OPS.has(op)) {
      throw new TypeError(`Unsupported HyperFood mutation operation: ${op}`);
    }
    const { text } = parseMutationPath(operation.path);
    const normalized = { op, path: text };
    if (op === "add" || op === "replace") {
      if (!Object.prototype.hasOwnProperty.call(operation, "value")) {
        throw new TypeError(`HyperFood mutation ${op} requires a value.`);
      }
      normalized.value = structuredClone(operation.value);
    } else if (Object.prototype.hasOwnProperty.call(operation, "value")) {
      throw new TypeError("HyperFood mutation remove must not include a value.");
    }
    return normalized;
  });
}

function resolveMutationParent(root, segments) {
  let current = root;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    if (Array.isArray(current)) {
      throw new TypeError(
        `HyperFood mutation refuses unstable array index paths at ${segment}.`,
      );
    }
    if (!current || typeof current !== "object") {
      throw new TypeError(`HyperFood mutation path does not resolve at ${segment}.`);
    }
    if (!Object.prototype.hasOwnProperty.call(current, segment)) {
      throw new TypeError(`HyperFood mutation path does not exist at ${segment}.`);
    }
    current = current[segment];
  }
  if (Array.isArray(current)) {
    throw new TypeError(
      `HyperFood mutation refuses unstable array index paths at ${segments.at(-1)}.`,
    );
  }
  if (!current || typeof current !== "object") {
    throw new TypeError("HyperFood mutation parent path does not resolve to an object.");
  }
  return current;
}

function applyOperation(root, operation) {
  const { segments } = parseMutationPath(operation.path);
  const parent = resolveMutationParent(root, segments);
  const key = segments.at(-1);
  const exists = Object.prototype.hasOwnProperty.call(parent, key);

  if (operation.op === "add") {
    if (exists) {
      throw new TypeError(`HyperFood mutation add refuses existing property: ${operation.path}`);
    }
    parent[key] = structuredClone(operation.value);
    return;
  }
  if (operation.op === "replace") {
    if (!exists) {
      throw new TypeError(`HyperFood mutation replace requires existing property: ${operation.path}`);
    }
    parent[key] = structuredClone(operation.value);
    return;
  }
  if (!exists) {
    throw new TypeError(`HyperFood mutation remove requires existing property: ${operation.path}`);
  }
  delete parent[key];
}

function applyHyperFoodDelta(parentSpec, delta) {
  const parent = normalizeHyperFoodSpec(parentSpec);
  const normalizedDelta = normalizeMutationDelta(delta);
  const child = structuredClone(parent);
  for (const operation of normalizedDelta) {
    applyOperation(child, operation);
  }
  return normalizeHyperFoodSpec(child);
}

function reconstructHyperFoodMutation({
  parentSpec,
  delta,
  expectedChildId,
} = {}) {
  const parent = normalizeHyperFoodSpec(parentSpec);
  const normalizedDelta = normalizeMutationDelta(delta);
  const childSpec = applyHyperFoodDelta(parent, normalizedDelta);
  const parentSpecimenId = specimenId(parent);
  const childSpecimenId = specimenId(childSpec);
  const expected = String(expectedChildId || "").trim();
  if (!/^hf0_[0-9a-f]{64}$/.test(expected) || expected !== childSpecimenId) {
    throw new TypeError(
      `HyperFood child specimen identity mismatch: expected ${expected || "(missing)"}, reconstructed ${childSpecimenId}.`,
    );
  }
  return {
    parentSpecimenId,
    childSpecimenId,
    childSpec,
    delta: normalizedDelta,
  };
}

module.exports = {
  applyHyperFoodDelta,
  normalizeMutationDelta,
  reconstructHyperFoodMutation,
};
