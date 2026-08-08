"""BOLA/IDOR inventory generator.

Scans all route blueprints and reports, per endpoint with a path parameter
(<int:id> / <string:...>), whether an ownership check can be proven from the
view body. Outputs a markdown matrix to stdout (or a file) that feeds the
BOLA sweep test list.

Usage:
    python scripts/bola_inventory.py [--output docs/bola_inventory.md]
"""

import argparse
import ast
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "routes"))
sys.path.insert(0, str(ROOT))

# Ownership indicator snippets -> weight.
# These prove the endpoint filters by the authenticated user before serving.
OWNERSHIP_MARKERS = [
    # query filtered by current user / their linked records
    ".query.filter_by(",
    "filter_by(",
    ".filter(",
    "current_user.id",
    "current_user.courier.id",
    "current_user.user_id",
    "courier_id == courier",
    "courier_id=current_user",
    "user_id=current_user",
    "user_id == current_user",
    "get_jwt_identity",
]
# Role guards that delegate authorization entirely to a role check.
ROLE_GUARD_MARKERS = [
    "role_required",
    "permission_required",
    "@admin_required",
    "admin_required",
]
ANON_PATHS = ["/api/health", "/api/security/csp-report"]


def iter_routes():
    for py in sorted(ROOT.glob("routes/*.py")):
        if py.name.startswith("__"):
            continue
        text = py.read_text(encoding="utf-8")
        tree = ast.parse(text)

        # blueprint variable name
        blueprints = [
            n.targets[0].id
            for n in ast.walk(tree)
            if isinstance(n, ast.Assign)
            and isinstance(n.targets[0], ast.Name)
            and "bp" in n.targets[0].id.lower()
            and isinstance(n.value, ast.Call)
            and getattr(n.value.func, "id", "") == "Blueprint"
        ]
        blueprint = blueprints[0] if blueprints else py.stem

        for node in ast.walk(tree):
            if not isinstance(node, ast.FunctionDef):
                continue
            decorators = [
                ast.unparse(d).replace(" ", "")
                for d in node.decorator_list
            ]
            route_str = next(
                (d for d in decorators if re.search(r"route\(", d)), None
            )
            if not route_str:
                continue
            # extract path literal
            m = re.search(r"route\(['\"]([^'\"]+)['\"]", route_str)
            if not m:
                continue
            path = m.group(1)
            methods = re.search(r"methods=\[([^\]]*)\]", route_str)
            methods_str = methods.group(1) if methods else "ALL"
            body = ast.get_source_segment(text, node) or ""
            yield {
                "file": py.name,
                "blueprint": blueprint,
                "path": path,
                "methods": methods_str,
                "name": node.name,
                "decorators": decorators,
                "body": body.lower(),
            }


def classify(route):
    path = route["path"]
    has_param = bool(re.search(r"<[^>]+>", path))
    decorators = route["decorators"]
    decorator_text = " ".join(decorators).lower()
    body = route.get("body", "")

    is_role_guarded = any(
        m.lower() in decorator_text for m in ROLE_GUARD_MARKERS
    )
    has_owner_markers = any(
        m.lower() in (decorator_text + body) for m in OWNERSHIP_MARKERS
    )
    has_jwt = any(t in decorators for t in ["token_required", "jwt_required"])

    if path == "/api/health":
        return "ANON"
    if not has_jwt:
        return "UNAUTHED" if has_param else "OK(public)"
    if is_role_guarded:
        return "ROLE"
    if has_owner_markers:
        return "OWNED"
    return "REVIEW"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default=None)
    args = parser.parse_args()

    lines = [
        "# BOLA/IDOR Endpoint Inventory (auto-generated)",
        "",
        "| File | Route | Methods | Params | Verdict |",
        "|---|---|---|---|---|",
    ]
    verdicts = {}
    for route in iter_routes():
        verdict = classify(route)
        verdicts[verdict] = verdicts.get(verdict, 0) + 1
        if verdict == "REVIEW" or verdict == "POSSIBLE":
            has_param = bool(re.search(r"<[^>]+>", route["path"]))
            row = f"| {route['file']} | {route['path']} | {route['methods']} | {'yes' if has_param else 'no'} | {verdict} |"
            lines.append(row)

    lines.append("")
    lines.append("## Verdict Summary")
    lines.append("")
    lines.append("| Verdict | Count |")
    lines.append("|---|---|")
    for v in sorted(verdicts):
        lines.append(f"| {v} | {verdicts[v]} |")

    out = "\n".join(lines)
    if args.output:
        Path(args.output).write_text(out, encoding="utf-8")
        print(f"Written: {args.output}")
    else:
        print(out)


if __name__ == "__main__":
    main()