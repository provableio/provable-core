#!/usr/bin/env python3
"""Generate TypedDict response models from the canonical OpenAPI document."""

from __future__ import annotations

import json
import keyword
import re
from pathlib import Path
from typing import Any

SPEC = Path(__file__).resolve().parent.parent / "openapi.json"
OUTPUT = Path(__file__).parent / "src" / "provableio" / "models.py"
OPERATIONS_OUTPUT = Path(__file__).parent / "src" / "provableio" / "operations.py"
METHOD_OVERRIDES = {
    "batchDraw": "batch",
    "pickItem": "pick",
    "shuffleItems": "shuffle",
}
INLINE_TYPES: dict[str, dict[str, Any]] = {}


def safe_name(name: str) -> str:
    name = re.sub(r"\W", "_", name)
    return name + "_" if keyword.iskeyword(name) else name


def class_name(name: str) -> str:
    return name[:1].upper() + name[1:]


def snake_name(name: str) -> str:
    return re.sub(r"(?<!^)(?=[A-Z])", "_", name).lower()


def py_type(schema: dict[str, Any], hint: str = "InlineObject") -> str:
    if "$ref" in schema:
        return schema["$ref"].rsplit("/", 1)[-1]
    if "enum" in schema:
        return "Literal[" + ", ".join(repr(v) for v in schema["enum"]) + "]"
    variants = schema.get("oneOf") or schema.get("anyOf")
    if variants:
        return "Union[" + ", ".join(
            py_type(variant, f"{hint}Variant{index}")
            for index, variant in enumerate(variants, 1)
        ) + "]"
    kind = schema.get("type")
    if kind == "array":
        return f"List[{py_type(schema.get('items', {}), hint + 'Item')}]"
    if kind == "object":
        if schema.get("properties") or schema.get("allOf"):
            INLINE_TYPES.setdefault(hint, schema)
            return hint
        additional = schema.get("additionalProperties")
        return f"Dict[str, {py_type(additional, hint + 'Value')}]" if isinstance(additional, dict) else "Dict[str, Any]"
    return {"string": "str", "integer": "int", "number": "float", "boolean": "bool"}.get(kind, "Any")

def object_shape(schema: dict[str, Any]) -> tuple[list[str], dict[str, Any], set[str]]:
    bases: list[str] = []
    properties: dict[str, Any] = {}
    required: set[str] = set()
    parts = schema.get("allOf", [schema])
    for part in parts:
        if "$ref" in part:
            bases.append(part["$ref"].rsplit("/", 1)[-1])
        else:
            properties.update(part.get("properties", {}))
            required.update(part.get("required", []))
    return bases, properties, required


def referenced_types(schema: Any) -> set[str]:
    if isinstance(schema, list):
        return set().union(*(referenced_types(item) for item in schema), set())
    if not isinstance(schema, dict):
        return set()
    refs = {
        value.rsplit("/", 1)[-1]
        for key, value in schema.items()
        if key == "$ref" and isinstance(value, str)
    }
    return refs | set().union(*(referenced_types(value) for value in schema.values()), set())


