/**
 * Provable.io TypeScript SDK
 *
 * Thin, dependency-free, fully-typed client for the Provable.io
 * provably-fair random number API. Types are generated from the public
 * OpenAPI spec (`public/openapi.json`) and re-exported from `./types`.
 *
 * @example
 * ```ts
 * import { ProvableClient } from "@provableio/sdk";
 *
 * const client = new ProvableClient({ apiKey: process.env.PROVABLE_KEY });
 * const { data, error } = await client.getFloats({ clientSeed: "order-42", count: 5 });
 * if (error) throw new Error(error.error);
 * console.log(data.outcome);
 * ```
 */

import type { paths, components } from "./openapi-types.js";

export type { paths, components } from "./openapi-types.js";

/** Operation-by-operation request/response helpers. */
type PathItem<P extends keyof paths> = paths[P];
type OpGet<P extends keyof paths> = PathItem<P> extends { get: infer O } ? O : never;
type OpPost<P extends keyof paths> = PathItem<P> extends { post: infer O } ? O : never;

type Query<O> = O extends { parameters: { query?: infer Q } } ? Q : undefined;
type PathParams<O> = O extends { parameters: { path: infer P } } ? P : undefined;
type JsonBody<O> = O extends {
  requestBody: { content: { "application/json": infer B } };
}
  ? B
  : O extends {
      requestBody?: { content: { "application/json": infer B } };
    }
  ? B | undefined
  : undefined;

type OkResponse<O> = O extends {
  responses: { 200: { content: { "application/json": infer R } } };
}
  ? R
  : O extends {
      responses: { 201: { content: { "application/json": infer R } } };
    }
  ? R
  : unknown;

type ErrResponse = components["schemas"]["Error"];

/** Discriminated result type returned by every client method. */
export type ApiResult<T> =
  | { data: T; error: null; response: Response }
  | { data: null; error: ErrResponse; response: Response };

export interface ProvableClientOptions {
  /**
   * Base URL of the API server.
   * @default "https://api.provable.io"
   */
  baseUrl?: string;
  /** API key (sent as `x-api-key`). Use a `pk_test_*` key in test mode. */
  apiKey?: string;
  /** Alternative to `apiKey`: send as `Authorization: Bearer <token>`. */
  bearerToken?: string;
  /** Optional custom fetch implementation (defaults to global `fetch`). */
  fetch?: typeof fetch;
  /** Extra headers merged into every request. */
  defaultHeaders?: Record<string, string>;
}

export interface RequestOptions {
  /** Per-request `Idempotency-Key` header (only meaningful on RNG endpoints). */
  idempotencyKey?: string;
  /** Extra per-request headers (merged on top of client defaults). */
  headers?: Record<string, string>;
  /** AbortSignal forwarded to fetch. */
  signal?: AbortSignal;
}

const DEFAULT_BASE_URL = "https://api.provable.io";

function buildQueryString(query: Record<string, unknown> | undefined): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      for (const item of v) params.append(k, String(item));
    } else {
      params.append(k, String(v));
    }
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

function substitutePath(path: string, params: Record<string, unknown> | undefined): string {
  if (!params) return path;
  return path.replace(/\{([^}]+)\}/g, (_m, key) => {
    const value = params[key];
    if (value === undefined || value === null) {
      throw new Error(`Missing path parameter: ${key}`);
    }
    return encodeURIComponent(String(value));
  });
}

/**
 * Lightweight typed client for the Provable.io HTTP API.
 *
 * Every method returns an `ApiResult<T>` discriminated union with `{ data, error, response }`.
 * No exceptions are thrown for non-2xx responses; only network / abort errors throw.
 */
export class ProvableClient {
  readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly bearerToken?: string;
  private readonly fetchImpl: typeof fetch;
  private readonly defaultHeaders: Record<string, string>;

  constructor(opts: ProvableClientOptions = {}) {
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.apiKey = opts.apiKey;
    this.bearerToken = opts.bearerToken;
    const f = opts.fetch ?? (typeof fetch !== "undefined" ? fetch : undefined);
    if (!f) {
      throw new Error(
        "No global fetch available. Pass a fetch implementation via options.fetch (Node < 18).",
      );
    }
    this.fetchImpl = f.bind(globalThis);
    this.defaultHeaders = { Accept: "application/json", ...(opts.defaultHeaders ?? {}) };
  }

  private buildHeaders(extra?: Record<string, string>, hasBody = false): Headers {
    const h = new Headers(this.defaultHeaders);
    if (hasBody) h.set("Content-Type", "application/json");
    if (this.apiKey) h.set("x-api-key", this.apiKey);
    else if (this.bearerToken) h.set("Authorization", `Bearer ${this.bearerToken}`);
    if (extra) {
      for (const [k, v] of Object.entries(extra)) h.set(k, v);
    }
    return h;
  }

