const assert = require("assert");
const crypto = require("crypto");
const { toInteger, assertSeed, randomUUID } = require("./utils");

// A series of hashes HMAC-SHA256(key = seed, message = `salt:nonce`).
// Instances are immutable: `next()` returns the state for the following
// nonce, which you pass to a new HashSeries.
function HashSeries({ seed = randomUUID(), salt = randomUUID(), nonce = 0 } = {}) {
  assertSeed(seed, "seed");
  assertSeed(salt, "salt");
  nonce = toInteger(nonce, "nonce");
  assert(nonce >= 0, "nonce must be 0 or more");

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
    return { seed, salt, nonce: nonce + 1 };
  }
  function peekHash() {
    return calcHash(seed, salt, nonce + 1);
  }

  return { getHash, next, peekHash, calcHash, state };
}

module.exports = HashSeries;
