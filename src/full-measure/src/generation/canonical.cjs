const crypto = require("node:crypto");

const MAX_DEPTH = 100;
const MAX_COLLECTION_SIZE = 4096;
const NUMBER_DIGITS = 6;

function quantizeNumber(value) {
  if (!Number.isFinite(value)) {
    throw new TypeError("Canonical JSON rejects non-finite numbers.");
  }
  if (Object.is(value, -0)) return 0;
  if (Number.isInteger(value)) return value;
  const scale = 10 ** NUMBER_DIGITS;
  return Math.round(value * scale) / scale;
}

function canonicalize(value, path = "$", depth = 0, seen = new Set()) {
  if (depth > MAX_DEPTH) {
    throw new TypeError(`Canonical JSON depth exceeds ${MAX_DEPTH} at ${path}.`);
  }
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") return quantizeNumber(value);
  if (["undefined", "function", "symbol", "bigint"].includes(typeof value)) {
    throw new TypeError(`Canonical JSON rejects ${typeof value} at ${path}.`);
  }
  if (!value || typeof value !== "object") {
    throw new TypeError(`Canonical JSON rejects ${typeof value} at ${path}.`);
  }
  if (seen.has(value)) throw new TypeError(`Canonical JSON rejects cycles at ${path}.`);
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      if (value.length > MAX_COLLECTION_SIZE) {
        throw new TypeError(`Canonical JSON collection is too large at ${path}.`);
      }
      return value.map((item, index) =>
        canonicalize(item, `${path}[${index}]`, depth + 1, seen),
      );
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`Canonical JSON requires plain objects at ${path}.`);
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Object.keys(descriptors).sort();
    if (keys.length > MAX_COLLECTION_SIZE) {
      throw new TypeError(`Canonical JSON object is too large at ${path}.`);
    }
    const output = {};
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (!descriptor.enumerable) continue;
      if (descriptor.get || descriptor.set) {
        throw new TypeError(`Canonical JSON rejects accessors at ${path}.${key}.`);
      }
      if (descriptor.value === undefined) {
        throw new TypeError(`Canonical JSON rejects undefined at ${path}.${key}.`);
      }
      output[key] = canonicalize(
        descriptor.value,
        `${path}.${key}`,
        depth + 1,
        seen,
      );
    }
    return output;
  } finally {
    seen.delete(value);
  }
}

function canonicalStringify(value) {
  return JSON.stringify(canonicalize(value));
}

function canonicalBytes(value) {
  return Buffer.from(canonicalStringify(value), "utf8");
}

function hashCanonical(value, domain = "HauntedToaster-Canonical-v1") {
  const hash = crypto.createHash("sha256");
  hash.update(Buffer.from(`${domain}|`, "utf8"));
  hash.update(canonicalBytes(value));
  return hash.digest("hex");
}

function addressCanonical(
  value,
  {
    domain = "HauntedToaster-Canonical-v1",
    prefix = "ht1_",
  } = {},
) {
  return `${prefix}${hashCanonical(value, domain)}`;
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

module.exports = {
  MAX_COLLECTION_SIZE,
  MAX_DEPTH,
  NUMBER_DIGITS,
  addressCanonical,
  canonicalBytes,
  canonicalStringify,
  canonicalize,
  deepFreeze,
  hashCanonical,
  quantizeNumber,
};