  /** Low-level request helper. Exposed for advanced use (e.g. new endpoints). */
  async request<T>(
    method: string,
    path: string,
    init: {
      query?: Record<string, unknown>;
      pathParams?: Record<string, unknown>;
      body?: unknown;
    } & RequestOptions = {},
  ): Promise<ApiResult<T>> {
    const finalPath = substitutePath(path, init.pathParams);
    const url = this.baseUrl + finalPath + buildQueryString(init.query);
    const hasBody = init.body !== undefined;
    const headers = this.buildHeaders(init.headers, hasBody);
    if (init.idempotencyKey) headers.set("Idempotency-Key", init.idempotencyKey);

    const response = await this.fetchImpl(url, {
      method,
      headers,
      body: hasBody ? JSON.stringify(init.body) : undefined,
      signal: init.signal,
    });

    const ct = response.headers.get("content-type") ?? "";
    const isJson = ct.includes("application/json");
    const payload = isJson ? await response.json() : await response.text();

    if (response.ok) {
      return { data: payload as T, error: null, response };
    }
    const errorBody: ErrResponse =
      isJson && payload && typeof payload === "object"
        ? (payload as ErrResponse)
        : { error: typeof payload === "string" ? payload : `HTTP ${response.status}` };
    return { data: null, error: errorBody, response };
  }

  // ----- Random -----

  getFloats(
    query: Query<OpGet<"/api/floats">>,
    opts?: RequestOptions,
  ): Promise<ApiResult<OkResponse<OpGet<"/api/floats">>>> {
    return this.request("GET", "/api/floats", { query: query as Record<string, unknown>, ...opts });
  }

  getInts(
    query: Query<OpGet<"/api/ints">>,
    opts?: RequestOptions,
  ): Promise<ApiResult<OkResponse<OpGet<"/api/ints">>>> {
    return this.request("GET", "/api/ints", { query: query as Record<string, unknown>, ...opts });
  }

  shuffle(
    query: Query<OpGet<"/api/shuffle">>,
    opts?: RequestOptions,
  ): Promise<ApiResult<OkResponse<OpGet<"/api/shuffle">>>> {
    return this.request("GET", "/api/shuffle", { query: query as Record<string, unknown>, ...opts });
  }

  pick(
    query: Query<OpGet<"/api/pick">>,
    opts?: RequestOptions,
  ): Promise<ApiResult<OkResponse<OpGet<"/api/pick">>>> {
    return this.request("GET", "/api/pick", { query: query as Record<string, unknown>, ...opts });
  }

  getBytes(
    query: Query<OpGet<"/api/bytes">>,
    opts?: RequestOptions,
  ): Promise<ApiResult<OkResponse<OpGet<"/api/bytes">>>> {
    return this.request("GET", "/api/bytes", { query: query as Record<string, unknown>, ...opts });
  }

  rollDice(
    query: Query<OpGet<"/api/dice">>,
    opts?: RequestOptions,
  ): Promise<ApiResult<OkResponse<OpGet<"/api/dice">>>> {
    return this.request("GET", "/api/dice", { query: query as Record<string, unknown>, ...opts });
  }

  gaussian(
    query: Query<OpGet<"/api/gaussian">>,
    opts?: RequestOptions,
  ): Promise<ApiResult<OkResponse<OpGet<"/api/gaussian">>>> {
    return this.request("GET", "/api/gaussian", { query: query as Record<string, unknown>, ...opts });
  }

  batch(
    body: JsonBody<OpPost<"/api/batch">>,
    opts?: RequestOptions,
  ): Promise<ApiResult<OkResponse<OpPost<"/api/batch">>>> {
    return this.request("POST", "/api/batch", { body, ...opts });
  }

  // ----- Verification / lookup -----

  verifyServerHash(
    query: Query<OpGet<"/api/verifyServerHash">>,
    opts?: RequestOptions,
  ): Promise<ApiResult<OkResponse<OpGet<"/api/verifyServerHash">>>> {
    return this.request("GET", "/api/verifyServerHash", {
      query: query as Record<string, unknown>,
      ...opts,
    });
  }

  verifyShortId(
    query: Query<OpGet<"/api/verifyShortId">>,
    opts?: RequestOptions,
  ): Promise<ApiResult<OkResponse<OpGet<"/api/verifyShortId">>>> {
    return this.request("GET", "/api/verifyShortId", {
      query: query as Record<string, unknown>,
      ...opts,
    });
  }

  getOutcome(
    query: Query<OpGet<"/api/outcome">>,
    opts?: RequestOptions,
  ): Promise<ApiResult<OkResponse<OpGet<"/api/outcome">>>> {
    return this.request("GET", "/api/outcome", { query: query as Record<string, unknown>, ...opts });
  }

  incrementCursor(
    query: Query<OpGet<"/api/incrementCursor">>,
    opts?: RequestOptions,
  ): Promise<ApiResult<OkResponse<OpGet<"/api/incrementCursor">>>> {
    return this.request("GET", "/api/incrementCursor", {
      query: query as Record<string, unknown>,
      ...opts,
    });
  }

