import httpx

from provableio import ProvableClient


def stub(handler):
    return httpx.Client(transport=httpx.MockTransport(handler))


def test_query_api_key_and_idempotency():
    captured = {}

    def handler(request):
        captured["request"] = request
        return httpx.Response(200, json={"outcome": [3], "serverHash": "abc"})

    client = ProvableClient(api_key="pk_test_abc", base_url="https://example.test", http_client=stub(handler))
    result = client.get_ints(
        {"clientSeed": "seed", "count": 1, "min": 1, "max": 6},
        idempotency_key="idem-1",
    )
    assert result.is_success and result.data["outcome"] == [3]
    request = captured["request"]
    assert str(request.url) == "https://example.test/api/ints?clientSeed=seed&count=1&min=1&max=6"
    assert request.headers["x-api-key"] == "pk_test_abc"
    assert request.headers["Idempotency-Key"] == "idem-1"


def test_bearer_error_and_path_encoding():
    requests = []

    def handler(request):
        requests.append(request)
        if request.url.path.startswith("/api/merkle"):
            return httpx.Response(429, json={"error": "slow down", "code": "rate_limited"})
        return httpx.Response(200, text="<html></html>", headers={"content-type": "text/html"})

    client = ProvableClient(bearer_token="token", base_url="https://example.test", http_client=stub(handler))
    error = client.get_merkle_proof("2026-01-01", "seed:0/1")
    assert error.error.code == "rate_limited"
    assert requests[0].headers["Authorization"] == "Bearer token"
    assert requests[0].url.raw_path.endswith(b"/seed%3A0%2F1")
    assert client.get_outcome_permalink("a b").data == "<html></html>"


def test_batch_json_and_sse_resume():
    requests = []

    def handler(request):
        requests.append(request)
        if request.url.path == "/api/stream":
            return httpx.Response(
                200,
                text=(
                    'event: outcome\nid: s:1:0\ndata: {"outcome":[0.5]}\n\n'
                    'event: done\ndata: {"reason":"limit","count":1}\n\n'
                    'event: outcome\ndata: {"outcome":[0.9]}\n\n'
                ),
                headers={"content-type": "text/event-stream"},
            )
        return httpx.Response(200, json={"results": []})

    client = ProvableClient(base_url="https://example.test", http_client=stub(handler))
    result = client.batch({"draws": []}, idempotency_key="batch-1")
    assert result.data == {"results": []}
    assert requests[0].read() == b'{"draws":[]}'
    events = list(client.stream_outcomes({"clientSeed": "s", "endpoint": "floats"}, last_event_id="s:1:0"))
    assert events == [{"outcome": [0.5]}]
    assert requests[1].headers["Last-Event-ID"] == "s:1:0"


def test_python_keyword_parameter_uses_openapi_wire_name():
    captured = {}

    def handler(request):
        captured["request"] = request
        return httpx.Response(200, json={"outcome": [1.25]})

    client = ProvableClient(base_url="https://example.test", http_client=stub(handler))
    client.gaussian({
        "clientSeed": "distribution",
        "distribution": "exponential",
        "lambda_": 2,
    })
    params = captured["request"].url.params
    assert params["lambda"] == "2"
    assert "lambda_" not in params
