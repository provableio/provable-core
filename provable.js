const {
  md5,
  sha256,
  ByteGenerator,
  // bytesToFloat,
  floats,
  ints,
  defaults,
} = require("./utils");

module.exports =
  (emit = (x) => x) =>
  (config) => {
    config = defaults(config);
    const generator = ByteGenerator(config);

    return {
      next(salt, clientSeed) {
        return defaults({
          clientSeed: clientSeed || md5(`${config.clientSeed}:${salt}`),
          serverSeed: sha256(`${config.serverSeed}:${salt}`),
        });
      },
      state() {
        return config;
      },
      floats(count = 1) {
        const result = floats(generator, count);
        ++config.nonce;
        emit(config);
        return result;
      },
      ints(count, max, min) {
        const result = ints(generator, count, max, min);
        ++config.nonce;
        emit(config);
        return result;
      },
      tick() {
        ++config.nonce;
        emit(config);
        return config;
      },
    };
  };
