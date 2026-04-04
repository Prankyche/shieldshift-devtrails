import pandas as pd
import numpy as np

np.random.seed(42)

city_data = {
    "Chennai":   {"disruption_freq": 9,  "infrastructure": "average", "is_rural": False},
    "Delhi":     {"disruption_freq": 8,  "infrastructure": "good",    "is_rural": False},
    "Mumbai":    {"disruption_freq": 11, "infrastructure": "average", "is_rural": False},
    "Bengaluru": {"disruption_freq": 6,  "infrastructure": "good",    "is_rural": False},
    "Hyderabad": {"disruption_freq": 5,  "infrastructure": "average", "is_rural": False},
    "Kolkata":   {"disruption_freq": 10, "infrastructure": "poor",    "is_rural": False},
    "Pune":      {"disruption_freq": 6,  "infrastructure": "average", "is_rural": False},
    "Nagpur":    {"disruption_freq": 7,  "infrastructure": "poor",    "is_rural": True},
    "Patna":     {"disruption_freq": 12, "infrastructure": "poor",    "is_rural": True},
    "Bhubaneswar":{"disruption_freq": 10,"infrastructure": "poor",    "is_rural": True},
}

zones = ['low', 'medium', 'high', 'critical']
seasons = ['summer', 'monsoon', 'winter', 'spring']
activity_tiers = ['high', 'medium', 'low']

city_zone = {
    "Chennai": "high",
    "Delhi": "medium",
    "Mumbai": "critical",
    "Bengaluru": "medium",
    "Hyderabad": "low",
    "Kolkata": "high",
    "Pune": "low",
    "Nagpur": "medium",
    "Patna": "critical",
    "Bhubaneswar": "high",
}

rows = []
for _ in range(2000):
    city = np.random.choice(list(city_data.keys()))
    data = city_data[city]

    zone = city_zone[city]
    season = np.random.choice(seasons)
    disruption_freq = max(0, data["disruption_freq"] + np.random.randint(-2, 3))
    infrastructure = data["infrastructure"]
    is_rural = data["is_rural"]
    activity = np.random.choice(activity_tiers)
    poverty_score = round(np.random.uniform(0.3, 1.0), 2)

    base = {'low': 20, 'medium': 30, 'high': 40, 'critical': 50}[zone]

    season_mult = {'monsoon': 1.3, 'summer': 1.1, 'spring': 1.0, 'winter': 0.9}[season]

    infra_mult = {'good': 0.9, 'average': 1.0, 'poor': 1.2}[infrastructure]

    rural_mult = 1.2 if is_rural else 1.0

    activity_mult = {'high': 1.0, 'medium': 0.9, 'low': 0.8}[activity]

    poverty_adj = round((1 - poverty_score) * 5, 2)

    premium = round(
        base * season_mult * infra_mult * rural_mult * activity_mult
        + disruption_freq * 0.3
        - poverty_adj
    )

    premium_cap = 65 if is_rural else 50
    premium = max(20, min(premium_cap, premium))

    rows.append([
        city, zone, season, disruption_freq,
        infrastructure, is_rural, activity, poverty_score, premium
    ])

df = pd.DataFrame(rows, columns=[
    'city', 'zone', 'season', 'disruption_freq',
    'infrastructure', 'is_rural', 'activity_tier', 'poverty_score', 'premium'
])

df.to_csv('ml/premium_model/data.csv', index=False)
print(f"Generated {len(df)} rows")
print(df.groupby('city')['premium'].mean().round(2))