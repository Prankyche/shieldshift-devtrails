from datetime import datetime
from typing import Dict, List

from ..premium_model.predict import predict_premium
from .storage import get_all_claims, get_user_claims


def worker_dashboard(user_id: str) -> Dict[str, any]:
    claims = get_user_claims(user_id)
    total_earnings_protected = sum(claim.get("paid_amount", 0.0) for claim in claims if claim.get("status") == "approved")
    active_weekly_coverage = sum(1 for claim in claims if claim.get("status") in ["pending", "processing"])

    claim_status = {
        "pending": sum(1 for claim in claims if claim.get("status") == "pending"),
        "processing": sum(1 for claim in claims if claim.get("status") == "processing"),
        "approved": sum(1 for claim in claims if claim.get("status") == "approved"),
        "rejected": sum(1 for claim in claims if claim.get("status") == "rejected"),
    }

    recent_claims = sorted(claims, key=lambda c: c.get("created_at", ""), reverse=True)[:5]
    return {
        "user_id": user_id,
        "total_earnings_protected": round(total_earnings_protected, 2),
        "active_weekly_coverage": active_weekly_coverage,
        "claim_status": claim_status,
        "recent_claims": recent_claims,
    }


def admin_dashboard() -> Dict[str, any]:
    claims = get_all_claims()
    now = datetime.utcnow()
    fraud_trends: Dict[str, Dict[str, any]] = {}

    for claim in claims:
        created = datetime.fromisoformat(claim["created_at"])
        label = created.strftime("%Y-%m-%d")
        bucket = fraud_trends.setdefault(label, {"fraud_count": 0, "total": 0})
        bucket["total"] += 1
        if claim.get("fraud_flag"):
            bucket["fraud_count"] += 1

    trend_data = [
        {
            "date": date,
            "fraud_rate": round(bucket["fraud_count"] / bucket["total"], 3) if bucket["total"] else 0.0,
            "total_claims": bucket["total"],
        }
        for date, bucket in sorted(fraud_trends.items())
    ]

    approved = [claim for claim in claims if claim.get("status") == "approved"]
    total_paid = sum(claim.get("paid_amount", 0.0) for claim in approved)
    total_claimed = sum(claim.get("amount", 0.0) for claim in claims)
    loss_ratio = round(total_paid / total_claimed, 3) if total_claimed else 0.0

    predicted_disruptions = []
    for city, config in [
        ("Mumbai", {"season": "monsoon", "activity_tier": "high", "poverty_score": 0.7}),
        ("Patna", {"season": "monsoon", "activity_tier": "high", "poverty_score": 0.8}),
        ("Bengaluru", {"season": "summer", "activity_tier": "medium", "poverty_score": 0.6}),
    ]:
        result = predict_premium(city, config["season"], config["activity_tier"], config["poverty_score"])
        predicted_disruptions.append(
            {
                "city": city,
                "season": config["season"],
                "predicted_loss_ratio": result.get("expected_loss_ratio", 0.0),
                "sustainable": result.get("sustainable", False),
            }
        )

    return {
        "fraud_trends": trend_data,
        "loss_ratio_overview": {
            "total_claims": len(claims),
            "approved_payout": round(total_paid, 2),
            "loss_ratio": loss_ratio,
            "fraud_rate": round(sum(1 for claim in claims if claim.get("fraud_flag")) / len(claims), 3) if claims else 0.0,
        },
        "predicted_disruptions": predicted_disruptions,
    }
