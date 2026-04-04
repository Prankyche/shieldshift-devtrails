from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sys
sys.path.insert(0, './premium_model')
from predict import predict_premium

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class PremiumRequest(BaseModel):
    city: str
    season: str
    activity_tier: str
    poverty_score: float

@app.post("/api/prices")
def get_prices(req: PremiumRequest):
    result = predict_premium(req.city, req.season, req.activity_tier, req.poverty_score)
    tiers = result["tiers"]
    return {
        "basic":    tiers["basic"]["weekly_premium"],
        "standard": tiers["standard"]["weekly_premium"],
        "premium":  tiers["premium"]["weekly_premium"],
        "zone":     result["zone"],
        "loss_ratio": result["expected_loss_ratio"],
        "sustainable": result["sustainable"],
    }

@app.get("/api/prices/default")
def get_default_prices():
    # Called on page load with sensible defaults
    result = predict_premium("Mumbai", "monsoon", "high", 0.7)
    tiers = result["tiers"]
    return {
        "basic":    tiers["basic"]["weekly_premium"],
        "standard": tiers["standard"]["weekly_premium"],
        "premium":  tiers["premium"]["weekly_premium"],
    }