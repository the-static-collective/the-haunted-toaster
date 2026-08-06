const crypto = require("node:crypto");

const MASK_64 = (1n << 64n) - 1n;
const FLOAT_DENOMINATOR = 2 ** 53;
const PRNG_ID = "xoshiro256**/splitmix64-v1";

function rotateLeft(value, shift) {
  const amount = BigInt(shift);
  return ((value << amount) | (value >> (64n - amount))) & MASK_64;
}

function seedWord(seed) {
  const digest = crypto.createHash("sha256").update(String(seed), "utf8").digest();
  return digest.readBigUInt64LE(0);
}

function splitmix64(state) {
  let nextState = (state + 0x9e3779b97f4a7c15n) & MASK_64;
  let value = nextState;
  value = ((value ^ (value >> 30n)) * 0xbf58476d1ce4e5b9n) & MASK_64;
  value = ((value ^ (value >> 27n)) * 0x94d049bb133111ebn) & MASK_64;
  value ^= value >> 31n;
  return { state: nextState, value: value & MASK_64 };
}

function initialState(seed) {
  let state = seedWord(seed);
  const words = [];
  for (let index = 0; index < 4; index += 1) {
    const generated = splitmix64(state);
    state = generated.state;
    words.push(generated.value);
  }
  if (words.every((word) => word === 0n)) words[0] = 1n;
  return words;
}

function formatWord(value) {
  return value.toString(16).padStart(16, "0");
}

function createPrng(seed) {
  const state = initialState(seed);
  const initial = state.map(formatWord);

  function nextUint64() {
    const result = (rotateLeft((state[1] * 5n) & MASK_64, 7) * 9n) & MASK_64;
    const temporary = (state[1] << 17n) & MASK_64;

    state[2] ^= state[0];
    state[3] ^= state[1];
    state[1] ^= state[2];
    state[0] ^= state[3];
    state[2] ^= temporary;
    state[3] = rotateLeft(state[3], 45);

    for (let index = 0; index < state.length; index += 1) state[index] &= MASK_64;
    return result;
  }

  function nextFloat() {
    return Number(nextUint64() >> 11n) / FLOAT_DENOMINATOR;
  }

  function integer(minimum, maximum) {
    const min = Math.ceil(Number(minimum));
    const max = Math.floor(Number(maximum));
    if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) {
      throw new TypeError("PRNG integer range is invalid.");
    }
    return min + Math.floor(nextFloat() * (max - min + 1));
  }

  function pick(values) {
    if (!Array.isArray(values) || !values.length) {
      throw new TypeError("PRNG pick requires a non-empty array.");
    }
    return values[integer(0, values.length - 1)];
  }

  return {
    algorithmId: PRNG_ID,
    seed: String(seed),
    initialState: [...initial],
    nextFloat,
    nextUint64,
    integer,
    pick,
    snapshot: () => state.map(formatWord),
  };
}

module.exports = {
  MASK_64,
  PRNG_ID,
  createPrng,
  initialState,
  splitmix64,
};
