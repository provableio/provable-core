// Smoke test for the built SDK. Uses a stub fetch so it doesn't touch the
// network. Run with: `npm test` from sdk/typescript (after `npm run build`).
import { test } from "node:test";
import assert from "node:assert/strict";
import { ProvableClient } from "../dist/index.js";

function makeStubFetch(handler) {
  return async (url, init) => handler(url, init);
}

test("constructs the right URL, headers, and query string for getInts", async () => {
  let captured;
  const client = new ProvableClient({
    apiKey: "pk_test_abc",
    baseUrl: "https://api.example.test",
    fetch: makeStubFetch((url, init) => {
      captured = { url, init };
      return new Response(
        JSON.stringify({ outcome: [1, 2, 3], serverHash: "deadbeef" }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }),
  });

  const result = await client.getInts(
    { clientSeed: "s1", count: 3, min: 1, max: 6 },
    { idempotencyKey: "idem-1" },
  );

  assert.equal(result.error, null);
  assert.deepEqual(result.data.outcome, [1, 2, 3]);
  assert.equal(
    captured.url,
    "https://api.example.test/api/ints?clientSeed=s1&count=3&min=1&max=6",
  );
  assert.equal(captured.init.method, "GET");
  assert.equal(captured.init.headers.get("x-api-key"), "pk_test_abc");
  assert.equal(captured.init.headers.get("idempotency-key"), "idem-1");
});

test("returns the error payload on non-2xx responses without throwing", async () => {
  const client = new ProvableClient({
    fetch: makeStubFetch(
      () =>
        new Response(
          JSON.stringify({ error: "nope", code: "rate_limited" }),
          { status: 429, headers: { "content-type": "application/json" } },
        ),
    ),
  });

  const result = await client.getFloats({ clientSeed: "s", count: 1 });
  assert.equal(result.data, null);
  assert.equal(result.error.code, "rate_limited");
  assert.equal(result.response.status, 429);
});

test("substitutes path parameters for permalink lookup", async () => {
  let capturedUrl;
  const client = new ProvableClient({
    baseUrl: "https://api.example.test",
    fetch: makeStubFetch((url) => {
      capturedUrl = url;
      return new Response("{}", {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }),
  });

  await client.getOutcomePermalink({ id: "abc 123" });
  assert.equal(capturedUrl, "https://api.example.test/o/abc%20123");
});

test("sends bearer token when configured", async () => {
  let capturedAuth;
  const client = new ProvableClient({
    bearerToken: "pk_live_xyz",
    fetch: makeStubFetch((_url, init) => {
      capturedAuth = init.headers.get("authorization");
      return new Response("{}", {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }),
  });

  await client.getHealth();
  assert.equal(capturedAuth, "Bearer pk_live_xyz");
});

test("POSTs JSON body for /api/batch", async () => {
  let captured;
  const client = new ProvableClient({
    fetch: makeStubFetch((url, init) => {
      captured = { url, init };
      return new Response(JSON.stringify({ results: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }),
  });

  await client.batch({
    draws: [{ kind: "ints", clientSeed: "s", count: 1, min: 1, max: 2 }],
  });
  assert.equal(captured.init.method, "POST");
  assert.equal(captured.init.headers.get("content-type"), "application/json");
  const body = JSON.parse(captured.init.body);
  assert.equal(body.draws.length, 1);
});

test("every JSON operation in openapi.json has a client method", async () => {
  const { readFile } = await import("node:fs/promises");
  const spec = JSON.parse(await readFile(new URL("../../openapi.json", import.meta.url), "utf8"));
  const src = await readFile(new URL("../src/index.ts", import.meta.url), "utf8");
  // og.png is an image for social cards, not an API call
  const missing = Object.keys(spec.paths).filter((p) => !p.endsWith("/og.png") && !src.includes(`"${p}"`));
  assert.deepEqual(missing, []);
});
