const assert = require("assert");
const {
  md5,
  sha256,
  ByteGenerator,
  floats,
  ints,
  defaults,
  toInteger,
  assertSeed,
} = require("./utils");

const MAX_NONCE = Number.MAX_SAFE_INTEGER;

function positiveInteger(value, name) {
  const result = toInteger(value, name);
  assert(result >= 1, `${name} must be 1 or more`);
  return result;
}

// Provable(emit)(config) -> generator
//
// Every draw hashes with the nonce as it currently stands, then advances the
// nonce and emits the new state. A fresh byte stream is opened for each draw,
// so a long-lived instance yields exactly the same results as re-creating one
// from the emitted state before every call. Outcome for nonce N is therefore
// always reproducible from (serverSeed, clientSeed, N) alone.
module.exports =
  (emit = (x) => x) =>
  (config) => {
    config = defaults(config);

    function draw(fn) {
      assert(config.nonce + 1 < MAX_NONCE, "max nonce, rotate seed.");
      const result = fn(ByteGenerator(config));
      config.nonce += 1;
      emit({ ...config });
      return result;
    }

    return {
      // Derives the seeds for the next rotation. The new server seed depends
      // on the current one and `salt`; keep `salt` private so a revealed seed
      // does not disclose its successor. Nonce and cursor restart at 0.
      next(salt, clientSeed) {
        assertSeed(salt, "salt");
        if (clientSeed) assertSeed(clientSeed, "clientSeed");
        return defaults({
          clientSeed: clientSeed || md5(`${config.clientSeed}:${salt}`),
          serverSeed: sha256(`${config.serverSeed}:${salt}`),
        });
      },
      state() {
        return { ...config };
      },
      floats(count = 1) {
        count = positiveInteger(count, "count");
        return draw((rng) => floats(rng, count));
      },
      // `count` integers in [min, min + max - 1]. `max` is the range size.
      ints(count, max, min = 0) {
        count = positiveInteger(count, "count");
        max = positiveInteger(max, "max");
        min = toInteger(min, "min");
        return draw((rng) => ints(rng, count, max, min));
      },
      tick() {
        draw(() => undefined);
        return { ...config };
      },
    };
  };
