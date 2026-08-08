"""In-process WAF engine (S3: WAF layer — defence-in-depth).

The deployment WAF (``infrastructure/proxy`` nginx rules, ``infrastructure/terraform``
AWS WAFv2 WebACL) filters traffic at the edge. This engine applies the *same*
class of rules inside the application so that behaviour is consistent even
when the app is served without an edge proxy (local dev / App Runner without
a web ACL attached). It is opinionated and opt-in:
``SECURITY_WAF_ENABLED`` must be true (default in production).

Only *obvious* attack artifacts trigger a block — field values that look
like SQL/HTML payloads. Values for sensitive fields (password / tokens /
secrets) are never scanned to avoid false positives on legitimate data.
"""

from __future__ import annotations

import logging
import re
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# --------------------------------------------------------------------------- #
# Rule catalogue — (rule id, description, regex)                              #
# --------------------------------------------------------------------------- #

RULES: List[Tuple[str, str, str]] = [
    # --- SQL injection -------------------------------------------------------
    ("SQLI-UNION-SELECT", "Classic union-based SQL injection",
     r"union\s+(?:all\s+|distinct\s+)?select\b"),
    ("SQLI-SELECT-FROM", "Trailing select-from pattern",
     r"\bselect\b[^\n;]{0,80}\bfrom\b"),
    ("SQLI-INTO", "Insert / replace into table",
     r"\b(insert|replace)\s+into\b"),
    ("SQLI-DROP", "DROP table / database",
     r"\bdrop\s+(table|database)\b"),
    ("SQLI-EQ", "OR/AND <n>=<n> boolean injection",
     r"\b(or|and)\s+\d+\s*[=<>]\s*\d+"),
    ("SQLI-CMDSHELL", "xp_cmdshell",
     r"\bxp_cmdshell\b"),
    ("SQLI-COMMENT", "In-line SQL comment marker",
     r"/\*.*\*/|\b--\s*$|%2b\b"),
    ("SQLI-SLEEP", "Time-based blind injection helper",
     r"\bsleep\s*\(|benchmark\s*\("),
    # --- Cross-site scripting ------------------------------------------------
    ("XSS-SCRIPT", "HTML script tag",
     r"<script[\s>/]|</script\s*>|<script\s*&gt;"),
    ("XSS-JSURI", "javascript: scheme",
     r"javascript\s*:"),
    ("XSS-EVENT", "Inline event handlers",
     r"\bon\w+\s*=\s*['\"]{0,1}\s*(alert|eval|document|location|window|fetch)"),
    ("SSRF-BODY", "URL with customer-controlled scheme",
     r"https?://\S+@\S+|gopher://|file://"),
    # --- Path traversal ------------------------------------------------------
    ("TRAV-FILE", "Filesystem traversal",
     r"\.\./|\.\.\\|%2e%2e|/etc/passwd|/proc/self|windows[\\/]system"),
    # --- Misc anomalies ------------------------------------------------------
    ("ANOM-NULLBYTE", "Null byte",
     r"\x00"),
]

# Fields whose values must never be scanned for pattern triggers.
_SENSITIVE_FIELDS = {"password", "secret", "token", "refresh_token",
                     "mfa_token", "access_token", "code", "auth"}


def _sensitive(key: str) -> bool:
    key = (key or "").lower()
    return any(fragment in key for fragment in _SENSITIVE_FIELDS)


def _collapse(items: Any) -> List[Tuple[str, str]]:
    """Walk a JSON-ish structure and yield (key, flattened str value)."""
    out: List[Tuple[str, str]] = []

    def walk(node: Any, key: str = "") -> None:
        if isinstance(node, dict):
            for k, v in node.items():
                walk(v, k)
        elif isinstance(node, list):
            for item in node:
                walk(item, key)
        else:
            out.append((key, str(node)))

    walk(items)
    return out


def scan_value(rule_id: str, pattern: str, value: str) -> bool:
    try:
        return re.search(pattern, value, flags=re.IGNORECASE) is not None
    except re.error:
        logger.warning("WAF rule %s has an invalid pattern", rule_id)
        return False


def scan_uri(uri: str) -> List[str]:
    from urllib.parse import unquote, unquote_plus
    # Attackers URL-encode payloads to bypass filters; the path is decoded with
    # unquote, while the query string uses unquote_plus ('+' == space in forms).
    path, sep, query = uri.partition("?")
    decoded = unquote(path) + sep + unquote_plus(query)
    hits: List[str] = []
    for rule_id, _, pattern in RULES:
        if scan_value(rule_id, pattern, decoded):
            hits.append(rule_id)
    return hits


def scan_body(payload: Any) -> List[str]:
    hits: List[str] = []
    for key, value in _collapse(payload):
        if _sensitive(key):
            continue
        for rule_id, _, pattern in RULES:
            if rule_id.startswith(("SQLI", "XSS", "TRAV")) and scan_value(rule_id, pattern, value):
                hits.append(rule_id)
                break
    return hits


def scan_headers(headers: Dict[str, str]) -> List[str]:
    hits: List[str] = []
    for header_name in ("User-Agent", "Referer", "X-Forwarded-For"):
        value = (headers.get(header_name) or "")
        for rule_id, _, pattern in RULES:
            if rule_id == "XSS-JSURI" and scan_value(rule_id, pattern, value):
                hits.append(rule_id)
    return hits


def waf_enabled() -> bool:
    from flask import current_app
    return bool(current_app.config.get("SECURITY_WAF_ENABLED", False))


def inspect_request(uri: str, body: Optional[Any], headers: Dict[str, str]) -> List[str]:
    """Return the set of WAF rule ids triggered; empty when clean."""
    if not waf_enabled():
        return []
    hits = scan_uri(uri or "")
    if body is not None:
        hits += scan_body(body)
    hits += scan_headers(headers)
    return sorted(set(hits))