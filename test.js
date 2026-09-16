const test = require("tape");
const { Provable, HashChain, HashSeries, utils } = require("./index");

// Fixed vectors. These pin the byte stream, so any change here is a breaking
// change for every outcome ever produced with this library.
const base = {
  clientSeed: "bba625387fb64d772ff7da0ed6e71b16",
  serverSeed: "aa47ddbf021afd16d64756e7f32b6cea2feebdfddc8fd57f1522641fdf372375",
  serverHash: "158e995ed494f58c06d93e22f71554cf2126614174fde336aedf9a457dbf16f4",
  nonce: 400,
  cursor: 0,
};

// ints(1, 10001, 0) for nonces 400, 401, 402, ...
const answers = [
  3842, 9426, 5011, 9503, 1378, 9933, 9048, 9339, 4585, 7847, 2357, 9807, 8488,
  5542,
];

test("exports", (t) => {
  t.equal(typeof Provable, "function");
  t.equal(typeof HashChain, "function");
  t.equal(typeof HashSeries, "function");
  t.equal(typeof utils.ByteGenerator, "function");
  t.end();
});

test("byte stream vectors", (t) => {
  const gen = utils.ByteGenerator(base);
  const bytes = Array.from({ length: 8 }, () => gen.next().value);
  t.deepEqual(bytes, [98, 92, 27, 175, 16, 51, 213, 32]);
  t.equal(utils.sha256(base.serverSeed), base.serverHash);
  t.end();
});

