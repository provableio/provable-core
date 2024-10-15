const { v4: uuid } = require("uuid");
const crypto = require("crypto");

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

module.exports = HashSeries;
