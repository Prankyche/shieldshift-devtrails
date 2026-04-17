from fastapi import APIRouter, HTTPException
from ..schemas import PayoutRequest
from ..services.payout_service import process_payout

router = APIRouter()


@router.post("/payout/process")
def payout_process(payload: PayoutRequest):
    try:
        return process_payout(payload.claim_id, payload.amount)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))
