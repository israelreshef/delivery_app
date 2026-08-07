import os
import json
import hashlib
import logging
from typing import List, Tuple, Dict, Optional

import redis
import requests

from utils.geocode_normalize import normalize_address_key
from utils.circuit_breaker import CircuitBreaker, CircuitBreakerOpen

logger = logging.getLogger(__name__)

VALHALLA_URL = os.getenv("VALHALLA_URL", "http://localhost:8002")
GOOGLE_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY") or os.getenv("GOOGLE_PLACES_API_KEY")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

_redis = redis.from_url(REDIS_URL)
_valhalla_breaker = CircuitBreaker(
    failure_threshold=3,
    timeout=30,
    expected_exception=(requests.RequestException, ValueError, KeyError),
)

# Costing model per vehicle type (Valhalla profile names)
COSTING_MAP = {
    "scooter": "motor_scooter",
    "motorcycle": "motorcycle",
    "bicycle": "bicycle",
    "car": "auto",
    "van": "auto",
    "truck": "truck",
}


def _matrix_cache_key(a_key: str, b_key: str, costing: str) -> str:
    h = hashlib.md5(f"{a_key}|{b_key}|{costing}".encode()).hexdigest()
    return f"matrix:{h}"


def _get_cached_pair(a_key: str, b_key: str, costing: str) -> Optional[Dict]:
    try:
        raw = _redis.get(_matrix_cache_key(a_key, b_key, costing))
        if raw:
            return json.loads(raw)
    except Exception as e:
        logger.warning(f"Redis matrix cache read failed: {e}")
    return None


def _set_cached_pair(a_key: str, b_key: str, costing: str, dist_m: float, dur_s: float, ttl=60 * 60 * 24 * 7):
    try:
        _redis.setex(
            _matrix_cache_key(a_key, b_key, costing),
            ttl,
            json.dumps({"distance": dist_m, "duration": dur_s}),
        )
    except Exception as e:
        logger.warning(f"Redis matrix cache write failed: {e}")


