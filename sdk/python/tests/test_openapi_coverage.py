import json
from pathlib import Path
from typing import get_args, get_origin, get_type_hints

try:
    from typing import Required
except ImportError:
    from typing_extensions import Required

from provableio import ProvableClient
from provableio.models import (
    BatchResponse,
    GetOutcomeParams,
    PasswordReceipt,
    PublicOutcome,
    RevealRequest,
    StreamOutcomesParams,
)
from provableio.operations import OPERATIONS, OPERATION_METHODS


SPEC = Path(__file__).resolve().parents[2] / "openapi.json"


def required_fields(model):
    hints = get_type_hints(model, include_extras=True)
    return {name for name, hint in hints.items() if get_origin(hint) is Required}


def test_every_openapi_operation_has_a_public_client_method():
    document = json.loads(SPEC.read_text())
    operation_ids = {
        operation["operationId"]
        for path_item in document["paths"].values()
        for operation in path_item.values()
        if isinstance(operation, dict) and "operationId" in operation
    }
    assert set(OPERATION_METHODS) == operation_ids
    assert all(hasattr(ProvableClient, method) for method in OPERATION_METHODS.values())


def test_generated_dispatch_contract_matches_openapi():
    document = json.loads(SPEC.read_text())
    expected = {}
    for path, path_item in document["paths"].items():
        for method, operation in path_item.items():
            if not isinstance(operation, dict) or "operationId" not in operation:
                continue
            parameters = []
            for parameter in operation.get("parameters", []):
                if "$ref" in parameter:
                    parameter = document["components"]["parameters"][parameter["$ref"].rsplit("/", 1)[-1]]
                parameters.append(parameter)
            expected[operation["operationId"]] = {
                "method": method.upper(),
                "path": path,
                "query": tuple(p["name"] for p in parameters if p["in"] == "query"),
                "query_aliases": {
                    p["name"] + "_": p["name"]
                    for p in parameters
                    if p["in"] == "query" and p["name"] in {"False", "None", "True", "and", "as", "assert", "async", "await", "break", "class", "continue", "def", "del", "elif", "else", "except", "finally", "for", "from", "global", "if", "import", "in", "is", "lambda", "nonlocal", "not", "or", "pass", "raise", "return", "try", "while", "with", "yield"}
                },
                "path_params": tuple(p["name"] for p in parameters if p["in"] == "path"),
                "has_body": "requestBody" in operation,
            }
    assert OPERATIONS == expected


def test_required_inputs_are_preserved_in_generated_types():
    assert required_fields(GetOutcomeParams) == {"cursor", "nonce"}
    assert {"commitId", "clientSeed", "endpoint"} <= required_fields(RevealRequest)
    assert required_fields(StreamOutcomesParams) == {"endpoint"}


def test_inline_batch_variants_are_discriminated_typed_dicts():
    results_hint = get_type_hints(BatchResponse, include_extras=True)["results"]
    results_list = get_args(results_hint)[0]
    result_union = get_args(results_list)[0]
    success, failure = get_args(result_union)
    assert required_fields(success) == {"ok", "outcome"}
    assert required_fields(failure) == {"ok", "error"}
    success_literal = get_args(get_type_hints(success, include_extras=True)["ok"])[0]
    failure_literal = get_args(get_type_hints(failure, include_extras=True)["ok"])[0]
    assert get_args(success_literal) == (True,)
    assert get_args(failure_literal) == (False,)


def test_alias_dependencies_are_emitted_in_runtime_safe_order():
    assert PasswordReceipt in get_args(PublicOutcome)