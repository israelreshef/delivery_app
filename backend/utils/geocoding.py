import os
import logging
from datetime import timedelta
from typing import Optional, Tuple

import requests

from models import db, GeocodeCache
from utils.geocode_normalize import normalize_address_key

logger = logging.getLogger(__name__)

GOOGLE_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY") or os.getenv("GOOGLE_PLACES_API_KEY")
NOMINATIM_URL = os.getenv("NOMINATIM_URL", "http://localhost:8080")
GOOGLE_GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"


class GeocodingService:
    """Hybrid geocoder: DB cache -> Google (paid) -> Nominatim (free fallback).

    Flow:
      1. Look up normalized (address, city, country) in geocode_cache.
         Expired rows are ignored and refreshed.
      2. If miss, call Google Geocoding (most accurate for Hebrew + house numbers + POIs).
      3. On Google failure/quota, fall back to local Nominatim.
      4. Persist the verified result to cache. Never pay Google twice for the same address.
    """

    @classmethod
    def geocode(
        cls,
        address: str,
        city: str = None,
        country_code: str = "IL",
        raw_query: str = None,
        force_refresh: bool = False,
    ) -> Optional[Tuple[float, float, float]]:
        """Return (lat, lng, score) or None.

        `score` is the geocoder's confidence in 0..1.
        """
        key = normalize_address_key(address, city, country_code)

        if not force_refresh:
            cached = (
                GeocodeCache.query.filter_by(
                    address_normalized=key,
                    city=(city or None),
                    country_code=country_code.upper(),
                )
                .filter(GeocodeCache.expires_at > db.func.now())
                .first()
            )
            if cached:
                return cached.lat, cached.lng, cached.score or 1.0

        # 1. Google (primary)
        result = cls._geocode_google(address, city, country_code)
        provider = "google"

        # 2. Nominatim fallback (free, local)
        if result is None:
            result = cls._geocode_nominatim(address, city, country_code)
            provider = "nominatim"

        if result is None:
            return None

        lat, lng, score = result
        cls._save_cache(key, address, city, country_code, lat, lng, score, provider, raw_query)
        return lat, lng, score

    @classmethod
    def _geocode_google(cls, address: str, city=None, country_code="IL"):
        if not GOOGLE_API_KEY:
            return None
        query = address
        if city:
            query = f"{address}, {city}"
        if country_code:
            query = f"{query}, {country_code}"
        try:
            resp = requests.get(
                GOOGLE_GEOCODE_URL,
                params={"address": query, "key": GOOGLE_API_KEY},
                timeout=5,
            )
            resp.raise_for_status()
            data = resp.json()
            if data.get("status") != "OK" or not data.get("results"):
                logger.warning(f"Google geocode failed: {data.get('status')}")
                return None
            loc = data["results"][0]["geometry"]["location"]
            return float(loc["lat"]), float(loc["lng"]), 1.0
        except Exception as e:
            logger.error(f"Google geocode error: {e}")
            return None

    @classmethod
    def _geocode_nominatim(cls, address: str, city=None, country_code="IL"):
        try:
            params = {"q": address, "format": "json", "limit": 1, "addressdetails": 1}
            if city:
                params["city"] = city
            if country_code:
                params["countrycodes"] = country_code.lower()
            resp = requests.get(
                f"{NOMINATIM_URL}/search",
                params=params,
                headers={"User-Agent": "DeliveryApp/1.0"},
                timeout=5,
            )
            resp.raise_for_status()
            data = resp.json()
            if not data:
                return None
            item = data[0]
            score = float(item.get("importance", 0.5))
            return float(item["lat"]), float(item["lon"]), score
        except Exception as e:
            logger.error(f"Nominatim geocode error: {e}")
            return None

    @classmethod
    def _save_cache(cls, key, address, city, country_code, lat, lng, score, provider, raw_query):
        try:
            row = GeocodeCache.query.filter_by(
                address_normalized=key,
                city=(city or None),
                country_code=country_code.upper(),
            ).first()
            if row:
                row.lat = lat
                row.lng = lng
                row.score = score
                row.provider = provider
                row.raw_query = raw_query
                row.expires_at = db.func.now() + timedelta(days=30)
            else:
                row = GeocodeCache(
                    address_normalized=key,
                    city=(city or None),
                    country_code=country_code.upper(),
                    raw_query=raw_query,
                    lat=lat,
                    lng=lng,
                    score=score,
                    provider=provider,
                )
                db.session.add(row)
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            logger.error(f"Failed to save geocode cache: {e}")
