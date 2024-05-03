# Provable.IO Core Library

This is a random number generator core library that uses various hashing functions, byte generation, and other utilities. The generator can produce both floating-point and integer numbers with configurable settings.

## Installation

1. Clone the repository or download the source code.
2. Install the dependencies by running `yarn install` in the project directory.

## Usage

Import the generator function in your project:

```javascript
const Provable = require("@provableio/provable-core");
```

Create an instance of the generator with your desired configuration:

```javascript

const config = {
  serverSeed: "your-server-seed",
  clientSeed: "your-client-seed",
  nonce: 0,
  cursor: 0,
}

const generator = Provable(
	(state) => { /* do somthing */ },
	config
);
```
The `config` object contains the following properties:
- `serverSeed` (string): The server seed used for generating random numbers.
- `clientSeed` (string): The client seed used for generating random numbers.
- `nonce` (number): The current nonce value.
- `cursor` (number): The current cursor value.

## Additional Utilities 

### defaults(state)

This function sets default values for the `state` object and returns it. If the `state` object is missing some properties, they will be set to the default values.

```javascript
const defaultState = defaults({});
console.log(defaultState); // { serverSeed: sha256(), clientSeed: md5(), nonce: 0, cursor: 0, serverHash: sha256(serverSeed) }
```

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