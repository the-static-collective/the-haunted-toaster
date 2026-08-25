const ORDERED_ENVELOPE_VERSION = "ordered-envelope-v0";

function requireNonEmptyString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string`);
  }
  return value;
}

function assertOrderedEnvelope(envelope) {
  if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)) {
    throw new TypeError("ordered envelope must be an object");
  }
  if (envelope.version !== ORDERED_ENVELOPE_VERSION) {
    throw new TypeError(`ordered envelope version must be ${ORDERED_ENVELOPE_VERSION}`);
  }
  const seed = requireNonEmptyString(envelope.seed, "ordered envelope seed");
  if (typeof envelope.surface !== "string") {
    throw new TypeError("ordered envelope surface must be a string");
  }
  if (!Array.isArray(envelope.worldline)) {
    throw new TypeError("ordered envelope worldline must be an array");
  }
  for (const token of envelope.worldline) {
    requireNonEmptyString(token, "ordered envelope worldline token");
  }
  const expectedSurface = [...envelope.worldline].reverse().join("") + seed;
  if (envelope.surface !== expectedSurface) {
    throw new Error("ordered envelope surface does not match its worldline");
  }
  return envelope;
}

function createOrderedEnvelope(seed = ".") {
  requireNonEmptyString(seed, "ordered envelope seed");

  return {
    version: ORDERED_ENVELOPE_VERSION,
    seed,
    surface: seed,
    worldline: [],
  };
}

function pushOrderedEnvelope(envelope, token) {
  assertOrderedEnvelope(envelope);
  requireNonEmptyString(token, "ordered envelope token");

  return {
    version: ORDERED_ENVELOPE_VERSION,
    seed: envelope.seed,
    surface: `${token}${envelope.surface}`,
    worldline: [...envelope.worldline, token],
  };
}

function peelOrderedEnvelope(envelope) {
  assertOrderedEnvelope(envelope);
  if (envelope.worldline.length === 0) {
    return { token: null, envelope };
  }

  const token = envelope.worldline[envelope.worldline.length - 1];
  return {
    token,
    envelope: {
      version: ORDERED_ENVELOPE_VERSION,
      seed: envelope.seed,
      surface: envelope.surface.slice(token.length),
      worldline: envelope.worldline.slice(0, -1),
    },
  };
}

function replayOrderedEnvelope(seed, worldline) {
  if (!Array.isArray(worldline)) {
    throw new TypeError("ordered envelope worldline must be an array");
  }
  return worldline.reduce(
    (envelope, token) => pushOrderedEnvelope(envelope, token),
    createOrderedEnvelope(seed),
  );
}

module.exports = {
  ORDERED_ENVELOPE_VERSION,
  assertOrderedEnvelope,
  createOrderedEnvelope,
  pushOrderedEnvelope,
  peelOrderedEnvelope,
  replayOrderedEnvelope,
};
