# @provableio/sdk

Official **TypeScript SDK** for the [Provable.io](https://provable.io) provably-fair random number API.

- 🔒 Fully typed — request params, query strings, and response bodies are generated from the canonical [OpenAPI 3.0 spec](https://provable.io/openapi.json).
- 🪶 Zero runtime dependencies. Uses the built-in `fetch` (Node 18+, browsers, Deno, Bun, Cloudflare Workers).
- 🔁 First-class support for `Idempotency-Key`, commit-reveal, batch draws, Merkle inclusion proofs, and the SSE outcome stream.
- 🧪 Works with `pk_test_*` keys (test-mode outcomes don't touch live seed state and don't count toward your quota).

## Install

```bash
npm install @provableio/sdk
# or: pnpm add @provableio/sdk / yarn add @provableio/sdk
```

## Quickstart

```ts
import { ProvableClient } from "@provableio/sdk";

const client = new ProvableClient({
  apiKey: process.env.PROVABLE_KEY, // or omit for anonymous (rate-limited) calls
});

const { data, error } = await client.getInts({
  clientSeed: "order-42",
  count: 5,
  min: 1,
  max: 100,
});

if (error) {
  throw new Error(`API ${error.code ?? ""}: ${error.error}`);
}

console.log(data.outcome);     // the integers
console.log(data.serverHash);  // commit you can later verify
```

Every method returns a discriminated `ApiResult<T> = { data, error: null } | { data: null, error }`.
No exceptions are thrown for non-2xx responses — only network/abort errors throw.

## Authentication

Pass **one** of:

```ts
new ProvableClient({ apiKey: "pk_live_..." });           // x-api-key header
new ProvableClient({ bearerToken: "pk_live_..." });      // Authorization: Bearer ...
```

Both anonymous and authenticated calls work. Anonymous calls are rate-limited by IP and aren't attributed to an account.

## Idempotency

Send a per-request idempotency key on any RNG endpoint. Retries within 24 hours return the original outcome byte-for-byte and **don't** count toward your daily quota.

```ts
await client.getFloats(
  { clientSeed: "order-42", count: 1 },
  { idempotencyKey: crypto.randomUUID() },
);
```

## Commit / reveal

```ts
const { data: commit } = await client.createCommit({ clientSeed: "round-1" });
// ...later, after the player has locked in their bet:
const { data: reveal } = await client.revealCommit({ commitId: commit!.commitId });
```

## Streaming outcomes (SSE)

```ts
for await (const event of client.streamOutcomes(
  { clientSeed: "live-feed" },
  { lastEventId: lastSeen },
)) {
  console.log(event);
}
```

Pass `AbortSignal` via the request options to stop the stream.

## Batching

```ts
const { data } = await client.batch({
  draws: [
    { kind: "ints",   clientSeed: "s1", count: 3, min: 1, max: 6 },
    { kind: "floats", clientSeed: "s2", count: 2 },
  ],
});
```

## Verification

```ts
const { data } = await client.verifyServerHash({
  serverSeed: "...",
  clientSeed: "order-42",
  nonce: 0,
});
```

## Escape hatch

If you need to call an endpoint that's newer than this SDK, use the typed low-level helper:

```ts
const res = await client.request<MyResponseType>("GET", "/api/some-new-endpoint", {
  query: { foo: 1 },
  headers: { "X-Custom": "1" },
});
```

You can also import the raw generated OpenAPI types:

```ts
import type { paths, components } from "@provableio/sdk";
```

## Versioning

Types are generated from [`sdk/openapi.json`](https://github.com/provableio/provable-core/blob/master/sdk/openapi.json), a copy of the spec served at https://provable.io/openapi.json.

SDK versions follow semver. Breaking changes to the API surface bump the SDK's major version.

## License

Apache-2.0 © Provable.io
