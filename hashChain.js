const assert = require("assert");
const { sha256, toInteger, assertSeed, randomUUID } = require("./utils");

function chainLength(count) {
  count = toInteger(count, "count");
  assert(count >= 1, "count must be 1 or more");
  return count;
}

// Builds the chain in reverse: result[count - 1] = sha256(seed) and
// result[i] = sha256(result[i + 1]). result[0] is the terminating hash to
// publish before play; every later hash is the preimage of the one before it,
// so a player verifies hash i with sha256(hash[i]) === hash[i - 1].
function generateHashChain(count, seed) {
  count = chainLength(count);
  assertSeed(seed, "seed");

  const result = Array(count);
  for (let i = count - 1; i >= 0; i--) {
    seed = sha256(seed);
    result[i] = seed;
  }
  return result;
}

// Generates and iterates a provable hash chain. `state()` is enough to resume
// the same chain later; it includes the seed, so persist it privately.
// The chain does not renew itself: when `next()` reports it has ended, the
// caller decides how to commit to and start the following chain.
function HashChain({ seed = randomUUID(), count = 1000000, index = 0 } = {}) {
  count = chainLength(count);
  index = toInteger(index, "index");
  assert(index >= 0 && index < count, "index must be within the chain");
  assertSeed(seed, "seed");

  const chain = generateHashChain(count, seed);

  function state() {
    return { count, seed, index };
  }

  // Next hash, or undefined at the end of the chain.
  function peek() {
    return chain[index + 1];
  }

  function get() {
    return chain[index];
  }

  function next() {
    const hash = peek();
    assert(hash, "chain has ended");
    index += 1;
    return { hash, count, index };
  }

  // Previous hash, or undefined at the start of the chain.
  function last() {
    return chain[index - 1];
  }

  return { state, peek, get, next, last };
}

module.exports = HashChain;
module.exports.generateHashChain = generateHashChain;
