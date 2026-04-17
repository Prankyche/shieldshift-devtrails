# ml/weathertrigger.py

import requests
from datetime import datetime
from fastapi import FastAPI
from pydantic import BaseModel

API_KEY = "YOUR-API-KEY"

app = FastAPI()

# -----------------------------
# Input schema
# -----------------------------
class TriggerRequest(BaseModel):
    city: str
    worker_shift_start: int = 9
    worker_shift_end: int = 21


# -----------------------------
# Season
# -----------------------------
def get_current_season():
    month = datetime.now().month
    if month in [7, 8, 9]:
        return 'monsoon'
    elif month in [4, 5, 6]:
        return 'summer'
    elif month in [2, 3]:
        return 'spring'
    else:
        return 'winter'


# -----------------------------
# WEATHER
# -----------------------------
def check_weather_trigger(city, worker_shift_start, worker_shift_end):
    try:
        url = f"http://api.openweathermap.org/data/2.5/weather?q={city}&appid={API_KEY}&units=metric"
        response = requests.get(url, timeout=5).json()

        rainfall = response.get('rain', {}).get('1h', 0)
        temp = response['main']['temp']
    except:
        rainfall = 0
        temp = 30

    current_hour = datetime.now().hour
    worker_active = worker_shift_start <= current_hour <= worker_shift_end

    triggers = []
    payout_percent = 0

    if worker_active:
        if rainfall > 64.5:
            triggers.append("HEAVY_RAIN")
            payout_percent = 60
        elif rainfall > 35:
            triggers.append("MODERATE_RAIN")
            payout_percent = 30

        if temp > 45:
            triggers.append("EXTREME_HEAT")
            payout_percent = max(payout_percent, 60)

    return {
        "rainfall": rainfall,
        "temp": temp,
        "triggers": triggers,
        "payout_percent": payout_percent,
        "triggered": len(triggers) > 0 and worker_active
    }


# -----------------------------
# AQI
# -----------------------------
def check_aqi_trigger(city, worker_shift_start, worker_shift_end):
    try:
        url = f"https://api.openaq.org/v2/latest?city={city}&parameter=pm25&limit=1"
        response = requests.get(url, timeout=5).json()
        aqi = response['results'][0]['measurements'][0]['value']
    except:
        aqi = 0

    current_hour = datetime.now().hour
    worker_active = worker_shift_start <= current_hour <= worker_shift_end

    triggers = []
    payout_percent = 0

    if worker_active:
        if aqi > 400:
            triggers.append("SEVERE_POLLUTION")
            payout_percent = 60
        elif aqi > 300:
            triggers.append("HIGH_POLLUTION")
            payout_percent = 30

    return {
        "aqi": aqi,
        "triggers": triggers,
        "payout_percent": payout_percent,
        "triggered": len(triggers) > 0 and worker_active
    }


# -----------------------------
# CURFEW
# -----------------------------
def check_mock_curfew(city, worker_shift_start, worker_shift_end):
    mock_curfews = {
        "Chennai": {"active": True, "start": 20, "end": 6},
        "Delhi": {"active": False},
        "Mumbai": {"active": False},
    }

    curfew = mock_curfews.get(city, {"active": False})

    current_hour = datetime.now().hour
    worker_active = worker_shift_start <= current_hour <= worker_shift_end

    curfew_active = False
    if curfew.get("active"):
        start, end = curfew["start"], curfew["end"]
        if start > end:
            curfew_active = current_hour >= start or current_hour <= end
        else:
            curfew_active = start <= current_hour <= end

    triggered = curfew_active and worker_active

    return {
        "curfew_active": curfew_active,
        "triggers": ["CURFEW"] if triggered else [],
        "payout_percent": 60 if triggered else 0,
        "triggered": triggered
    }


# -----------------------------
# MAIN ML ENDPOINT
# -----------------------------
@app.post("/trigger")
def run_all_triggers(data: TriggerRequest):
    city = data.city

    weather = check_weather_trigger(city, data.worker_shift_start, data.worker_shift_end)
    aqi = check_aqi_trigger(city, data.worker_shift_start, data.worker_shift_end)
    curfew = check_mock_curfew(city, data.worker_shift_start, data.worker_shift_end)

    all_triggers = weather['triggers'] + aqi['triggers'] + curfew['triggers']
    max_payout = max(weather['payout_percent'], aqi['payout_percent'], curfew['payout_percent'])

    return {
        "city": city,
        "season": get_current_season(),
        "triggers": all_triggers,
        "payout_percent": max_payout,
        "payout_triggered": len(all_triggers) > 0
    }

