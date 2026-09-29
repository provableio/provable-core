"""Generated from public/openapi.json. Do not edit by hand."""
from __future__ import annotations
from typing import Any, Dict, List, Literal, TypedDict, Union
try:
    from typing import Required
except ImportError:
    from typing_extensions import Required

class BaseOutcome(TypedDict, total=False):
    clientSeed: Required[str]
    serverHash: Required[str]
    nonce: Required[int]
    cursor: Required[int]
    count: Required[int]
    created: Required[int]
    shortId: Required[str]
    mode: Required[Literal['live', 'test']]
    toolMeta: Dict[str, Any]
    redacted: bool

class PasswordReceipt(TypedDict, total=False):
    serverHash: Required[str]
    endpoint: Required[Literal['ints']]
    outcome: Required[Any]
    clientSeed: str
    cursor: int
    nonce: int
    count: int
    min: int
    max: int
    created: int
    shortId: Required[str]
    mode: str
    toolMeta: Required[Dict[str, Any]]
    redacted: Required[Literal[True]]
    permalink: str

class VerifyResult(TypedDict, total=False):
    verified: Required[bool]
    clientSeed: Required[str]
    serverHash: Required[str]
    outcomes: Required[List[VerifyResultOutcomesItem]]

class FloatOutcome(BaseOutcome, total=False):
    outcome: Required[List[float]]
    endpoint: Required[Literal['floats']]
    mode: Required[Literal['live', 'test']]
    permalink: Required[str]

class IntOutcome(BaseOutcome, total=False):
    outcome: Required[List[int]]
    endpoint: Required[Literal['ints']]
    min: Required[int]
    max: Required[int]
    mode: Required[Literal['live', 'test']]
    permalink: Required[str]

class MerkleRoot(TypedDict, total=False):
    date: Required[str]
    root: Required[str]
    leafCount: Required[int]
    treeHeight: Required[int]
    publishedAt: Required[int]

class MerkleProof(TypedDict, total=False):
    date: Required[str]
    outcomeId: Required[str]
    leaf: Required[MerkleProofLeaf]
    index: Required[int]
    leafCount: Required[int]
    treeHeight: int
    root: Required[str]
    publishedAt: int
    siblings: Required[List[MerkleProofSiblingsItem]]

class ShuffleOutcome(BaseOutcome, total=False):
    outcome: Required[List[Any]]
    endpoint: Required[Literal['shuffle']]
    permalink: Required[str]

class Commit(TypedDict, total=False):
    commitId: Required[str]
    serverHash: Required[str]
    expiresAt: Required[int]

class RevealRequest(TypedDict, total=False):
    commitId: Required[str]
    clientSeed: Required[str]
    endpoint: Required[Literal['floats', 'ints']]
    params: RevealRequestParams

class RevealOutcome(BaseOutcome, total=False):
    outcome: Required[List[float]]
    endpoint: Required[Literal['floats', 'ints']]
    min: int
    max: int
    serverSeed: Required[str]
    commitId: Required[str]

class PickOutcome(BaseOutcome, total=False):
    outcome: Required[Any]
    index: Required[int]
    weights: Required[List[float]]
    endpoint: Required[Literal['pick']]
    permalink: Required[str]

class BytesOutcome(BaseOutcome, total=False):
    outcome: Required[str]
    encoding: Required[Literal['hex', 'base64']]
    endpoint: Required[Literal['bytes']]
    permalink: Required[str]

class DiceOutcome(BaseOutcome, total=False):
    outcome: Required[DiceOutcomeOutcome]
    sides: Required[int]
    modifier: Required[int]
    endpoint: Required[Literal['dice']]
    permalink: Required[str]

class GaussianOutcome(BaseOutcome, total=False):
    outcome: Required[List[float]]
    distribution: Required[Literal['normal', 'exponential', 'poisson']]
    mean: float
    stddev: float
    lambda_: float
    endpoint: Required[Literal['gaussian']]
    permalink: Required[str]

