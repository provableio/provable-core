# provableio

Official typed **Python SDK** for the [Provable.io](https://provable.io) provably-fair random number API. Models are generated from the canonical OpenAPI specification, and the client covers every published operation.

## Install

```bash
pip install provableio
```

Python 3.9+ is supported.

## Quickstart

```python
import os
from provableio import ProvableClient

with ProvableClient(api_key=os.environ.get("PROVABLE_KEY")) as client:
    result = client.get_ints({
        "clientSeed": "order-42",
        "count": 5,
        "min": 1,
        "max": 100,
    })
    if result.error:
        raise RuntimeError(result.error.error)
    print(result.data["outcome"])
```

Use `bearer_token="..."` instead of `api_key="..."` for `Authorization: Bearer` authentication. Omit both for anonymous, IP-rate-limited calls.

## Idempotency, batch, and commit/reveal

```python
result = client.get_floats(
    {"clientSeed": "order-42", "count": 1},
    idempotency_key="order-42-draw",
)

batch = client.batch({"draws": [
    {"endpoint": "ints", "params": {"clientSeed": "a", "min": 1, "max": 6}},
]}, idempotency_key="round-1")

commit = client.create_commit().data
reveal = client.reveal_commit({
    "commitId": commit["commitId"],
    "clientSeed": "round-1",
    "endpoint": "ints",
    "params": {"count": 1, "min": 1, "max": 100},
}).data
```

## Streaming (SSE)

```python
for event in client.stream_outcomes(
    {"clientSeed": "live", "endpoint": "floats"},
    last_event_id=last_seen,
):
    print(event)
```

`Last-Event-ID` is sent when `last_event_id` is provided. Transport failures and non-2xx stream responses raise `httpx.HTTPError`; ordinary API methods return `ApiResult` without throwing for non-2xx responses.

## Regenerating models

From `sdk/python`:

```bash
python generate_models.py
```

This reads `sdk/openapi.json` (a copy of https://provable.io/openapi.json) and rewrites `src/provableio/models.py` and `operations.py`.

## License

Apache-2.0 © Provable.io
