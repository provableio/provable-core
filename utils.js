const { v4: uuid } = require("uuid");
const lodash = require("lodash");
const crypto = require("crypto");

function defaults(state = {}) {
  lodash.defaults(state, {
    serverSeed: sha256(),
    clientSeed: md5(),
    nonce: 0,
    cursor: 0,
  });
  state.serverHash = state.serverHash || sha256(state.serverSeed);
  return state;
}

function HashSeries({ seed = uuid(), salt = uuid(), nonce = 0 } = {}) {
  function calcHash(_seed = seed, _salt = salt, _nonce = nonce) {
    return crypto
      .createHmac("sha256", _seed)
      .update(`${_salt}:${_nonce}`)
      .digest("hex");
  }
  function getHash() {
    return calcHash(seed, salt, nonce);
  }
  function state() {
    return { seed, salt, nonce };
  }
  function next() {
    return {
      seed,
      salt,
      nonce: nonce + 1,
    };
  }
  function peekHash() {
    return calcHash(seed, salt, nonce + 1);
  }
  return {
    getHash,
    next,
    peekHash,
    calcHash,
    state,
  };
}

function sha256(input = uuid()) {
  const hash = crypto.createHash("sha256");
  hash.update(input);
  return hash.digest("hex");
}
function md5(input = uuid()) {
  const hash = crypto.createHash("md5");
  hash.update(input);
  return hash.digest("hex");
}

// Random number generation based on following inputs: serverSeed, clientSeed, nonce and cursor
function* ByteGenerator({ serverSeed, clientSeed, nonce, cursor }) {
  // Setup curser variables
  let currentRound = Math.floor(cursor / 32);
  let currentRoundCursor = cursor;
  currentRoundCursor -= currentRound * 32;

  // Generate outputs until cursor requirement fullfilled
  while (true) {
    // HMAC function used to output provided inputs into bytes
    const hmac = crypto.createHmac("sha256", serverSeed);
    hmac.update(`${clientSeed}:${nonce}:${currentRound}`);
    const buffer = hmac.digest();

    // Update curser for next iteration of loop
    while (currentRoundCursor < 32) {
      yield Number(buffer[currentRoundCursor]);
      currentRoundCursor += 1;
    }
    currentRoundCursor = 0;
    currentRound += 1;
  }
}

function bytesToFloat(bytes) {
  return bytes.reduce((result, value, i) => {
    const divider = 256 ** (i + 1);
    const partialResult = value / divider;
    return result + partialResult;
  }, 0);
}

function floatToInt(val, max, min = 0) {
  return Math.floor(min + val * max);
}

// Convert the hash output from the rng byteGenerator to floats
function* FloatGenerator(rng, count) {
  for (let i = 0; i < count; i++) {
    const bytes = [];
    for (let j = 0; j < 4; j++) {
      bytes.push(rng.next().value);
    }
    yield bytesToFloat(bytes);
  }
}

function floats(rng, count) {
  return [...FloatGenerator(rng, count)];
}

function ints(rng, count, max, min) {
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
  HashSeries,
};