test("provable", (t) => {
  t.test("ints, fresh instance per nonce", (t) => {
    let config = { ...base };
    answers.forEach((answer, i) => {
      const provable = Provable((x) => (config = x))(config);
      const [result] = provable.ints(1, 10001, 0);
      t.equal(result, answer, `nonce ${base.nonce + i}`);
      t.equal(config.nonce, base.nonce + i + 1, "emitted nonce advanced");
    });
    t.end();
  });

  t.test("ints and floats from one long-lived instance match replay", (t) => {
    const emitted = [];
    const provable = Provable((x) => emitted.push(x))(base);
    const live = answers.map(() => provable.ints(1, 10001, 0)[0]);
    t.deepEqual(live, answers, "long-lived instance advances the nonce");

    emitted.forEach((state, i) => {
      t.equal(state.nonce, base.nonce + i + 1, "emitted state describes the next draw");
      // the draw that produced live[i] used the nonce before increment
      const replay = Provable()({ ...state, nonce: state.nonce - 1 }).ints(1, 10001, 0)[0];
      t.equal(replay, live[i], `replay of draw ${i} from emitted state`);
    });
    t.end();
  });

  t.test("floats vectors", (t) => {
    t.deepEqual(Provable()(base).floats(4), [
      0.3842179586645216, 0.06329090148210526, 0.9394600219093263,
      0.015737906098365784,
    ]);
    t.deepEqual(Provable()({ ...base, nonce: 401 }).floats(1), [
      0.9425638655666262,
    ]);
    t.deepEqual(Provable()(base).floats(), Provable()(base).floats(1), "count defaults to 1");
    t.end();
  });

  t.test("ints range is [min, min + max - 1]", (t) => {
    t.deepEqual(Provable()(base).ints(3, 6, 1), [3, 1, 6]);
    const many = Provable()(base).ints(500, 6, 1);
    t.ok(many.every((n) => n >= 1 && n <= 6), "within range");
    t.ok(many.includes(1) && many.includes(6), "hits both ends");
    t.deepEqual(Provable()(base).ints(1, 10001), Provable()(base).ints(1, 10001, 0), "min defaults to 0");
    t.deepEqual(Provable()(base).ints(2, 10, -5).map((n) => n >= -5 && n <= 4), [true, true]);
    t.equal(utils.floatToInt(0.99999999, 6, 1), 6);
    t.equal(utils.floatToInt(0, 6, 1), 1);
    t.end();
  });

  t.test("cursor offsets the byte stream", (t) => {
    t.deepEqual(Provable()({ ...base, cursor: 4 }).ints(1, 10001, 0), [632]);
    t.deepEqual(Provable()({ ...base, cursor: 32 }).ints(1, 10001, 0), Provable()(base).ints(9, 10001, 0).slice(8));
    t.end();
  });

  t.test("integer-like strings are accepted, anything else is rejected", (t) => {
    t.deepEqual(Provable()({ ...base, nonce: "400" }).ints(1, 10001, 0), [answers[0]]);
    t.deepEqual(Provable()(base).ints("1", "10001", "0"), [answers[0]]);
    t.equal(Provable()({ ...base, nonce: null }).state().nonce, 0, "null means missing");
    for (const nonce of ["abc", "1e3", 1.5, -1, NaN, {}, [], Infinity, true]) {
      t.throws(() => Provable()({ ...base, nonce }), /nonce/, `nonce ${String(nonce)}`);
    }
    t.throws(() => Provable()({ ...base, cursor: -1 }), /cursor/);
    t.throws(() => Provable()({ ...base, serverSeed: 123 }), /serverSeed/);
    t.throws(() => Provable()({ ...base, clientSeed: "" }), /clientSeed/);
    t.throws(() => Provable()({ ...base, clientSeed: {} }), /clientSeed/);
    t.throws(() => Provable()(base).ints(), /count/);
    t.throws(() => Provable()(base).ints(0, 10), /count/);
    t.throws(() => Provable()(base).ints(1), /max/);
    t.throws(() => Provable()(base).ints(1, 0), /max/);
    t.throws(() => Provable()(base).ints(1, 10, 1.5), /min/);
    t.throws(() => Provable()(base).floats(0), /count/);
    t.throws(() => Provable()(base).floats(2.5), /count/);
    t.end();
  });

  t.test("serverHash is always derived from serverSeed", (t) => {
    const state = Provable()({ ...base, serverHash: "bogus" }).state();
    t.equal(state.serverHash, base.serverHash);
    t.equal(Provable()({ serverSeed: "s" }).state().serverHash, utils.sha256("s"));
    t.end();
  });

  t.test("defaults fill missing seeds and carry unknown keys", (t) => {
    const state = Provable()({ id: "abc" }).state();
    t.equal(state.id, "abc");
    t.equal(state.nonce, 0);
    t.equal(state.cursor, 0);
    t.equal(state.serverSeed.length, 64);
    t.equal(state.clientSeed.length, 32);
    t.equal(state.serverHash, utils.sha256(state.serverSeed));
    t.notEqual(Provable()({}).state().serverSeed, Provable()({}).state().serverSeed);
    t.end();
  });

  t.test("input is not mutated and state() is a copy", (t) => {
    const input = { ...base };
    const provable = Provable()(input);
    provable.tick();
    t.equal(input.nonce, base.nonce, "input untouched");
    const snapshot = provable.state();
    snapshot.nonce = 0;
    t.equal(provable.state().nonce, base.nonce + 1, "state() copy");
    t.end();
  });

  t.test("tick advances the nonce and emits", (t) => {
    let emitted;
    const provable = Provable((x) => (emitted = x))(base);
    const state = provable.tick();
    t.equal(state.nonce, base.nonce + 1);
    t.equal(emitted.nonce, base.nonce + 1);
    t.deepEqual(provable.floats(1), Provable()({ ...base, nonce: base.nonce + 1 }).floats(1));
    t.end();
  });

  t.test("max nonce", (t) => {
    const provable = Provable()({ ...base, nonce: Number.MAX_SAFE_INTEGER - 1 });
    t.throws(() => provable.floats(), /max nonce/);
    t.equal(provable.state().nonce, Number.MAX_SAFE_INTEGER - 1, "state unchanged on failure");
    t.doesNotThrow(() => Provable()({ ...base, nonce: Number.MAX_SAFE_INTEGER - 2 }).floats());
    t.end();
  });

  t.test("next derives the rotation deterministically", (t) => {
    const next = Provable()(base).next("salt-1");
    t.deepEqual(next, {
      clientSeed: "6d342ac2abade213ef60ecbb7eee012b",
      serverSeed: "80ce19c2df995ac44e2882e13df00d0be5e4910968c6de323d09f60c0aafcf04",
      serverHash: "0108879296bb4617d3b101e3fc1d71eae17bba095c962d22645e4f93012c72f0",
      nonce: 0,
      cursor: 0,
    });
    t.equal(next.serverSeed, utils.sha256(`${base.serverSeed}:salt-1`));
    t.equal(next.clientSeed, utils.md5(`${base.clientSeed}:salt-1`));
    const custom = Provable()(base).next("salt-1", "myclient");
    t.equal(custom.clientSeed, "myclient");
    t.equal(custom.serverSeed, next.serverSeed);
    t.equal(Provable()(base).next("salt-1", "").clientSeed, next.clientSeed, "empty client seed falls back");
    t.throws(() => Provable()(base).next(), /salt/);
    t.throws(() => Provable()(base).next("salt-1", 5), /clientSeed/);
    t.end();
  });
});

