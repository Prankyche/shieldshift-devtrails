import uuid
from typing import Dict

from .storage import create_transaction, get_claim, update_claim


def process_payout(claim_id: str, amount: float) -> Dict[str, any]:
    claim = get_claim(claim_id)
    if not claim:
        raise ValueError(f"Claim not found: {claim_id}")

    if claim.get("status") in ["approved", "rejected"]:
        return {
            "status": claim["status"],
            "transaction_id": claim.get("transaction_id", ""),
            "approved_amount": claim.get("paid_amount", 0.0),
            "message": "Claim already processed.",
        }

    if claim.get("fraud_flag"):
        updated = update_claim(claim_id, {"status": "rejected", "paid_amount": 0.0})
        transaction_id = uuid.uuid4().hex
        create_transaction({
            "claim_id": claim_id,
            "status": "rejected",
            "approved_amount": 0.0,
            "transaction_id": transaction_id,
            "message": "Payout rejected due to fraud flag.",
        })
        return {
            "status": "rejected",
            "transaction_id": transaction_id,
            "approved_amount": 0.0,
            "message": "Claim rejected. Fraud detected.",
        }

    transaction_id = uuid.uuid4().hex
    approved_amount = round(amount, 2)
    update_claim(claim_id, {
        "status": "approved",
        "transaction_id": transaction_id,
        "paid_amount": approved_amount,
    })
    create_transaction({
        "claim_id": claim_id,
        "status": "approved",
        "approved_amount": approved_amount,
        "transaction_id": transaction_id,
        "message": "Mock payout completed successfully.",
    })

    return {
        "status": "approved",
        "transaction_id": transaction_id,
        "approved_amount": approved_amount,
        "message": "Payout approved and executed in simulated mode.",
    }