def main() -> None:
    INLINE_TYPES.clear()
    spec = json.loads(SPEC.read_text())
    lines = [
        '"""Generated from public/openapi.json. Do not edit by hand."""',
        "from __future__ import annotations",
        "from typing import Any, Dict, List, Literal, TypedDict, Union",
        "",
    ]
    aliases = []
    for name, schema in spec["components"]["schemas"].items():
        bases, properties, required = object_shape(schema)
        if not properties and not bases:
            aliases.append((name, schema))
            continue
        parent = bases[0] if bases else "TypedDict"
        lines += [f"class {name}({parent}, total=False):"]
        if not properties:
            lines.append("    pass")
        for prop, prop_schema in properties.items():
            annotation = py_type(prop_schema, f"{name}{class_name(safe_name(prop))}")
            if prop in required:
                annotation = f"Required[{annotation}]"
            lines.append(f"    {safe_name(prop)}: {annotation}")
        lines.append("")
    inline_insert_at = len(lines)
    pending_aliases = dict(aliases)
    while pending_aliases:
        ready = [
            name
            for name, schema in pending_aliases.items()
            if not (referenced_types(schema) & pending_aliases.keys())
        ]
        if not ready:
            names = ", ".join(pending_aliases)
            raise ValueError(f"Cyclic generated type aliases: {names}")
        for name in ready:
            schema = pending_aliases.pop(name)
            lines += [f"{name} = {py_type(schema, name)}", ""]

    operation_methods = {}
    operation_descriptors = {}
    for path, path_item in spec["paths"].items():
        for method in ("get", "post", "put", "patch", "delete"):
            operation = path_item.get(method)
            if not operation:
                continue
            operation_id = operation["operationId"]
            operation_methods[operation_id] = METHOD_OVERRIDES.get(operation_id, snake_name(operation_id))
            parameters = []
            query_names = []
            path_names = []
            for parameter in operation.get("parameters", []):
                if "$ref" in parameter:
                    target = spec
                    for part in parameter["$ref"][2:].split("/"):
                        target = target[part]
                    parameter = target
                if parameter["in"] in ("query", "path"):
                    parameters.append(parameter)
                if parameter["in"] == "query":
                    query_names.append(parameter["name"])
                elif parameter["in"] == "path":
                    path_names.append(parameter["name"])
            operation_descriptors[operation_id] = {
                "method": method.upper(),
                "path": path,
                "query": tuple(query_names),
                "query_aliases": {
                    safe_name(name): name
                    for name in query_names
                    if safe_name(name) != name
                },
                "path_params": tuple(path_names),
                "has_body": bool(operation.get("requestBody")),
            }
            if parameters:
                lines += [f"class {class_name(operation_id)}Params(TypedDict, total=False):"]
                for parameter in parameters:
                    annotation = py_type(
                        parameter.get("schema", {}),
                        f"{class_name(operation_id)}Params{class_name(safe_name(parameter['name']))}",
                    )
                    if parameter.get("required"):
                        annotation = f"Required[{annotation}]"
                    lines.append(f"    {safe_name(parameter['name'])}: {annotation}")
                lines.append("")

            raw_body = operation.get("requestBody")
            if raw_body:
                if "$ref" in raw_body:
                    target = spec
                    for part in raw_body["$ref"][2:].split("/"):
                        target = target[part]
                    raw_body = target
                body_schema = raw_body.get("content", {}).get("application/json", {}).get("schema")
                if body_schema and "$ref" not in body_schema:
                    body_name = f"{class_name(operation_id)}Body"
                    bases, properties, required = object_shape(body_schema)
                    parent = bases[0] if bases else "TypedDict"
                    lines += [f"class {body_name}({parent}, total=False):"]
                    if not properties:
                        lines.append("    pass")
                    for prop, prop_schema in properties.items():
                        annotation = py_type(prop_schema, f"{body_name}{class_name(safe_name(prop))}")
                        if prop in required:
                            annotation = f"Required[{annotation}]"
                        lines.append(f"    {safe_name(prop)}: {annotation}")
                    lines.append("")

            response_schema = None
            response_content_type = None
            for status, raw_response in operation["responses"].items():
                if not str(status).startswith("2"):
                    continue
                if "$ref" in raw_response:
                    target = spec
                    for part in raw_response["$ref"][2:].split("/"):
                        target = target[part]
                    raw_response = target
                for content_type, content in raw_response.get("content", {}).items():
                    response_schema = content.get("schema", {})
                    response_content_type = content_type
                    break
                if response_schema is not None:
                    break
            response_name = f"{class_name(operation_id)}Response"
            if response_content_type in ("image/png", "image/jpeg"):
                lines += [f"{response_name} = bytes", ""]
            elif response_schema is not None and "$ref" in response_schema:
                lines += [f"{response_name} = {py_type(response_schema, response_name)}", ""]
            elif response_schema is not None:
                bases, properties, required = object_shape(response_schema)
                if properties or bases:
                    parent = bases[0] if bases else "TypedDict"
                    lines += [f"class {response_name}({parent}, total=False):"]
                    for prop, prop_schema in properties.items():
                        annotation = py_type(prop_schema, f"{response_name}{class_name(safe_name(prop))}")
                        if prop in required:
                            annotation = f"Required[{annotation}]"
                        lines.append(f"    {safe_name(prop)}: {annotation}")
                    lines.append("")
                else:
                    lines += [f"{response_name} = {py_type(response_schema, response_name)}", ""]
    inline_lines = []
    emitted = set()
    while True:
        pending = [(name, schema) for name, schema in INLINE_TYPES.items() if name not in emitted]
        if not pending:
            break
        for name, schema in pending:
            emitted.add(name)
            bases, properties, required = object_shape(schema)
            parent = bases[0] if bases else "TypedDict"
            inline_lines += [f"class {name}({parent}, total=False):"]
            if not properties:
                inline_lines.append("    pass")
            for prop, prop_schema in properties.items():
                annotation = py_type(prop_schema, f"{name}{class_name(safe_name(prop))}")
                if prop in required:
                    annotation = f"Required[{annotation}]"
                inline_lines.append(f"    {safe_name(prop)}: {annotation}")
            inline_lines.append("")
    lines[inline_insert_at:inline_insert_at] = inline_lines
    text = "\n".join(lines)
    text = text.replace(
        "from typing import Any, Dict, List, Literal, TypedDict, Union",
        "from typing import Any, Dict, List, Literal, TypedDict, Union\n"
        "try:\n    from typing import Required\nexcept ImportError:\n    from typing_extensions import Required",
    )
    OUTPUT.write_text(text + "\n")
    OPERATIONS_OUTPUT.write_text(
        '"""Generated operation-to-method map. Do not edit by hand."""\n\n'
        f"OPERATION_METHODS = {operation_methods!r}\n\n"
        f"OPERATIONS = {operation_descriptors!r}\n"
    )


if __name__ == "__main__":
    main()
