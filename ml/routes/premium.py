from fastapi import APIRouter, HTTPException
from ..premium_model.predict import predict_premium
from ..schemas import PremiumRequest

router = APIRouter()


@router.post("/prices")
def get_prices(req: PremiumRequest):
    try:
        result = predict_premium(req.city, req.season, req.activity_tier, req.poverty_score)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    tiers = result["tiers"]
    return {
        "basic": tiers["basic"]["weekly_premium"],
        "standard": tiers["standard"]["weekly_premium"],
        "premium": tiers["premium"]["weekly_premium"],
        "zone": result["zone"],
        "loss_ratio": result["expected_loss_ratio"],
        "sustainable": result["sustainable"],
    }


@router.get("/prices/default")
def get_default_prices():
    result = predict_premium("Mumbai", "monsoon", "high", 0.7)
    tiers = result["tiers"]
    return {
        "basic": tiers["basic"]["weekly_premium"],
        "standard": tiers["standard"]["weekly_premium"],
        "premium": tiers["premium"]["weekly_premium"],
    }
