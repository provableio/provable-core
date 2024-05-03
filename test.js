const test = require("tape");
const Provable = require("./provable");
const { HashSeries, ChainSeries, HashChain } = require("./utils");

let config = {
  clientSeed: "bba625387fb64d772ff7da0ed6e71b16",
  created: 1597620193906,
  cursor: 0,
  id: "d2026ad4-480c-4d30-b963-9e3a59c5e22d",
  nonce: 400,
  serverHash:
    "158e995ed494f58c06d93e22f71554cf2126614174fde336aedf9a457dbf16f4",
  serverSeed:
    "aa47ddbf021afd16d64756e7f32b6cea2feebdfddc8fd57f1522641fdf372375",
  updated: 1598719893207,
};

const answers = [
  3842, 9426, 5011, 9503, 1378, 9933, 9048, 9339, 4585, 7847, 2357, 9807, 8488,
  5542,
];
test("provable", (t) => {
  let provable;
  t.test("init", (t) => {
    provable = Provable((x) => console.log(x))(config);
    t.ok(provable);
    t.end();
  });
  t.test("floats", (t) => {
    answers.forEach((answer) => {
      let provable = Provable((x) => (config = x))(config);
      const [result] = provable.ints(1, 10001, 0);
      // const [result] = provable.floats(1)
      // t.equal(Math.round(result * 10000),answer)
      t.equal(result, answer);
      console.log(result);
    });
    t.end();
  });
});
test("utils", (t) => {
  t.test("hashseries", (t) => {
    const series = HashSeries();
    const hash = series.getHash();
    t.ok(hash);
    const next = series.peekHash();
    const nextSeries = HashSeries(series.next());
    t.equal(next, nextSeries.getHash());
    t.end();
  });
  t.test("hashseries", (t) => {
    const series = HashSeries();
    const result = series.state();
    t.ok(result);
    t.end();
  });
});

// hash chain seed "test" should match these
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
  t.test("init", (t) => {
    const chain = HashChain({ count: 10, seed: "test", index: 0 });

    // tests
    const hash = chain.get();
    t.ok(hash);
    t.equal(hash, chainHashes[0]);

    const peek = chain.peek();
    t.notEqual(hash, peek);
    t.equal(peek, chainHashes[1]);

    const next = chain.next();
    t.equal(next.hash, peek);

    const last = chain.last();
    t.equal(hash, last);

    const state = chain.state();
    console.log("chain state:", state);
    t.ok(state);

    t.end();
  });
});
