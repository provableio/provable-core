# Provable.IO Core Library

Provably fair random number generation. A server seed, a client seed and a
nonce are combined with HMAC-SHA256 into a byte stream, the bytes become
floats in `[0, 1)`, and the floats become game outcomes. Anyone holding the
three inputs can recompute every result. The package also ships a hash chain
and a hash series for games that commit to a sequence of hashes in advance.

No runtime dependencies. Requires Node.js 14.17 or later.

## Install

```
yarn add @provableio/provable-core

OR

npm install @provableio/provable-core
```

## Example

```javascript
const { Provable } = require("@provableio/provable-core");

const generator = Provable((state) => {
  // called after every draw with the new state; persist it here
  console.log(state);
})({
  serverSeed: "your-server-seed",
  clientSeed: "your-client-seed",
  nonce: 0,
});

// 5 floats in [0, 1)
console.log("floats:", generator.floats(5));

// 10 integers in [0, 99]
console.log("ints:", generator.ints(10, 100, 0));
```

## How outcomes are generated

For a draw with nonce `N`:

1. `round = 0, 1, 2, ...` Each round produces 32 bytes:
   `HMAC-SHA256(key = serverSeed, message = "clientSeed:N:round")`.
2. Bytes are consumed four at a time. Each group becomes a float:
   `b0/256 + b1/256^2 + b2/256^3 + b3/256^4`, a value in `[0, 1)` with 32 bits
   of precision.
3. `ints(count, max, min)` maps each float to `floor(min + float * max)`, an
   integer in `[min, min + max - 1]`. **`max` is the size of the range, not an
   upper bound.**
4. After the draw the nonce becomes `N + 1` and the new state is emitted.

Every draw uses the nonce as it stands and then advances it, so the outcome
recorded against nonce `N` is always reproducible from
`(serverSeed, clientSeed, N)` alone, whether the generator instance was reused
or re-created from persisted state before each call.

Before a seed pair is used, publish `serverHash = sha256(serverSeed)`. Reveal
`serverSeed` when the pair is rotated; players check the hash and recompute
their outcomes.

## Provable(emit)(config)

`emit` is optional. It receives a copy of the state after every draw.

`config` accepts:

| key          | default             | notes                                             |
| ------------ | ------------------- | ------------------------------------------------- |
| `serverSeed` | `sha256(uuid)`      | non-empty string, kept private until rotation     |
| `clientSeed` | `md5(uuid)`         | non-empty string, chosen or visible to the player |
| `nonce`      | `0`                 | non-negative safe integer                         |
| `cursor`     | `0`                 | byte offset into the stream, normally `0`         |
| `serverHash` | derived             | always recomputed as `sha256(serverSeed)`         |

Integers may be passed as canonical decimal strings (`"400"`); anything else
throws. Extra keys (ids, timestamps) are carried through untouched. The config
object you pass in is never mutated.

### state()

Returns a copy of the current state.

```javascript
generator.state();
// { serverSeed, clientSeed, serverHash, nonce, cursor }
```

### floats(count = 1)

Returns `count` floats in `[0, 1)` for the current nonce, then advances the
nonce and emits.

### ints(count, max, min = 0)

Returns `count` integers in `[min, min + max - 1]` for the current nonce, then
advances the nonce and emits. `count` and `max` must be at least 1.

```javascript
generator.ints(1, 6, 1);     // one die roll, 1..6
generator.ints(1, 10001, 0); // one value 0..10000
```

### tick()

Advances the nonce without drawing, emits, and returns the new state.

### next(salt, clientSeed)

Returns the state for the next seed rotation. Nonce and cursor restart at 0.

- `serverSeed` becomes `sha256("<current serverSeed>:<salt>")`.
- `clientSeed` is the one supplied, or `md5("<current clientSeed>:<salt>")`.

Keep `salt` private. Because the next server seed is derived from the current
one, a player who knows the salt could predict the successor of a revealed seed.

```javascript
const rotated = generator.next("private-salt", "player-chosen-seed");
// { serverSeed, clientSeed, serverHash, nonce: 0, cursor: 0 }
```

### Verifying an outcome

```javascript
const { Provable } = require("@provableio/provable-core");

function verify({ serverSeed, serverHash, clientSeed, nonce }) {
  const generator = Provable()({ serverSeed, clientSeed, nonce });
  if (generator.state().serverHash !== serverHash) throw new Error("hash mismatch");
  return generator.ints(1, 10001, 0)[0]; // same call the game made
}
```

