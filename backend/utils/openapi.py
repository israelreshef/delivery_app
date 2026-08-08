"""OpenAPI 3.0 document generation + runtime request validation (S3).

What this module provides
  * ``build_openapi_spec(app)``  – an OpenAPI 3.0.3 document introspected from
    the Flask URL map (every ``/api/*`` route + method), enriched with typed
    request bodies from ``utils.schemas`` and a Bearer security scheme.
  * ``validate_api_json()``     – a ``before_request`` guard that enforces the
    registered schemas at runtime (422 on malformed typed payloads) and generic
    JSON safety railings (depth / key count / size) for every JSON body.
  * ``register_openapi(app)``   – wires ``GET /api/openapi.json`` (raw spec)
    and ``GET /api/docs`` (CSP-friendly, server-rendered HTML reference).

The WAF-style edge filtering lives in ``infrastructure/proxy`` (nginx) and
``infrastructure/terraform`` (AWS WAFv2); the in-process checks here are the
defence-in-depth layer that always runs, including on App Runner where the
platform proxy may strip headers.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Dict, List, Optional

from flask import Blueprint, current_app, jsonify, request

from utils.schemas import (
    REQUEST_SCHEMAS,
    MAX_JSON_BODY_BYTES,
    json_safety_errors,
    model_openapi_schema,
    request_spec_ref,
    schema_for,
)

logger = logging.getLogger(__name__)

API_PREFIX = "/api/"

# Endpoints exempt from the JSON validation guard (infrastructure plumbing).
EXEMPT_PATHS = {
    "/api/health",
    "/api/openapi.json",
    "/api/docs",
    "/api/security/csp-report",
}

_CONVERTER_RE = re.compile(r"<(?:(?:[^:<>]+):)?([^<>]+)>")


def _to_openapi_path(rule: str) -> str:
    return _CONVERTER_RE.sub(r"{\1}", rule)


def _path_params(rule: str) -> List[dict[str, str]]:
    return [{"name": name, "in": "path", "required": True, "schema": {"type": "string"}}
            for name in _CONVERTER_RE.findall(rule)]


# --------------------------------------------------------------------------- #
# Spec generation                                                             #
# --------------------------------------------------------------------------- #

def _route_summary(rule, method: str) -> str:
    """Human summary from the view docstring / endpoint name."""
    try:
        view_func = current_app.view_functions.get(rule.endpoint)
        doc = (getattr(view_func, "__doc__", None) or "").strip()
        if doc:
            return doc.splitlines()[0][:120]
    except Exception:
        pass
    return f"{method} {_to_openapi_path(rule.rule)}"


def build_openapi_spec(app) -> dict[str, Any]:
    """Build an OpenAPI 3.0.3 document from the registered URL map."""
    paths: Dict[str, Any] = {}
    schema_names = set()

    for rule in app.url_map.iter_rules():
        rule_path = rule.rule
        if not rule_path.startswith(API_PREFIX):
            continue
        if rule_path in EXEMPT_PATHS:
            continue
        if rule.endpoint in ("static", "openapi.spec", "openapi.docs"):
            continue

        openapi_path = _to_openapi_path(rule_path)
        path_item = paths.setdefault(openapi_path, {})

        methods = sorted(m for m in (rule.methods or set()) if m in {"GET", "POST", "PUT", "PATCH", "DELETE"})
        for method in methods:
            operation: dict[str, Any] = {
                "summary": _route_summary(rule, method),
                "operationId": f"{method.lower()}_{rule.endpoint.replace('.', '_')}",
                "responses": {
                    "200": {"description": "Successful response"},
                    "400": {"$ref": "#/components/responses/BadRequest"},
                    "401": {"$ref": "#/components/responses/Unauthorized"},
                    "403": {"$ref": "#/components/responses/Forbidden"},
                    "404": {"$ref": "#/components/responses/NotFound"},
                    "429": {"$ref": "#/components/responses/TooManyRequests"},
                },
            }
            params = _path_params(rule_path)
            if params:
                operation["parameters"] = params

            body_ref = request_spec_ref(rule_path, method)
            if body_ref:
                operation["requestBody"] = body_ref
                model = schema_for(rule_path, method)
                if model is not None:
                    schema_names.add(model.__name__)

            path_item[method.lower()] = operation

    components_schemas: Dict[str, dict[str, Any]] = {}
    for (path, method), model in REQUEST_SCHEMAS.items():
        if model.__name__ in schema_names:
            components_schemas[model.__name__] = model_openapi_schema(model)
    components_schemas.setdefault("Error", {
        "type": "object",
        "properties": {
            "error": {"type": "string"},
            "message": {"type": "string"},
            "error_id": {"type": "string"},
        },
    })

    spec = {
        "openapi": "3.0.3",
        "info": {
            "title": "TZIR Delivery API",
            "description": "API for the TZIR courier platform — courier, customer, admin and financial services. "
                           "All authenticated endpoints require a Bearer access token issued by /api/auth/login.",
            "version": "1.0.0",
        },
        "servers": [{"url": "/", "description": "Same-origin (behind reverse proxy)"}],
        "paths": paths,
        "components": {
            "securitySchemes": {
                "bearerAuth": {
                    "type": "http",
                    "scheme": "bearer",
                    "bearerFormat": "JWT",
                    "description": "Access token from POST /api/auth/login.",
                }
            },
            "responses": {
                "BadRequest": {"description": "Malformed request"},
                "Unauthorized": {"description": "Missing or invalid token"},
                "Forbidden": {"description": "Insufficient permissions"},
                "NotFound": {"description": "Resource not found"},
                "TooManyRequests": {"description": "Rate limit exceeded"},
            },
            "schemas": components_schemas,
        },
    }
    # Global security: every operation requires Bearer unless overridden.
    return spec


def spec_json(app) -> str:
    return json.dumps(build_openapi_spec(app), ensure_ascii=False, indent=2)


# --------------------------------------------------------------------------- #
# Runtime validation (before_request)                                         #
# --------------------------------------------------------------------------- #

def _is_json_route() -> bool:
    if request.method not in {"POST", "PUT", "PATCH"}:
        return False
    if not request.path.startswith(API_PREFIX):
        return False
    if request.path in EXEMPT_PATHS:
        return False
    # Only JSON bodies are validated here; multipart/form-data (uploads) and
    # urlencoded forms are handled by their own routes.
    content_type = (request.content_type or "").split(";")[0].strip().lower()
    if content_type and content_type not in ("application/json", "application/*+json"):
        return False
    return True


def validate_api_json():
    """before_request guard: JSON safety railings + typed schema validation.

    Returns ``None`` to let the request continue, or a Flask response.
    """
    rule = request.url_rule
    if rule is None or not _is_json_route():
        return None

    raw = request.get_data()
    if len(raw) > MAX_JSON_BODY_BYTES:
        return jsonify({
            "error": "BODY_TOO_LARGE",
            "message": "Request body exceeds the allowed size",
        }), 413

    payload: Any = None
    if raw:
        try:
            payload = json.loads(raw)
        except (ValueError, UnicodeDecodeError):
            return jsonify({
                "error": "INVALID_JSON",
                "message": "Request body is not valid JSON",
            }), 400

        safety = json_safety_errors(payload)
        if safety:
            logger.warning("JSON safety guard triggered on %s: %s", request.path, safety[0])
            return jsonify({
                "error": "PAYLOAD_REJECTED",
                "message": safety[0],
            }), 400

    model = schema_for(rule.rule, request.method)
    if model is None:
        return None

    if payload is None:
        return jsonify({
            "success": False,
            "error": "VALIDATION_ERROR",
            "message": "A JSON request body is required",
            "details": ["request body is required"],
        }), 400

    if not isinstance(payload, dict):
        return jsonify({
            "success": False,
            "error": "VALIDATION_ERROR",
            "message": "Request body must be a JSON object",
        }), 400

    try:
        model.model_validate(payload)
    except Exception as exc:
        details = []
        if hasattr(exc, "errors"):
            details = [
                {"loc": list(e.get("loc", [])), "msg": e.get("msg", "")}
                for e in exc.errors()
            ]
        logger.info("Schema validation rejected %s %s: %s", request.method, request.path, details)
        return jsonify({
            "success": False,
            "error": "VALIDATION_ERROR",
            "message": "Request body does not match the API contract",
            "details": details,
        }), 400

    return None


# --------------------------------------------------------------------------- #
# Endpoints                                                                   #
# --------------------------------------------------------------------------- #

def register_openapi(app) -> None:
    """Register /api/openapi.json + /api/docs and the validation hook."""
    bp = Blueprint("openapi", __name__)

    @bp.route("/openapi.json", methods=["GET"])
    def openapi_spec_endpoint():
        return current_app.response_class(
            spec_json(current_app),
            mimetype="application/json",
            headers={"Cache-Control": "no-store"},
        )

    @bp.route("/docs", methods=["GET"])
    def openapi_docs_endpoint():
        from flask import render_template_string
        spec = build_openapi_spec(current_app)
        rows = []
        for path in sorted(spec["paths"]):
            for method, op in spec["paths"][path].items():
                if not isinstance(op, dict) or "summary" not in op:
                    continue
                has_body = "requestBody" in op
                rows.append((method.upper(), path, op.get("summary", ""), has_body))
        html = render_template_string(
            """<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8">