  listOutcomes(
    query: Query<OpGet<"/api/listOutcomes">>,
    opts?: RequestOptions,
  ): Promise<ApiResult<OkResponse<OpGet<"/api/listOutcomes">>>> {
    return this.request("GET", "/api/listOutcomes", {
      query: query as Record<string, unknown>,
      ...opts,
    });
  }

  getOutcomePermalink(
    pathParams: PathParams<OpGet<"/o/{id}">>,
    opts?: RequestOptions,
  ): Promise<ApiResult<OkResponse<OpGet<"/o/{id}">>>> {
    return this.request("GET", "/o/{id}", {
      pathParams: pathParams as Record<string, unknown>,
      ...opts,
    });
  }

  // ----- Transparency / Merkle -----

  listMerkleRoots(
    query?: Query<OpGet<"/api/merkle">>,
    opts?: RequestOptions,
  ): Promise<ApiResult<OkResponse<OpGet<"/api/merkle">>>> {
    return this.request("GET", "/api/merkle", { query: query as Record<string, unknown>, ...opts });
  }

  getMerkleRoot(
    pathParams: PathParams<OpGet<"/api/merkle/{date}">>,
    opts?: RequestOptions,
  ): Promise<ApiResult<OkResponse<OpGet<"/api/merkle/{date}">>>> {
    return this.request("GET", "/api/merkle/{date}", {
      pathParams: pathParams as Record<string, unknown>,
      ...opts,
    });
  }

  getMerkleProof(
    pathParams: PathParams<OpGet<"/api/merkle/{date}/proof/{outcomeId}">>,
    opts?: RequestOptions,
  ): Promise<ApiResult<OkResponse<OpGet<"/api/merkle/{date}/proof/{outcomeId}">>>> {
    return this.request("GET", "/api/merkle/{date}/proof/{outcomeId}", {
      pathParams: pathParams as Record<string, unknown>,
      ...opts,
    });
  }

  // ----- Commit / reveal -----

  createCommit(
    body: JsonBody<OpPost<"/api/commit">>,
    opts?: RequestOptions,
  ): Promise<ApiResult<OkResponse<OpPost<"/api/commit">>>> {
    return this.request("POST", "/api/commit", { body, ...opts });
  }

  revealCommit(
    body: JsonBody<OpPost<"/api/reveal">>,
    opts?: RequestOptions,
  ): Promise<ApiResult<OkResponse<OpPost<"/api/reveal">>>> {
    return this.request("POST", "/api/reveal", { body, ...opts });
  }

  rotateServerSeed(
    body: JsonBody<OpPost<"/api/rotate">>,
    opts?: RequestOptions,
  ): Promise<ApiResult<OkResponse<OpPost<"/api/rotate">>>> {
    return this.request("POST", "/api/rotate", { body, ...opts });
  }

  // ----- Health -----

  getHealth(opts?: RequestOptions): Promise<ApiResult<OkResponse<OpGet<"/api/health">>>> {
    return this.request("GET", "/api/health", { ...opts });
  }

  getPublicMetrics(opts?: RequestOptions): Promise<ApiResult<OkResponse<OpGet<"/api/public-metrics">>>> {
    return this.request("GET", "/api/public-metrics", { ...opts });
  }

  /**
   * Server-Sent Events stream of outcomes. Returns an async iterator of
   * parsed event payloads. Pass `lastEventId` to resume from a known event.
   *
   * @example
   * ```ts
   * for await (const ev of client.streamOutcomes({ clientSeed: "live" })) {
   *   console.log(ev);
   * }
   * ```
   */
  async *streamOutcomes(
    query: Query<OpGet<"/api/stream">>,
    opts: RequestOptions & { lastEventId?: string } = {},
  ): AsyncGenerator<unknown, void, void> {
    const url = this.baseUrl + "/api/stream" + buildQueryString(query as Record<string, unknown>);
    const headers = this.buildHeaders(opts.headers);
    headers.set("Accept", "text/event-stream");
    if (opts.lastEventId) headers.set("Last-Event-ID", opts.lastEventId);

    const response = await this.fetchImpl(url, {
      method: "GET",
      headers,
      signal: opts.signal,
    });
    if (!response.ok || !response.body) {
      throw new Error(`Stream failed: HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n\n")) !== -1) {
          const raw = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          const dataLines = raw
            .split("\n")
            .filter((l) => l.startsWith("data:"))
            .map((l) => l.slice(5).trimStart());
          if (dataLines.length === 0) continue;
          const dataStr = dataLines.join("\n");
          try {
            yield JSON.parse(dataStr);
          } catch {
            yield dataStr;
          }
        }
      }
    } finally {
      try {
        reader.releaseLock();
      } catch {
        /* noop */
      }
    }
  }
}

export default ProvableClient;