test("hashseries", (t) => {
  t.test("vectors", (t) => {
    const series = HashSeries({ seed: "seed", salt: "salt", nonce: 0 });
    t.equal(series.getHash(), "18e6774026b67fdf7687651023db21e4aa7259889871fbad4daed033699a5651");
    t.equal(series.peekHash(), "593210434386ec6d9cd6cef9bab11c57abe76ce0b46ff9cdde19051836bfe1d1");
    t.equal(series.calcHash("seed", "salt", 1), series.peekHash());
    t.end();
  });

  t.test("next returns the following state without mutating", (t) => {
    const series = HashSeries();
    const peek = series.peekHash();
    const following = HashSeries(series.next());
    t.equal(following.getHash(), peek);
    t.equal(series.state().nonce, 0);
    t.equal(following.state().nonce, 1);
    t.deepEqual(Object.keys(series.state()).sort(), ["nonce", "salt", "seed"]);
    t.end();
  });

  t.test("validation", (t) => {
    t.doesNotThrow(() => HashSeries());
    t.equal(HashSeries({ seed: "a", salt: "b", nonce: "3" }).state().nonce, 3);
    t.throws(() => HashSeries({ seed: "" }), /seed/);
    t.throws(() => HashSeries({ salt: 1 }), /salt/);
    t.throws(() => HashSeries({ nonce: -1 }), /nonce/);
    t.throws(() => HashSeries({ nonce: 1.5 }), /nonce/);
    t.end();
  });
});

// hash chain with seed "test" and count 10
const chainHashes = [
  "bc89c6f72947bcd2f783d342a46cafcfccfcc2e7884a34f1cfe8f55bad2d200e",
  "d36e4f43c5243135e038611e679adee4bf197290e84e0203727cb6761929e072",
  "cb90fcef122aaeed3ff1c881fd131172a55f86084cf513970ab80086d2d9fa4b",
  "4e6a8d5354c5df23ebd7a7d8eba5061d02d28e000f7fadecf73d4b5bca40e793",
  "c475204b01b18aa30282df8f80c602c13b2c9cc813b86a481a7b821bd80f075b",
  "d32b3b15471a3ddfa23c5d6d147958e8e817f65878f3df30436e61fa639127b1",
  "2ace3a22375fdf5c60d78b612ccc70c88e31cfa7c3f9be023388980a2326f2fd",
  "5b24f7aa99f1e1da5698a4f91ae0f4b45651a1b625c61ed669dd25ff5b937972",
  "7b3d979ca8330a94fa7e9e1b466d8b99e0bcdea1ec90596c0dcc8d7ef6b4300c",
  "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
];

test("hashchain", (t) => {
  t.test("vectors and iteration", (t) => {
    const chain = HashChain({ count: 10, seed: "test", index: 0 });
    t.equal(chain.get(), chainHashes[0]);
    t.equal(chain.peek(), chainHashes[1]);
    t.equal(chain.last(), undefined, "nothing before the first hash");
    const next = chain.next();
    t.deepEqual(next, { hash: chainHashes[1], count: 10, index: 1 });
    t.equal(chain.get(), chainHashes[1]);
    t.equal(chain.last(), chainHashes[0]);
    t.deepEqual(chain.state(), { count: 10, seed: "test", index: 1 });
    t.end();
  });

  t.test("every hash is the preimage of the one before it", (t) => {
    t.equal(chainHashes[9], utils.sha256("test"));
    for (let i = 1; i < chainHashes.length; i++) {
      t.equal(utils.sha256(chainHashes[i]), chainHashes[i - 1], `hash ${i}`);
    }
    t.deepEqual(HashChain.generateHashChain(10, "test"), chainHashes);
    t.end();
  });

  t.test("resumes from state", (t) => {
    const chain = HashChain({ count: 10, seed: "test" });
    chain.next();
    chain.next();
    const resumed = HashChain(chain.state());
    t.equal(resumed.get(), chain.get());
    t.equal(resumed.peek(), chain.peek());
    t.equal(resumed.next().hash, chainHashes[3]);
    t.end();
  });

  t.test("end of chain", (t) => {
    const chain = HashChain({ count: 3, seed: "x", index: 1 });
    t.equal(chain.next().index, 2);
    t.equal(chain.peek(), undefined);
    t.throws(() => chain.next(), /chain has ended/);
    t.equal(chain.state().index, 2, "index unchanged after failure");
    t.equal(chain.get(), utils.sha256("x"));
    t.end();
  });

  t.test("validation", (t) => {
    t.doesNotThrow(() => HashChain({ count: 1 }));
    t.equal(HashChain({ count: "5", index: "2", seed: "x" }).state().index, 2);
    t.throws(() => HashChain({ seed: "x", count: 0 }), /count/);
    t.throws(() => HashChain({ seed: "x", count: 2.5 }), /count/);
    t.throws(() => HashChain({ seed: "x", count: 3, index: 3 }), /index/);
    t.throws(() => HashChain({ seed: "x", count: 3, index: -1 }), /index/);
    t.throws(() => HashChain({ seed: "", count: 3 }), /seed/);
    t.throws(() => HashChain({ seed: 5, count: 3 }), /seed/);
    t.end();
  });
});