## HashSeries({ seed, salt, nonce })

A series of hashes `HMAC-SHA256(key = seed, message = "salt:nonce")`.
Instances are immutable; `next()` returns the state for the following nonce.

```javascript
const { HashSeries } = require("@provableio/provable-core");

const series = HashSeries({ seed: "your-seed", salt: "your-salt", nonce: 0 });
series.getHash();                     // hash for nonce 0
series.peekHash();                    // hash for nonce 1
series.next();                        // { seed, salt, nonce: 1 }
HashSeries(series.next()).getHash();  // === series.peekHash()
series.calcHash(seed, salt, nonce);   // hash for arbitrary inputs
series.state();                       // { seed, salt, nonce }
```

## HashChain({ seed, count = 1000000, index = 0 })

Generates a chain of `count` SHA-256 hashes from `seed` and iterates it.
`chain[count - 1] = sha256(seed)` and `chain[i] = sha256(chain[i + 1])`, so
`chain[0]` is the terminating hash to publish before play, and every hash
handed out afterwards is the preimage of the one before it. A player checks
game `i` with `sha256(hash[i]) === hash[i - 1]`.

Generating the default one-million-hash chain takes about two seconds and
roughly 90 MB. Build it once at start-up and resume from `state()`.

```javascript
const { HashChain } = require("@provableio/provable-core");

const chain = HashChain({ seed: "your-secret-seed", count: 10 });
chain.get();    // current hash (chain[index])
chain.peek();   // next hash, or undefined at the end
chain.next();   // { hash, count, index } and advances; throws "chain has ended" at the end
chain.last();   // previous hash, or undefined at the start
chain.state();  // { count, seed, index } — includes the seed, persist privately

HashChain(chain.state()); // resumes the same chain at the same index
```

The chain does not renew itself. When `next()` throws, decide how to commit to
the next chain (for example, publish its terminating hash) before using it.

`HashChain.generateHashChain(count, seed)` returns the raw array.

## utils

```javascript
const { utils } = require("@provableio/provable-core");
```

- `sha256(input)`, `md5(input)`: hex digests. With no input, hash a random UUID.
- `defaults(state)`: normalise and validate a Provable state (see the config
  table above). Returns a new object with `serverHash` derived.
- `ByteGenerator({ serverSeed, clientSeed, nonce, cursor })`: generator function
  yielding the HMAC byte stream for a fixed nonce. Call it, do not `new` it.
- `FloatGenerator(rng, count)`: generator function turning four bytes at a time
  from `rng` into floats.
- `floats(rng, count)`, `ints(rng, count, max, min = 0)`: array forms of the above.
- `bytesToFloat([b0, b1, b2, b3])`, `floatToInt(float, max, min = 0)`: the two
  conversions described in "How outcomes are generated".
- `toInteger(value, name)`, `assertSeed(value, name)`: the validators used
  throughout.

```javascript
const rng = utils.ByteGenerator({ serverSeed, clientSeed, nonce: 0, cursor: 0 });
utils.floats(rng, 2);      // two floats from the start of the stream
utils.ints(rng, 3, 6, 1);  // three dice rolls from the bytes that follow
```

## Versioning and releases

The package follows [semver](https://semver.org). Because its purpose is
reproducibility, the rules are stricter than usual:

- **Major**: any change to the bytes, floats or integers produced for a given
  input, any tightening of accepted input, or a higher Node.js requirement.
- **Minor**: new functions or options that leave existing outputs untouched.
- **Patch**: documentation, tests, tooling, internal refactors with identical
  outputs.

Every change goes under `Unreleased` in [CHANGELOG.md](CHANGELOG.md) with the
pull request that made it.

To release, from an up-to-date `master`:

```
npm version patch   # or minor / major
```

That runs the tests, moves `Unreleased` under the new version with today's
date, commits, tags `vX.Y.Z` and pushes. The
[publish workflow](.github/workflows/publish.yml) then verifies the tag
against `package.json`, publishes to npm and creates the GitHub release from
the changelog entry. npm trusts that workflow directly (trusted publishing over
GitHub's OIDC token), so there is no npm token to store and every release
carries provenance. Nothing is published from a laptop.

## License

MIT. See [LICENSE](LICENSE).
