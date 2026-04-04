import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error
import pickle
import os

df = pd.read_csv('ml/premium_model/data.csv')

le_city = LabelEncoder()
le_zone = LabelEncoder()
le_season = LabelEncoder()
le_infra = LabelEncoder()
le_activity = LabelEncoder()

df['city_enc'] = le_city.fit_transform(df['city'])
df['zone_enc'] = le_zone.fit_transform(df['zone'])
df['season_enc'] = le_season.fit_transform(df['season'])
df['infra_enc'] = le_infra.fit_transform(df['infrastructure'])
df['activity_enc'] = le_activity.fit_transform(df['activity_tier'])
df['is_rural_enc'] = df['is_rural'].astype(int)  # True=1, False=0

X = df[[
    'city_enc', 'zone_enc', 'season_enc', 'disruption_freq',
    'infra_enc', 'is_rural_enc', 'activity_enc', 'poverty_score'
]]
y = df['premium']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

preds = model.predict(X_test)
print(f"MAE: ₹{mean_absolute_error(y_test, preds):.2f}")

feature_names = ['city', 'zone', 'season', 'disruption_freq', 'infrastructure', 'is_rural', 'activity_tier', 'poverty_score']
importances = dict(zip(feature_names, model.feature_importances_))
print("\nFeature Importance:")
for k, v in sorted(importances.items(), key=lambda x: -x[1]):
    print(f"  {k}: {round(v*100, 1)}%")

os.makedirs('ml/premium_model', exist_ok=True)
pickle.dump(model,       open('ml/premium_model/model.pkl', 'wb'))
pickle.dump(le_city,     open('ml/premium_model/le_city.pkl', 'wb'))
pickle.dump(le_zone,     open('ml/premium_model/le_zone.pkl', 'wb'))
pickle.dump(le_season,   open('ml/premium_model/le_season.pkl', 'wb'))
pickle.dump(le_infra,    open('ml/premium_model/le_infra.pkl', 'wb'))
pickle.dump(le_activity, open('ml/premium_model/le_activity.pkl', 'wb'))
print("\nModel trained and saved")