def _valhalla_matrix(points: List[Tuple[float, float]], costing: str) -> Dict:
    """Call Valhalla /sources_to_targets. Raises on failure (breaker sees it)."""
    coords = [{"lat": lat, "lon": lng} for lat, lng in points]
    n = len(coords)
    payload = {
        "sources": coords,
        "targets": coords,
        "costing": costing,
    }
    resp = requests.post(f"{VALHALLA_URL}/sources_to_targets", json=payload, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    if "sources_to_targets" not in data:
        raise ValueError("Valhalla returned no matrix")
    return data["sources_to_targets"]


def _google_matrix(points: List[Tuple[float, float]]) -> Optional[Dict]:
    """Emergency fallback only. Returns matrix in same shape as Valhalla."""
    if not GOOGLE_API_KEY:
        return None
    origins = "|".join(f"{lat},{lng}" for lat, lng in points)
    try:
        resp = requests.get(
            "https://maps.googleapis.com/maps/api/distancematrix/json",
            params={"origins": origins, "destinations": origins, "mode": "driving", "key": GOOGLE_API_KEY},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        if data.get("status") != "OK":
            return None
        rows = data["rows"]
        result = []
        for i, row in enumerate(rows):
            entry = []
            for j, elem in enumerate(row["elements"]):
                if elem["status"] == "OK":
                    entry.append({
                        "from_index": i, "to_index": j,
                        "distance": elem["distance"]["value"],
                        "time": elem["duration"]["value"],
                    })
                else:
                    entry.append({"from_index": i, "to_index": j, "distance": None, "time": None})
            result.append(entry)
        return result
    except Exception as e:
        logger.error(f"Google matrix fallback failed: {e}")
        return None


MAX_MATRIX_PAIRS = 50


def _cluster_by_zones(points, zone_polygons):
    """Assign each point to a zone index using point-in-polygon.
    Falls back to a single cluster (-1) if no zone matches."""
    import shapely.geometry as sg
    clusters = {}
    for idx, (lat, lng) in enumerate(points):
        pt = sg.Point(lng, lat)
        assigned = -1
        for zidx, poly in enumerate(zone_polygons):
            if sg.Polygon(poly).contains(pt):
                assigned = zidx
                break
        clusters.setdefault(assigned, []).append(idx)
    return list(clusters.values())


def _cluster_kmeans(points, k):
    """Simple KMeans (no external dep) on coordinates as a fallback."""
    import random
    centroids = random.sample(points, min(k, len(points)))
    for _ in range(10):
        groups = [[] for _ in range(len(centroids))]
        for idx, p in enumerate(points):
            best = min(range(len(centroids)), key=lambda c: (centroids[c][0]-p[0])**2 + (centroids[c][1]-p[1])**2)
            groups[best].append(idx)
        new_centroids = []
        for g in groups:
            if g:
                new_centroids.append((
                    sum(points[i][0] for i in g)/len(g),
                    sum(points[i][1] for i in g)/len(g),
                ))
            else:
                new_centroids.append(centroids[groups.index(g)])
        centroids = new_centroids
    return groups


def _split_into_clusters(points, zone_polygons=None):
    """Split points into sub-lists of <= MAX_MATRIX_PAIRS using hard zones first."""
    n = len(points)
    if n <= MAX_MATRIX_PAIRS:
        return [list(range(n))]
    if zone_polygons:
        groups = _cluster_by_zones(points, zone_polygons)
    else:
        k = (n // MAX_MATRIX_PAIRS) + 1
        groups = _cluster_kmeans(points, k)
    # Recursively split any oversized group
    result = []
    for g in groups:
        if len(g) > MAX_MATRIX_PAIRS:
            sub_points = [points[i] for i in g]
            for sub in _split_into_clusters(sub_points):
                result.append([g[i] for i in sub])
        else:
            result.append(g)
    return result


def fetch_distance_matrix_clustered(
    points: List[Tuple[float, float]],
    costing: str = "auto",
    address_keys: Optional[List[str]] = None,
    zone_polygons: Optional[List[List[Tuple[float, float]]]] = None,
) -> Dict:
    """Fetch matrix for >50 points by clustering (zones first, then kmeans)."""
    n = len(points)
    if n <= MAX_MATRIX_PAIRS:
        return fetch_distance_matrix(points, costing, address_keys)

    clusters = _split_into_clusters(points, zone_polygons)
    merged = [[{"from_index": i, "to_index": j, "distance": None, "time": None} for j in range(n)] for i in range(n)]
    for cluster in clusters:
        sub_points = [points[i] for i in cluster]
        sub_keys = [address_keys[i] for i in cluster] if address_keys else None
        sub_matrix = fetch_distance_matrix(sub_points, costing, sub_keys)
        # Map sub-matrix indices back to global indices
        for a, ia in enumerate(cluster):
            for b, ib in enumerate(cluster):
                merged[ia][ib] = sub_matrix[a][b]
    return merged


def fetch_distance_matrix(
    points: List[Tuple[float, float]],
    costing: str = "auto",
    address_keys: Optional[List[str]] = None,
    zone_polygons: Optional[List[List[Tuple[float, float]]]] = None,
) -> Dict:
    """Fetch NxN distance/duration matrix.

    Uses Redis pair-cache for repeated pairs, Valhalla as primary engine,
    Google as emergency fallback when the circuit breaker is OPEN.

    If more than MAX_MATRIX_PAIRS (50) points, automatically splits into
    clusters (hard zones first, then kmeans) to stay within Valhalla limits.

    Returns Valhalla-shaped sources_to_targets list-of-lists.
    """
    n = len(points)
    if n == 0:
        return []

    if n > MAX_MATRIX_PAIRS:
        return fetch_distance_matrix_clustered(points, costing, address_keys, zone_polygons)

    # address_keys lets us cache by semantic address, not raw coordinates.
    keys = address_keys or [f"{lat:.5f},{lng:.5f}" for lat, lng in points]

    # Pre-fill from cache
    cached = [[None] * n for _ in range(n)]
    missing = []
    for i in range(n):
        for j in range(n):
            if i == j:
                cached[i][j] = {"from_index": i, "to_index": j, "distance": 0.0, "time": 0.0}
                continue
            pair = _get_cached_pair(keys[i], keys[j], costing)
            if pair:
                cached[i][j] = {"from_index": i, "to_index": j, **pair}
            else:
                missing.append((i, j))

    if not missing:
        return cached

    # Build sub-matrix request only for missing pairs (full NxN for simplicity now)
    try:
        matrix = _valhalla_breaker.call(_valhalla_matrix, points, costing)
        # Cache every returned pair
        for row in matrix:
            for cell in row:
                i, j = cell["from_index"], cell["to_index"]
                if cell.get("distance") is not None:
                    _set_cached_pair(keys[i], keys[j], costing, cell["distance"], cell["time"])
                cached[i][j] = cell
        return cached
    except CircuitBreakerOpen:
        logger.warning("Valhalla circuit OPEN - using Google fallback")
    except Exception as e:
        logger.error(f"Valhalla matrix failed ({e}); trying Google")

    # Emergency fallback
    google = _google_matrix(points)
    if google:
        for row in google:
            for cell in row:
                i, j = cell["from_index"], cell["to_index"]
                if cell.get("distance") is not None:
                    _set_cached_pair(keys[i], keys[j], costing, cell["distance"], cell["time"])
                cached[i][j] = cell
    return cached
