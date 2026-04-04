import pickle
import numpy as np
import pandas as pd

model =       pickle.load(open('ml/premium_model/model.pkl', 'rb'))
le_city =     pickle.load(open('ml/premium_model/le_city.pkl', 'rb'))
le_zone =     pickle.load(open('ml/premium_model/le_zone.pkl', 'rb'))
le_season =   pickle.load(open('ml/premium_model/le_season.pkl', 'rb'))
le_infra =    pickle.load(open('ml/premium_model/le_infra.pkl', 'rb'))
le_activity = pickle.load(open('ml/premium_model/le_activity.pkl', 'rb'))

city_data = {
    "Chennai":    {"disruption_freq": 9,  "infrastructure": "average", "is_rural": False, "zone": "high"},
    "Delhi":      {"disruption_freq": 8,  "infrastructure": "good",    "is_rural": False, "zone": "medium"},
    "Mumbai":     {"disruption_freq": 11, "infrastructure": "average", "is_rural": False, "zone": "critical"},
    "Bengaluru":  {"disruption_freq": 6,  "infrastructure": "good",    "is_rural": False, "zone": "medium"},
    "Hyderabad":  {"disruption_freq": 5,  "infrastructure": "average", "is_rural": False, "zone": "low"},
    "Kolkata":    {"disruption_freq": 10, "infrastructure": "poor",    "is_rural": False, "zone": "high"},
    "Pune":       {"disruption_freq": 6,  "infrastructure": "average", "is_rural": False, "zone": "low"},
    "Nagpur":     {"disruption_freq": 7,  "infrastructure": "poor",    "is_rural": True,  "zone": "medium"},
    "Patna":      {"disruption_freq": 12, "infrastructure": "poor",    "is_rural": True,  "zone": "critical"},
    "Bhubaneswar":{"disruption_freq": 10, "infrastructure": "poor",    "is_rural": True,  "zone": "high"},
}

def get_tier_premiums(base_premium, zone, is_rural):
    rural_payout_mult = 1.5 if is_rural else 1.0

    return {
        "basic": {
            "weekly_premium": max(20, round(base_premium * 0.8)),
            "max_payout_week": round(600 * rural_payout_mult),
            "disruption_days_covered": 2,
            "description": "Covers up to 2 disruption days per week"
        },
        "standard": {
            "weekly_premium": base_premium,
            "max_payout_week": round(1200 * rural_payout_mult),
            "disruption_days_covered": 4,
            "description": "Covers up to 4 disruption days per week"
        },
        "premium": {
            "weekly_premium": min(80, round(base_premium * 1.3)),
            "max_payout_week": round(2000 * rural_payout_mult),
            "disruption_days_covered": 6,
            "description": "Covers up to 6 disruption days per week"
        }
    }

def predict_premium( city, season, activity_tier, poverty_score):
   
    if city not in city_data:
        raise ValueError(f"City '{city}' not supported. Supported: {list(city_data.keys())}")

    data = city_data[city]
    zone = data["zone"]
    infrastructure = data["infrastructure"]
    is_rural = data["is_rural"]
    disruption_freq = data["disruption_freq"]

    
    city_enc =     le_city.transform([city])[0]
    zone_enc =     le_zone.transform([zone])[0]
    season_enc =   le_season.transform([season])[0]
    infra_enc =    le_infra.transform([infrastructure])[0]
    activity_enc = le_activity.transform([activity_tier])[0]
    is_rural_enc = int(is_rural)

    features = pd.DataFrame([[
    city_enc, zone_enc, season_enc, disruption_freq,
    infra_enc, is_rural_enc, activity_enc, poverty_score
]], columns=[
    'city_enc', 'zone_enc', 'season_enc', 'disruption_freq',
    'infra_enc', 'is_rural_enc', 'activity_enc', 'poverty_score'
])
    base_premium = round(float(model.predict(features)[0]))
    premium_cap = 65 if is_rural else 50
    base_premium = max(20, min(premium_cap, base_premium))

    avg_daily_income = {'low': 300, 'medium': 350, 'high': 380, 'critical': 360}[zone]
    trigger_prob = {'low': 0.08, 'medium': 0.16, 'high': 0.30, 'critical': 0.38}[zone]

    recovery_mult = 1.2 if is_rural else 1.0
    expected_payout = trigger_prob * avg_daily_income * recovery_mult
    loss_ratio = round(expected_payout / (base_premium * 4), 2)

    return {
        "city": city,
        "zone": zone,
        "is_rural": is_rural,
        "infrastructure": infrastructure,
        "historical_disruption_freq_per_year": disruption_freq,
        "base_weekly_premium": base_premium,
        "tiers": get_tier_premiums(base_premium, zone, is_rural),
        "expected_loss_ratio": loss_ratio,
        "sustainable": 0.55 <= loss_ratio <= 0.70
    }


if __name__ == "__main__":
    print("=== Urban Worker: Chennai, Monsoon ===")
    result = predict_premium("Chennai", "monsoon", "high", 0.8)
    print(f"Base Premium: ₹{result['base_weekly_premium']}/week")
    print(f"Loss Ratio: {result['expected_loss_ratio']} | Sustainable: {result['sustainable']}")
    print("Tiers:")
    for tier, details in result['tiers'].items():
        print(f"  {tier}: ₹{details['weekly_premium']}/week → max payout ₹{details['max_payout_week']}/week")

    print("\n=== Rural Worker: Patna, Monsoon ===")
    result2 = predict_premium("Patna", "monsoon", "high", 0.9)
    print(f"Base Premium: ₹{result2['base_weekly_premium']}/week")
    print(f"Loss Ratio: {result2['expected_loss_ratio']} | Sustainable: {result2['sustainable']}")
    print("Tiers:")
    for tier, details in result2['tiers'].items():
        print(f"  {tier}: ₹{details['weekly_premium']}/week → max payout ₹{details['max_payout_week']}/week")