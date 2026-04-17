import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
STORE_PATH = DATA_DIR / "store.json"

DEFAULT_STORE = {
    "claims": [],
    "transactions": [],
    "users": [
        {"user_id": "worker-001", "role": "worker", "name": "Priya Kumar"},
        {"user_id": "worker-002", "role": "worker", "name": "Sahil Sharma"},
        {"user_id": "admin", "role": "admin", "name": "ShieldShift Admin"},
    ],
}


def ensure_store() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not STORE_PATH.exists():
        STORE_PATH.write_text(json.dumps(DEFAULT_STORE, indent=2))


def _load_store() -> Dict[str, Any]:
    ensure_store()
    with STORE_PATH.open("r", encoding="utf-8") as file:
        return json.load(file)


def _save_store(store: Dict[str, Any]) -> None:
    with STORE_PATH.open("w", encoding="utf-8") as file:
        json.dump(store, file, indent=2, default=str)


def get_user(user_id: str) -> Optional[Dict[str, Any]]:
    store = _load_store()
    return next((user for user in store.get("users", []) if user["user_id"] == user_id), None)


def create_claim(payload: Dict[str, Any]) -> Dict[str, Any]:
    store = _load_store()
    claim = {
        "id": uuid.uuid4().hex,
        "user_id": payload.get("user_id"),
        "location": payload.get("location"),
        "timestamp": payload.get("timestamp"),
        "weather": payload.get("weather"),
        "amount": payload.get("amount"),
        "incident_type": payload.get("incident_type", "weather"),
        "season": payload.get("season"),
        "activity_tier": payload.get("activity_tier", "medium"),
        "poverty_score": payload.get("poverty_score", 0.5),
        "fraud_score": payload.get("fraud_score", 0.0),
        "fraud_flag": payload.get("fraud_flag", False),
        "fraud_reason": payload.get("fraud_reason", []),
        "status": payload.get("status", "pending"),
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
        "transaction_id": payload.get("transaction_id"),
        "paid_amount": payload.get("paid_amount", 0.0),
    }
    store["claims"].append(claim)
    _save_store(store)
    return claim


def update_claim(claim_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    store = _load_store()
    for claim in store["claims"]:
        if claim["id"] == claim_id:
            claim.update(updates)
            claim["updated_at"] = datetime.utcnow().isoformat()
            _save_store(store)
            return claim
    return None


def get_claim(claim_id: str) -> Optional[Dict[str, Any]]:
    store = _load_store()
    return next((claim for claim in store["claims"] if claim["id"] == claim_id), None)


def get_user_claims(user_id: str) -> List[Dict[str, Any]]:
    store = _load_store()
    return [claim for claim in store["claims"] if claim["user_id"] == user_id]


def get_all_claims() -> List[Dict[str, Any]]:
    store = _load_store()
    return store["claims"]


def create_transaction(transaction: Dict[str, Any]) -> Dict[str, Any]:
    store = _load_store()
    transaction_record = {
        "id": uuid.uuid4().hex,
        "claim_id": transaction.get("claim_id"),
        "status": transaction.get("status"),
        "approved_amount": transaction.get("approved_amount", 0.0),
        "transaction_id": transaction.get("transaction_id"),
        "message": transaction.get("message"),
        "created_at": datetime.utcnow().isoformat(),
    }
    store["transactions"].append(transaction_record)
    _save_store(store)
    return transaction_record


def get_last_claim_for_user(user_id: str) -> Optional[Dict[str, Any]]:
    claims = sorted(get_user_claims(user_id), key=lambda x: x["created_at"], reverse=True)
    return claims[0] if claims else None
