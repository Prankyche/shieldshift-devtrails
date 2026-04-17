import uuid
from datetime import datetime

from ..schemas import FraudCheckRequest, SimulationRequest
from .fraud_service import evaluate_claim
from .payout_service import process_payout
from .storage import get_user


SIMULATION_EVENTS = {
    "rainstorm": {"weather": "storm", "season": "monsoon"},
    "heatwave": {"weather": "sunny", "season": "summer"},
    "cold_snap": {"weather": "cloudy", "season": "winter"},
}


def simulate_event(req: SimulationRequest) -> dict:
    user = get_user(req.user_id) or {"user_id": req.user_id, "role": "worker", "name": "Worker"}
    event_profile = SIMULATION_EVENTS.get(req.event_type.lower(), {"weather": "cloudy", "season": "spring"})
    timestamp = datetime.utcnow()

    fraud_request = FraudCheckRequest(
        user_id=user["user_id"],
        location={"city": req.city, "lat": 0.0, "lon": 0.0},
        timestamp=timestamp,
        weather=event_profile["weather"],
        amount=req.amount,
        incident_type=req.event_type,
        season=event_profile["season"],
        activity_tier="high" if req.severity == "high" else "medium",
        poverty_score=0.7,
    )

    fraud_result = evaluate_claim(fraud_request)
    payout_result = process_payout(fraud_result["claim_id"], req.amount)

    return {
        "event_id": uuid.uuid4().hex,
        "claim_id": fraud_result["claim_id"],
        "fraud_score": fraud_result["fraud_score"],
        "fraud_flag": fraud_result["fraud_flag"],
        "payout_status": payout_result["status"],
        "transaction_id": payout_result["transaction_id"],
        "message": payout_result["message"],
    }
