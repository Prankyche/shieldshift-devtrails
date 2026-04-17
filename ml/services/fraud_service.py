from datetime import datetime
from math import asin, cos, radians, sin, sqrt
from typing import Dict, List, Tuple

from ..premium_model.predict import predict_premium
from ..schemas import FraudCheckRequest
from .storage import create_claim, get_last_claim_for_user


CITY_WEATHER_PROFILE = {
    "Mumbai": {"rainy": [6, 7, 8, 9], "sunny": [3, 4, 5], "cloudy": [10, 11], "cool": [12, 1, 2]},
    "Delhi": {"rainy": [7, 8, 9], "sunny": [4, 5, 6], "cool": [12, 1, 2], "cloudy": [10, 11]},
    "Chennai": {"rainy": [10, 11, 12], "sunny": [3, 4, 5], "cloudy": [6, 7, 8, 9], "cool": [1, 2]},
    "Bengaluru": {"rainy": [5, 6, 7, 8, 9], "sunny": [3, 4, 10], "cool": [12, 1, 2], "cloudy": [11]},
    "Hyderabad": {"rainy": [6, 7, 8, 9], "sunny": [3, 4, 5], "cloudy": [10, 11], "cool": [12, 1, 2]},
    "Kolkata": {"rainy": [6, 7, 8, 9, 10], "sunny": [3, 4, 5], "cloudy": [11, 12], "cool": [1, 2]},
    "Pune": {"rainy": [6, 7, 8, 9], "sunny": [3, 4, 5], "cloudy": [10, 11], "cool": [12, 1, 2]},
    "Nagpur": {"rainy": [6, 7, 8, 9], "sunny": [3, 4, 5], "cloudy": [10, 11], "cool": [12, 1, 2]},
    "Patna": {"rainy": [6, 7, 8, 9, 10], "sunny": [3, 4, 5], "cloudy": [11, 12], "cool": [1, 2]},
    "Bhubaneswar": {"rainy": [6, 7, 8, 9, 10], "sunny": [3, 4, 5], "cloudy": [11, 12], "cool": [1, 2]},
}


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius = 6371.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    c = 2 * asin(sqrt(a))
    return radius * c


def _get_season_from_timestamp(timestamp: datetime) -> str:
    month = timestamp.month
    if month in (6, 7, 8, 9):
        return "monsoon"
    if month in (3, 4, 5):
        return "summer"
    if month in (12, 1, 2):
        return "winter"
    return "spring"


def _weather_match_score(city: str, timestamp: datetime, weather: str) -> Tuple[float, str]:
    weather_norm = weather.strip().lower()
    profile = CITY_WEATHER_PROFILE.get(city, {})
    month = timestamp.month
    expected_keys = [k for k, months in profile.items() if month in months]
    if not expected_keys:
        return 0.2, "No historical weather profile available for this city."

    expected_labels = set(expected_keys)
    if weather_norm in expected_labels or any(weather_norm.startswith(key) for key in expected_labels):
        return 0.0, "Weather claim matches expected historical conditions."

    return 0.7, f"Claim weather '{weather}' is unlikely for {city} in month {month}."


def _gps_spoof_score(user_id: str, location: Dict[str, float], timestamp: datetime) -> Tuple[float, str]:
    last_claim = get_last_claim_for_user(user_id)
    if not last_claim:
        return 0.0, "No prior location to compare."

    last_location = last_claim.get("location", {})
    last_timestamp = datetime.fromisoformat(last_claim.get("timestamp"))
    distance_km = _haversine(
        last_location.get("lat", 0.0),
        last_location.get("lon", 0.0),
        location.get("lat", 0.0),
        location.get("lon", 0.0),
    )
    delta_hours = max((timestamp - last_timestamp).total_seconds() / 3600.0, 1.0)
    speed_kmh = distance_km / delta_hours

    if speed_kmh > 140:
        return 1.0, f"GPS jump of {distance_km:.1f} km in {delta_hours:.1f} h implies {speed_kmh:.1f} km/h."
    if speed_kmh > 80:
        return 0.7, f"High-speed jump of {speed_kmh:.1f} km/h may indicate location spoofing."
    if distance_km > 200 and delta_hours < 6:
        return 0.8, f"Long distance jump of {distance_km:.1f} km in under {delta_hours:.1f} hours."
    return 0.0, "Location evolves within normal bounds."


def _predictive_score(city: str, season: str, activity_tier: str, poverty_score: float) -> float:
    try:
        result = predict_premium(city, season, activity_tier, poverty_score)
        loss_ratio = result.get("expected_loss_ratio", 0.0)
        return max(0.0, min(0.2, 0.2 - loss_ratio * 0.1))
    except Exception:
        return 0.1


def evaluate_claim(req: FraudCheckRequest) -> Dict[str, any]:
    season = req.season or _get_season_from_timestamp(req.timestamp)
    weather_score, weather_reason = _weather_match_score(req.location.city, req.timestamp, req.weather)
    gps_score, gps_reason = _gps_spoof_score(req.user_id, req.location.dict(), req.timestamp)
    model_score = _predictive_score(req.location.city, season, req.activity_tier or "medium", req.poverty_score or 0.5)

    fraud_score = min(1.0, gps_score * 0.4 + weather_score * 0.4 + model_score * 0.2)
    reasons: List[str] = []
    if gps_score > 0:
        reasons.append(gps_reason)
    if weather_score > 0:
        reasons.append(weather_reason)
    if model_score > 0.12:
        reasons.append("Model suggests claim severity is higher than expected for this risk profile.")
    if not reasons:
        reasons.append("Claim passed the fraud heuristics.")

    is_fraud = fraud_score >= 0.45

    claim = create_claim({
        "user_id": req.user_id,
        "location": req.location.dict(),
        "timestamp": req.timestamp.isoformat(),
        "weather": req.weather,
        "amount": req.amount,
        "incident_type": req.incident_type,
        "season": season,
        "activity_tier": req.activity_tier,
        "poverty_score": req.poverty_score,
        "fraud_score": fraud_score,
        "fraud_flag": is_fraud,
        "fraud_reason": reasons,
        "status": "pending",
    })

    return {
        "claim_id": claim["id"],
        "fraud_score": round(fraud_score, 3),
        "fraud_flag": is_fraud,
        "reason": reasons,
        "status": claim["status"],
    }
