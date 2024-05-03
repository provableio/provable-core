const assert = require('assert')
const { v4: uuid } = require("uuid");
const { sha256 } = require("./utils");

// generate a provable hash chain count to -1
function generateHashChain(count, seed) {
	assert(seed, "requires seed");
	assert(seed, "requires count");

	var result = Array(count);

	// generate chain in revese order
	for (var i = count - 1; i >= 0; i--) {
		seed = sha256(seed);
		result[i] = seed;
	}

	return result;
}

// manages generating and itteratng through a provable hashchain
// the last hash of the previous chain will be used to generate the next.
function HashChain({ seed = uuid(), count = 1000000, index = 0 }) {
	assert(count >= 1, "requires count");
	assert(seed, "requires seed");

	const chain = generateHashChain(count, seed);

	function state() {
		return { count, seed, index };
	}

	function peek() {
		return chain[index + 1];
	}

	function get() {
		return chain[index];
	}

	function next() {
		const hash = peek();
		assert(hash, 'chain has ended')

		// increment index and return hash
		return {
			hash,
			count,
			index: ++index,
		};
	}

	function last() {
		return chain[index - 1];
	}

	return {
		state,
		peek,
		get,
		next,
		last,
	};
}

module.exports = HashChain