# import requests
# from datetime import datetime

# API_KEY = "YOUR-API-KEY"

# def get_current_season():
#     month = datetime.now().month
#     if month in [7, 8, 9]:
#         return 'monsoon'
#     elif month in [4, 5, 6]:
#         return 'summer'
#     elif month in [2, 3]:
#         return 'spring'
#     else:
#         return 'winter'

# def check_weather_trigger(city, worker_shift_start, worker_shift_end):
#     url = f"http://api.openweathermap.org/data/2.5/weather?q={city}&appid={API_KEY}&units=metric"
#     response = requests.get(url).json()

#     current_hour = datetime.now().hour
#     worker_active = worker_shift_start <= current_hour <= worker_shift_end

#     rainfall = response.get('rain', {}).get('1h', 0)
#     temp = response['main']['temp']

#     triggers = []
#     payout_percent = 0

#     if worker_active:
#         if rainfall > 64.5:
#             triggers.append("HEAVY_RAIN")
#             payout_percent = 60
#         elif rainfall > 35:
#             triggers.append("MODERATE_RAIN")
#             payout_percent = 30

#         if temp > 45:
#             triggers.append("EXTREME_HEAT")
#             payout_percent = max(payout_percent, 60)

#     return {
#         "city": city,
#         "rainfall_mm_per_hour": rainfall,
#         "temperature_c": temp,
#         "worker_active_during_event": worker_active,
#         "triggers": triggers,
#         "payout_percent": payout_percent,
#         "payout_triggered": len(triggers) > 0 and worker_active
#     }


# def check_aqi_trigger(city, worker_shift_start, worker_shift_end):
#     url = f"https://api.openaq.org/v2/latest?city={city}&parameter=pm25&limit=1"
#     try:
#         response = requests.get(url, timeout=5).json()
#         aqi = response['results'][0]['measurements'][0]['value']
#     except:
#         aqi = 0

#     current_hour = datetime.now().hour
#     worker_active = worker_shift_start <= current_hour <= worker_shift_end

#     triggers = []
#     payout_percent = 0

#     if worker_active:
#         if aqi > 400:
#             triggers.append("SEVERE_POLLUTION")
#             payout_percent = 60
#         elif aqi > 300:
#             triggers.append("HIGH_POLLUTION")
#             payout_percent = 30

#     return {
#         "city": city,
#         "aqi_pm25": aqi,
#         "worker_active_during_event": worker_active,
#         "triggers": triggers,
#         "payout_percent": payout_percent,
#         "payout_triggered": len(triggers) > 0 and worker_active
#     }


# def check_mock_curfew(city, worker_shift_start, worker_shift_end):
#     mock_curfews = {
#         "Chennai": {"active": True, "start": 20, "end": 6},
#         "Delhi": {"active": False},
#         "Mumbai": {"active": False},
#     }

#     curfew = mock_curfews.get(city, {"active": False})
#     current_hour = datetime.now().hour
#     worker_active = worker_shift_start <= current_hour <= worker_shift_end

#     curfew_active = False
#     if curfew.get("active"):
#         start, end = curfew["start"], curfew["end"]
#         if start > end:  # overnight curfew
#             curfew_active = current_hour >= start or current_hour <= end
#         else:
#             curfew_active = start <= current_hour <= end

#     triggered = curfew_active and worker_active

#     return {
#         "city": city,
#         "curfew_active": curfew_active,
#         "worker_active_during_event": worker_active,
#         "triggers": ["CURFEW"] if triggered else [],
#         "payout_percent": 60 if triggered else 0,
#         "payout_triggered": triggered
#     }


# def run_all_triggers(city, worker_shift_start = 9, worker_shift_end = 21):
#     weather = check_weather_trigger(city, worker_shift_start, worker_shift_end)
#     aqi = check_aqi_trigger(city, worker_shift_start, worker_shift_end)
#     curfew = check_mock_curfew(city, worker_shift_start, worker_shift_end)

#     all_triggers = weather['triggers'] + aqi['triggers'] + curfew['triggers']
#     max_payout = max(weather['payout_percent'], aqi['payout_percent'], curfew['payout_percent'])

#     return {
#         "city": city,
#         "season": get_current_season(),
#         "triggers_fired": all_triggers,
#         "payout_percent": max_payout,
#         "payout_triggered": len(all_triggers) > 0,
#         "details": {
#             "weather": weather,
#             "aqi": aqi,
#             "curfew": curfew
#         }
#     }

# if __name__ == "__main__":
#     result = run_all_triggers("Chennai", worker_shift_start=8, worker_shift_end=22)
#     print(result)