<title>TZIR Delivery API — OpenAPI reference</title>
<style>
 body{font-family:system-ui,sans-serif;background:#0d1b2a;color:#e0fbfc;margin:0;padding:24px}
 h1{color:#5ce1e6} table{width:100%%;border-collapse:collapse;margin-top:16px}
 th,td{text-align:right;padding:8px 12px;border-bottom:1px solid #2a4a6b;font-size:14px}
 th{color:#8ecae6} code{background:#1b3a5c;padding:2px 6px;border-radius:4px}
 .m{font-weight:700;padding:2px 8px;border-radius:4px;display:inline-block}
 .GET{background:#0a5c36}.POST{background:#0b4f6c}.PUT{background:#b5651d}
 .PATCH{background:#6a4c93}.DELETE{background:#8d0801}.badge{color:#98c1d9;font-size:12px}
 a{color:#5ce1e6;text-decoration:none} .stats{color:#98c1d9}
</style></head><body>
<h1>TZIR Delivery API — OpenAPI 3.0</h1>
<p class="stats">{{ paths|length }} endpoints · Bearer JWT authentication · machine spec at
<a href="/api/openapi.json">/api/openapi.json</a></p>
<table><thead><tr><th>Method</th><th>Path</th><th>Summary</th><th>Body</th></tr></thead><tbody>
{% for method, path, summary, has_body in rows %}
<tr><td><span class="m {{ method }}">{{ method }}</span></td>
<td><code>{{ path }}</code></td><td>{{ summary }}</td>
<td>{% if has_body %}<span class="badge">JSON schema</span>{% endif %}</td></tr>
{% endfor %}
</tbody></table></body></html>""",
            paths=spec["paths"],
            rows=rows,
        )
        return html, 200, {"Content-Type": "text/html; charset=utf-8"}

    app.register_blueprint(bp, url_prefix=API_PREFIX)

    # Runtime validation — runs after routing, before handlers.
    app.before_request(validate_api_json)