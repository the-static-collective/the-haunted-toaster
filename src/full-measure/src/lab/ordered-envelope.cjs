const ORDERED_ENVELOPE_VERSION = "ordered-envelope-v0";

function createOrderedEnvelope(seed = ".") {
  if (typeof seed !== "string" || seed.length === 0) {
    throw new TypeError("ordered envelope seed must be a non-empty string");
  }

  return {
    version: ORDERED_ENVELOPE_VERSION,
    seed,
    surface: seed,
    worldline: [],
  };
}

function pushOrderedEnvelope(envelope, token) {
  if (typeof token !== "string" || token.length === 0) {
    throw new TypeError("ordered envelope token must be a non-empty string");
  }

  return {
    version: ORDERED_ENVELOPE_VERSION,
    seed: envelope.seed,
    surface: `${token}${envelope.surface}`,
    worldline: [...envelope.worldline, token],
  };
}

function peelOrderedEnvelope(envelope) {
  if (envelope.worldline.length === 0) {
    return { token: null, envelope };
  }

  const token = envelope.worldline[envelope.worldline.length - 1];
  if (!envelope.surface.startsWith(token)) {
    throw new Error("ordered envelope surface does not match its worldline");
  }

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
  return worldline.reduce(
    (envelope, token) => pushOrderedEnvelope(envelope, token),
    createOrderedEnvelope(seed),
  );
}

module.exports = {
  ORDERED_ENVELOPE_VERSION,
  createOrderedEnvelope,
  pushOrderedEnvelope,
  peelOrderedEnvelope,
  replayOrderedEnvelope,
};