class BatchRequest(TypedDict, total=False):
    draws: Required[List[BatchRequestDrawsItem]]

class BatchResponse(TypedDict, total=False):
    results: Required[List[Union[BatchResponseResultsItemVariant1, BatchResponseResultsItemVariant2]]]

class PublicMetrics(TypedDict, total=False):
    registeredUsers: Required[PublicMetricsRegisteredUsers]
    callsServed: Required[PublicMetricsCallsServed]
    responseTime: Required[PublicMetricsResponseTime]
    apiStatus: Required[Literal['operational', 'degraded']]

class Health(TypedDict, total=False):
    status: Required[Literal['ok', 'degraded', 'shutting_down']]
    db: Literal['ok', 'down']
    version: Required[str]
    uptime: Required[int]
    timestamp: Required[str]
    responseTimes: HealthResponseTimes
    usagePersistence: HealthUsagePersistence

class ResponseTimeStats(TypedDict, total=False):
    count: Required[int]
    avgMs: Required[float]
    p50Ms: Required[float]
    p95Ms: Required[float]
    maxMs: Required[float]

class Error(TypedDict, total=False):
    error: Required[str]
    requestId: str
    retryAfter: int

class VerifyResultOutcomesItem(TypedDict, total=False):
    shortId: Required[str]
    permalink: Required[str]
    endpoint: str
    cursor: int
    nonce: int
    created: int

class MerkleProofLeaf(TypedDict, total=False):
    outcomeId: str
    serverHash: str
    clientSeed: str
    timestamp: int
    canonical: Required[str]
    hash: Required[str]

class MerkleProofSiblingsItem(TypedDict, total=False):
    position: Required[Literal['left', 'right']]
    hash: Required[str]

class RevealRequestParams(TypedDict, total=False):
    count: int
    min: int
    max: int

class DiceOutcomeOutcome(TypedDict, total=False):
    notation: Required[str]
    rolls: Required[List[int]]
    modifier: Required[int]
    total: Required[int]

class BatchRequestDrawsItem(TypedDict, total=False):
    endpoint: Required[Literal['floats', 'ints', 'shuffle', 'pick', 'bytes', 'dice', 'gaussian']]
    params: Dict[str, Any]

class BatchResponseResultsItemVariant1(TypedDict, total=False):
    ok: Required[Literal[True]]
    outcome: Required[Outcome]

class BatchResponseResultsItemVariant2(TypedDict, total=False):
    ok: Required[Literal[False]]
    error: Required[str]
    code: str

class PublicMetricsRegisteredUsers(TypedDict, total=False):
    value: Required[int]
    scope: Required[Literal['current']]

class PublicMetricsCallsServed(TypedDict, total=False):
    value: Required[int]
    scope: Required[Literal['lifetime_live_non_test']]

class PublicMetricsResponseTime(TypedDict, total=False):
    avgMs: Required[float]
    sampleSize: Required[int]
    scope: Required[Literal['recent_instance_window']]

class HealthResponseTimes(TypedDict, total=False):
    windowSize: int
    overall: ResponseTimeStats
    endpoints: Dict[str, ResponseTimeStats]

class HealthUsagePersistence(TypedDict, total=False):
    failures: Required[int]
    lastFailureAt: Required[str]
    pendingReservations: Required[int]

class RotateServerSeedResponseRevealed(TypedDict, total=False):
    serverSeed: Required[str]
    serverHash: Required[str]
    cursor: Required[int]
    nonce: Required[int]

class RotateServerSeedResponseNext(TypedDict, total=False):
    serverHash: Required[str]
    cursor: Required[int]
    nonce: Required[int]
    rotatedAt: Required[int]

Outcome = Union[FloatOutcome, IntOutcome, ShuffleOutcome, PickOutcome, BytesOutcome, DiceOutcome, GaussianOutcome]

PublicOutcome = Union[Outcome, PasswordReceipt]

BatchDrawResponse = BatchResponse

class GetBytesParams(TypedDict, total=False):
    clientSeed: str
    count: int
    encoding: Literal['hex', 'base64']

