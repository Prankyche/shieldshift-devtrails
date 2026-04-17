from fastapi import APIRouter, HTTPException
from ..schemas import FraudCheckRequest
from ..services.fraud_service import evaluate_claim

router = APIRouter()


@router.post("/fraud/check")
def fraud_check(payload: FraudCheckRequest):
    try:
        return evaluate_claim(payload)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))
