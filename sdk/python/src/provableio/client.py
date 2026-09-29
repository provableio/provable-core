"""Typed synchronous client for every operation in the public OpenAPI spec."""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Dict, Generic, Iterator, Mapping, Optional, TypedDict, TypeVar, Union
try:
    from typing import Unpack
except ImportError:
    from typing_extensions import Unpack
from urllib.parse import quote

import httpx

from . import models
from .operations import OPERATIONS

T = TypeVar("T")
DEFAULT_BASE_URL = "https://api.provable.io"


@dataclass(frozen=True)
class ApiError:
    error: str
    code: Optional[str] = None


@dataclass(frozen=True)
class ApiResult(Generic[T]):
    data: Optional[T]
    error: Optional[ApiError]
    response: httpx.Response

    @property
    def is_success(self) -> bool:
        return self.error is None


class RequestOptions(TypedDict, total=False):
    idempotency_key: str
    headers: Mapping[str, str]


class ProvableClient:
    """Provable.io API client.

    API errors are returned in :class:`ApiResult`; transport errors raise
    ``httpx.HTTPError``. The client owns its HTTP connection unless a custom
    ``httpx.Client`` is supplied.
    """

    def __init__(
        self,
        *,
        api_key: Optional[str] = None,
        bearer_token: Optional[str] = None,
        base_url: str = DEFAULT_BASE_URL,
        headers: Optional[Mapping[str, str]] = None,
        timeout: Union[float, httpx.Timeout] = 30.0,
        http_client: Optional[httpx.Client] = None,
    ) -> None:
        auth_headers = dict(headers or {})
        auth_headers.setdefault("Accept", "application/json")
        if api_key:
            auth_headers["x-api-key"] = api_key
        elif bearer_token:
            auth_headers["Authorization"] = f"Bearer {bearer_token}"
        self.base_url = base_url.rstrip("/")
        self._owns_client = http_client is None
        self._client = http_client or httpx.Client(headers=auth_headers, timeout=timeout)
        self._headers = auth_headers

    def close(self) -> None:
        if self._owns_client:
            self._client.close()

    def __enter__(self) -> "ProvableClient":
        return self

    def __exit__(self, *_: object) -> None:
        self.close()

    def request(
        self,
        method: str,
        path: str,
        *,
        query: Optional[Mapping[str, Any]] = None,
        body: Any = None,
        idempotency_key: Optional[str] = None,
        headers: Optional[Mapping[str, str]] = None,
    ) -> ApiResult[Any]:
        request_headers = {**self._headers, **dict(headers or {})}
        if idempotency_key:
            request_headers["Idempotency-Key"] = idempotency_key
        params = [(key, item) for key, value in (query or {}).items() if value is not None
                  for item in (value if isinstance(value, (list, tuple)) else [value])]
        request_args: Dict[str, Any] = {
            "params": params,
            "headers": request_headers,
        }
        if body is not None:
            request_args["json"] = body
        response = self._client.request(method, self.base_url + path, **request_args)
        content_type = response.headers.get("content-type", "")
        if content_type.startswith("image/"):
            payload = response.content
        else:
            payload = response.json() if "json" in content_type else response.text
        if response.is_success:
            return ApiResult(data=payload, error=None, response=response)
        if isinstance(payload, dict):
            error = ApiError(str(payload.get("error", f"HTTP {response.status_code}")), payload.get("code"))
        else:
            error = ApiError(str(payload) or f"HTTP {response.status_code}")
        return ApiResult(data=None, error=error, response=response)

    def _operation(
        self,
        operation_id: str,
        *,
        query: Optional[Mapping[str, Any]] = None,
        path_params: Optional[Mapping[str, Any]] = None,
        body: Any = None,
        options: Optional[Mapping[str, Any]] = None,
    ) -> ApiResult[Any]:
        operation = OPERATIONS[operation_id]
        path = operation["path"]
        for name in operation["path_params"]:
            if path_params is None or name not in path_params:
                raise ValueError(f"Missing path parameter: {name}")
            path = path.replace("{" + name + "}", quote(str(path_params[name]), safe=""))
        aliases = operation["query_aliases"]
        wire_query = (
            {aliases.get(name, name): value for name, value in query.items()}
            if query is not None
            else None
        )
        return self.request(
            operation["method"],
            path,
            query=wire_query,
            body=body,
            **dict(options or {}),
        )

    def get_floats(self, query: models.GetFloatsParams, **options: Unpack[RequestOptions]) -> ApiResult[models.GetFloatsResponse]:
        return self._operation("getFloats", query=query, options=options)

    def get_ints(self, query: models.GetIntsParams, **options: Unpack[RequestOptions]) -> ApiResult[models.GetIntsResponse]:
        return self._operation("getInts", query=query, options=options)

    def shuffle(self, query: models.ShuffleItemsParams, **options: Unpack[RequestOptions]) -> ApiResult[models.ShuffleItemsResponse]:
        return self._operation("shuffleItems", query=query, options=options)

    def pick(self, query: models.PickItemParams, **options: Unpack[RequestOptions]) -> ApiResult[models.PickItemResponse]:
        return self._operation("pickItem", query=query, options=options)

    def get_bytes(self, query: models.GetBytesParams, **options: Unpack[RequestOptions]) -> ApiResult[models.GetBytesResponse]:
        return self._operation("getBytes", query=query, options=options)

    def roll_dice(self, query: models.RollDiceParams, **options: Unpack[RequestOptions]) -> ApiResult[models.RollDiceResponse]:
        return self._operation("rollDice", query=query, options=options)

    def gaussian(self, query: models.GaussianParams, **options: Unpack[RequestOptions]) -> ApiResult[models.GaussianResponse]:
        return self._operation("gaussian", query=query, options=options)

    def batch(self, body: models.BatchRequest, **options: Unpack[RequestOptions]) -> ApiResult[models.BatchDrawResponse]:
        return self._operation("batchDraw", body=body, options=options)

    def create_commit(self, **options: Unpack[RequestOptions]) -> ApiResult[models.CreateCommitResponse]:
        return self._operation("createCommit", options=options)

    def reveal_commit(self, body: models.RevealRequest, **options: Unpack[RequestOptions]) -> ApiResult[models.RevealCommitResponse]:
        return self._operation("revealCommit", body=body, options=options)

    def rotate_server_seed(self, body: models.RotateServerSeedBody, **options: Unpack[RequestOptions]) -> ApiResult[models.RotateServerSeedResponse]:
        return self._operation("rotateServerSeed", body=body, options=options)

    def verify_server_hash(self, query: models.VerifyServerHashParams, **options: Unpack[RequestOptions]) -> ApiResult[models.VerifyServerHashResponse]:
        return self._operation("verifyServerHash", query=query, options=options)

    def verify_short_id(self, query: models.VerifyShortIdParams, **options: Unpack[RequestOptions]) -> ApiResult[models.VerifyShortIdResponse]:
        return self._operation("verifyShortId", query=query, options=options)

    def get_outcome(self, query: models.GetOutcomeParams, **options: Unpack[RequestOptions]) -> ApiResult[models.GetOutcomeResponse]:
        return self._operation("getOutcome", query=query, options=options)

    def increment_cursor(self, query: models.IncrementCursorParams, **options: Unpack[RequestOptions]) -> ApiResult[models.IncrementCursorResponse]:
        return self._operation("incrementCursor", query=query, options=options)

    def list_outcomes(self, query: Optional[models.ListOutcomesParams] = None, **options: Unpack[RequestOptions]) -> ApiResult[models.ListOutcomesResponse]:
        return self._operation("listOutcomes", query=query, options=options)

    def list_merkle_roots(self, query: Optional[models.ListMerkleRootsParams] = None, **options: Unpack[RequestOptions]) -> ApiResult[models.ListMerkleRootsResponse]:
        return self._operation("listMerkleRoots", query=query, options=options)

    def get_merkle_root(self, date: str, **options: Unpack[RequestOptions]) -> ApiResult[models.GetMerkleRootResponse]:
        return self._operation("getMerkleRoot", path_params={"date": date}, options=options)

    def get_merkle_proof(self, date: str, outcome_id: str, **options: Unpack[RequestOptions]) -> ApiResult[models.GetMerkleProofResponse]:
        return self._operation(
            "getMerkleProof",
            path_params={"date": date, "outcomeId": outcome_id},
            options=options,
        )

    def get_health(self, **options: Unpack[RequestOptions]) -> ApiResult[models.GetHealthResponse]:
        return self._operation("getHealth", options=options)

    def get_public_metrics(self, **options: Unpack[RequestOptions]) -> ApiResult[models.GetPublicMetricsResponse]:
        return self._operation("getPublicMetrics", options=options)

    def get_outcome_permalink(self, outcome_id: str, **options: Unpack[RequestOptions]) -> ApiResult[models.GetOutcomePermalinkResponse]:
        return self._operation(
            "getOutcomePermalink", path_params={"id": outcome_id}, options=options,
        )

    def get_outcome_og_image(self, outcome_id: str, **options: Unpack[RequestOptions]) -> ApiResult[models.GetOutcomeOgImageResponse]:
        return self._operation(
            "getOutcomeOgImage", path_params={"id": outcome_id}, options=options,
        )

    def stream_outcomes(
        self,
        query: models.StreamOutcomesParams,
        *,
        last_event_id: Optional[str] = None,
        headers: Optional[Mapping[str, str]] = None,
    ) -> Iterator[models.Outcome]:
        stream_headers = {**self._headers, **dict(headers or {}), "Accept": "text/event-stream"}
        if last_event_id:
            stream_headers["Last-Event-ID"] = last_event_id
        operation = OPERATIONS["streamOutcomes"]
        with self._client.stream(
            operation["method"], self.base_url + operation["path"], params=query, headers=stream_headers,
        ) as response:
            response.raise_for_status()
            data_lines = []
            event_name = "message"
            for line in response.iter_lines():
                if line.startswith("event:"):
                    event_name = line[6:].strip()
                elif line.startswith("data:"):
                    data_lines.append(line[5:].lstrip())
                elif not line and data_lines:
                    data = "\n".join(data_lines)
                    data_lines = []
                    if event_name == "done":
                        return
                    if event_name in ("message", "outcome"):
                        yield json.loads(data)
                    event_name = "message"