GetBytesResponse = BytesOutcome

CreateCommitResponse = Commit

class RollDiceParams(TypedDict, total=False):
    clientSeed: str
    notation: Required[str]

RollDiceResponse = DiceOutcome

class GetFloatsParams(TypedDict, total=False):
    clientSeed: str
    count: int

GetFloatsResponse = FloatOutcome

class GaussianParams(TypedDict, total=False):
    clientSeed: str
    count: int
    distribution: Literal['normal', 'exponential', 'poisson']
    mean: float
    stddev: float
    lambda_: float

GaussianResponse = GaussianOutcome

GetHealthResponse = Health

GetPublicMetricsResponse = PublicMetrics

class IncrementCursorParams(TypedDict, total=False):
    clientSeed: str

class IncrementCursorResponse(TypedDict, total=False):
    clientSeed: Required[str]
    cursor: Required[int]
    nonce: Required[int]
    serverHash: Required[str]
    created: Required[int]

class GetIntsParams(TypedDict, total=False):
    clientSeed: str
    count: int
    min: int
    max: int
    toolMeta: str

GetIntsResponse = IntOutcome

class ListOutcomesParams(TypedDict, total=False):
    clientSeed: str
    limit: int
    before: str

ListOutcomesResponse = List[PublicOutcome]

class ListMerkleRootsParams(TypedDict, total=False):
    limit: int

class ListMerkleRootsResponse(TypedDict, total=False):
    roots: List[MerkleRoot]

class GetMerkleRootParams(TypedDict, total=False):
    date: Required[str]

GetMerkleRootResponse = MerkleRoot

class GetMerkleProofParams(TypedDict, total=False):
    date: Required[str]
    outcomeId: Required[str]

GetMerkleProofResponse = MerkleProof

class GetOutcomeParams(TypedDict, total=False):
    clientSeed: str
    cursor: Required[int]
    nonce: Required[int]

GetOutcomeResponse = PublicOutcome

class PickItemParams(TypedDict, total=False):
    clientSeed: str
    items: Required[Union[str, List[str]]]
    weights: Union[str, List[float]]

PickItemResponse = PickOutcome

RevealCommitResponse = RevealOutcome

class RotateServerSeedBody(TypedDict, total=False):
    clientSeed: Required[str]

class RotateServerSeedResponse(TypedDict, total=False):
    clientSeed: Required[str]
    revealed: Required[RotateServerSeedResponseRevealed]
    next: Required[RotateServerSeedResponseNext]

class ShuffleItemsParams(TypedDict, total=False):
    clientSeed: str
    items: Required[Union[str, List[str]]]
    toolMeta: str

ShuffleItemsResponse = ShuffleOutcome

class StreamOutcomesParams(TypedDict, total=False):
    clientSeed: str
    endpoint: Required[Literal['floats', 'ints', 'shuffle', 'pick', 'bytes', 'dice', 'gaussian']]
    intervalMs: int
    lastEventId: str

StreamOutcomesResponse = str

class VerifyServerHashParams(TypedDict, total=False):
    clientSeed: str
    serverHash: Required[str]

VerifyServerHashResponse = Union[Literal[True], VerifyResult]

class VerifyShortIdParams(TypedDict, total=False):
    shortId: Required[str]

class VerifyShortIdResponse(TypedDict, total=False):
    verified: Required[bool]
    reason: Required[str]
    shortId: Required[str]
    clientSeed: str
    serverHash: str
    cursor: int
    nonce: int
    endpoint: str
    outcome: Union[List[Any], Dict[str, Any]]
    count: int
    min: int
    max: int
    notation: str
    toolMeta: Dict[str, Any]
    created: int
    redacted: bool
    permalink: str

class GetOutcomePermalinkParams(TypedDict, total=False):
    id: Required[str]

GetOutcomePermalinkResponse = str

class GetOutcomeOgImageParams(TypedDict, total=False):
    id: Required[str]

GetOutcomeOgImageResponse = bytes

