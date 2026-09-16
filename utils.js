const assert = require("assert");
const crypto = require("crypto");

const BYTES_PER_ROUND = 32; // one HMAC-SHA256 digest
const BYTES_PER_FLOAT = 4;

function randomUUID() {
  return crypto.randomUUID();
}

function sha256(input = randomUUID()) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function md5(input = randomUUID()) {
  return crypto.createHash("md5").update(input).digest("hex");
}

// Accepts a safe integer, or its canonical decimal string form because values
// read back from a database or a query string often arrive as strings.
// Anything else (floats, NaN, "1e3", objects) throws.
function toInteger(value, name = "value") {
  if (typeof value === "string" && /^-?\d+$/.test(value)) value = Number(value);
  assert(Number.isSafeInteger(value), `${name} must be a safe integer`);
  return value;
}

function assertSeed(value, name = "seed") {
  assert(
    typeof value === "string" && value.length > 0,
    `${name} must be a non-empty string`
  );
}

// Normalises and validates a provable state. Returns a new object; the input
// is never mutated. Unknown keys (ids, timestamps) are carried through.
// `serverHash` is always derived from `serverSeed`: a supplied value is never
// trusted, so the commitment can not drift from the seed it commits to.
function defaults(state = {}) {
  assert(state && typeof state === "object", "state must be an object");

  const result = {
    ...state,
    serverSeed: state.serverSeed ?? sha256(),
    clientSeed: state.clientSeed ?? md5(),
    nonce: toInteger(state.nonce ?? 0, "nonce"),
    cursor: toInteger(state.cursor ?? 0, "cursor"),
  };

  assertSeed(result.serverSeed, "serverSeed");
  assertSeed(result.clientSeed, "clientSeed");
  assert(result.nonce >= 0, "nonce must be 0 or more");
  assert(result.cursor >= 0, "cursor must be 0 or more");

  result.serverHash = sha256(result.serverSeed);
  return result;
}

// Yields bytes from HMAC-SHA256(key = serverSeed, message = `clientSeed:nonce:round`).
// Each round yields 32 bytes; `cursor` is the byte offset to start from.
// The nonce is fixed for the life of the generator: open a new one per draw.
function* ByteGenerator({ serverSeed, clientSeed, nonce, cursor = 0 }) {
  let currentRound = Math.floor(cursor / BYTES_PER_ROUND);
  let currentRoundCursor = cursor - currentRound * BYTES_PER_ROUND;

  while (true) {
    const hmac = crypto.createHmac("sha256", serverSeed);
    hmac.update(`${clientSeed}:${nonce}:${currentRound}`);
    const buffer = hmac.digest();

    while (currentRoundCursor < BYTES_PER_ROUND) {
      yield Number(buffer[currentRoundCursor]);
      currentRoundCursor += 1;
    }
    currentRoundCursor = 0;
    currentRound += 1;
  }
}

// Four bytes become a float in [0, 1) with 32 bits of precision:
// b0/256 + b1/256^2 + b2/256^3 + b3/256^4
function bytesToFloat(bytes) {
  return bytes.reduce((result, value, i) => {
    const divider = 256 ** (i + 1);
    return result + value / divider;
  }, 0);
}

// Maps a float in [0, 1) onto the `max` integers starting at `min`, i.e. the
// range [min, min + max - 1]. `max` is a range size, not an upper bound.
function floatToInt(val, max, min = 0) {
  return Math.floor(min + val * max);
}

function* FloatGenerator(rng, count) {
  for (let i = 0; i < count; i++) {
    const bytes = [];
    for (let j = 0; j < BYTES_PER_FLOAT; j++) {
      bytes.push(rng.next().value);
    }
    yield bytesToFloat(bytes);
  }
}

function floats(rng, count) {
  return [...FloatGenerator(rng, count)];
}

function ints(rng, count, max, min = 0) {
  const result = [];
  const gen = FloatGenerator(rng, count);
  for (let i = 0; i < count; i++) {
    result.push(floatToInt(gen.next().value, max, min));
  }
  return result;
}

module.exports = {
  floats,
  bytesToFloat,
  ByteGenerator,
  sha256,
  md5,
  ints,
  FloatGenerator,
  floatToInt,
  defaults,
  toInteger,
  assertSeed,
  randomUUID,
};
