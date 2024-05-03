# Provable.IO Core Library

This is a random number generator core library that uses various hashing functions, byte generation, and other utilities. The generator can produce both floating-point and integer numbers with configurable settings.

## Example

```javascript
const {
  Provable,
  HashChain,
  HashSeries,
  utils,
} = require("@provableio/provable-core");

const config = {
  serverSeed: "your-server-seed",
  clientSeed: "your-client-seed",
  nonce: 0,
  cursor: 0,
};

const generator = Provable((x) => {
  // update database?
  console.log(x)
})(config);

// Generate 5 Floating point outcomes
const randomFloats = generator.floats(5);
console.log("floats:", randomFloats);

// generate 10 outcomes between 0 - 100
const randomInts = generator.ints(10, 100, 0);
console.log("ints:", randomInts);
```

The `config` object contains the following properties:
- `serverSeed` (string): The server seed used for generating random numbers.
- `clientSeed` (string): The client seed used for generating random numbers.
- `nonce` (number): The current nonce value.
- `cursor` (number): The current cursor value.

## Available methods

The Provable instance has the following methods:

### next(salt, clientSeed)

Returns an object containing the next `clientSeed` and `serverSeed` values based on the provided `salt` and `clientSeed` values. If `clientSeed` is not provided, it will be generated using the `md5` hashing function.

```javascript
const nextValues = generator.next("salt-value");
console.log(nextValues); // { clientSeed: "generated-client-seed", serverSeed: "generated-server-seed" }
```

### state()

Returns the current configuration object.

```javascript
const currentConfig = generator.state();
console.log(currentConfig); // { clientSeed: "your-client-seed", serverSeed: "your-server-seed", nonce: 0, emit: [Function: emit] }
```

### floats(count)

Generates `count` number of random floating-point numbers using the configured generator. The `count` argument is optional and defaults to `1`.

```javascript
const randomFloats = generator.floats(5);
console.log(randomFloats); // [0.123456789, 0.234567890, 0.345678901, 0.4567890123, 0.56789012345]
```

The generator's configuration is updated after generating the random numbers, and the `nonce` value is incremented. If an `emit` callback function is provided, it will be called with the updated configuration.

### ints(count, max, min)

Generates `count` number of random integer numbers within the range of `min` and `max` (inclusive) using the configured generator. The `count`, `max`, and `min` arguments are optional and default to `1`, `100`, and `0`, respectively.

```javascript
const randomInts = generator.ints(10, 100, 0);
console.log(randomInts); // [100, 25, 23, 22, 21, 20, 19, 18, 17, 16]
```

The generator's configuration is updated after generating the random numbers, and the `nonce` value is incremented. If an `emit` callback function is provided, it will be called with the updated configuration.

### tick()

Increments the `nonce` value and emits the updated configuration (if an `emit` callback function is provided).

```javascript
generator.tick();
```

## Additional Generators

### HashSeries({ seed, salt, nonce })

This class is used to generate a series of hashes based on the provided `seed`, `salt`, and `nonce` values. It has the following methods:

- `getHash()`: Returns the current hash value.
- `next()`: Increments the `nonce` value and returns a new object with the updated `seed`, `salt`, and `nonce`.
- `peekHash()`: Returns the next hash value based on the updated `nonce` value.
- `calcHash(_seed, _salt, _nonce)`: Calculates the hash value using the provided `seed`, `salt`, and `nonce` values.
- `state()`: Returns an object containing the `seed`, `salt`, and `nonce` values.

```javascript
const hashSeries = new HashSeries({ seed: "your-seed", salt: "your-salt", nonce: 0 });
console.log(hashSeries.getHash()); // Generated hash value
console.log(hashSeries.next()); // { seed: "your-seed", salt: "your-salt", nonce: 1 }
console.log(hashSeries.peekHash()); // Generated hash value based on nonce + 1
```

### HashChain({ seed, count, index })

This class is used to manage generating and iterating through a provable hash chain. It has the following methods:

- `state()`: Returns an object containing the `count`, `seed`, and `index` values.
- `peek()`: Returns the next hash value in the chain based on the current `index`.
- `get()`: Returns the current hash value in the chain based on the current `index`.
- `next()`: Returns an object containing the next hash value in the chain, the `count`, and the updated `index`.
- `last()`: Returns the previous hash value in the chain based on the current `index`.

```javascript
const hashChain = new HashChain({ seed: "your-seed", count: 10 });
console.log(hashChain.state()); // Generated state object
console.log(hashChain.peek()); // Generated next hash value in the chain
console.log(hashChain.get()); // Generated current hash value in the chain
console.log(hashChain.next()); // Generated next hash value in the chain, count, and updated index
console.log(hashChain.last()); // Generated previous hash value in the chain
```


## Additional Utilities 

### defaults(state)

This function sets default values for the `state` object and returns it. If the `state` object is missing some properties, they will be set to the default values.

```javascript
const defaultState = defaults({});
console.log(defaultState); // { serverSeed: sha256(), clientSeed: md5(), nonce: 0, cursor: 0, serverHash: sha256(serverSeed) }
```

### sha256(input)

This function generates a SHA-256 hash value for the provided `input` string. If no `input` is provided, it will generate a hash value for a UUID.

```javascript
const hash = sha256("your-input");
console.log(hash); // Generated SHA-256 hash value
```

### md5(input)

This function generates an MD5 hash value for the provided `input` string. If no `input` is provided, it will generate a hash value for a UUID.

```javascript
const hash = md5("your-input");
console.log(hash); // Generated MD5 hash value
```

### ByteGenerator({ serverSeed, clientSeed, nonce, cursor })

This generator function produces a sequence of bytes based on the provided `serverSeed`, `clientSeed`, `nonce`, and `cursor` values. It uses the SHA-256 hashing function to generate bytes and yields them one by one.

```javascript
const byteGenerator = new ByteGenerator({ serverSeed: "your-server-seed", clientSeed: "your-client-seed", nonce: 0, cursor: 0 });
for (let byte of byteGenerator) {
  console.log(byte); // Yielded bytes
}
```

### bytesToFloat(bytes)

This function converts an array of bytes to a floating-point number.

```javascript
const float = bytesToFloat([128, 64, 32, 0]);
console.log(float); // Generated float value
```

### floatToInt(val, max, min)

This function converts a floating-point number to an integer within the range of `min` and `max` (inclusive).

```javascript
const int = floatToInt(0.5, 100, 0);
console.log(int); // Generated integer value
```

### FloatGenerator(rng, count)

This generator function produces a sequence of floating-point numbers based on the provided `rng` (random number generator) and `count` values. It uses the `ByteGenerator` to generate bytes and converts them to floating-point numbers using the `bytesToFloat` function.

```javascript
const floatGenerator = new FloatGenerator(byteGenerator, 10);
for (let float of floatGenerator) {
  console.log(float); // Yielded floating-point numbers
}
```

### floats(rng, count)

This function generates an array of `count` number of random floating-point numbers using the provided `rng` (random number generator).

```javascript
const randomFloats = floats(byteGenerator, 5);
console.log(randomFloats); // Generated array of floating-point numbers
```

### ints(rng, count, max, min)

This function generates an array of `count` number of random integer numbers within the range of `min` and `max` (inclusive) using the provided `rng` (random number generator).

```javascript
const randomInts = ints(byteGenerator, 10, 50, -25);
console.log(randomInts); // Generated array of integer numbers
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
