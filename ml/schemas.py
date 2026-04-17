from datetime import datetime
from enum import Enum
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class WeatherCondition(str, Enum):
    sunny = "sunny"
    rain = "rain"
    storm = "storm"
    cloudy = "cloudy"
    wind = "wind"
    fog = "fog"
    hail = "hail"
    snow = "snow"


class LocationPayload(BaseModel):
    city: str
    lat: float
    lon: float


class PremiumRequest(BaseModel):
    city: str
    season: str
    activity_tier: str
    poverty_score: float


class FraudCheckRequest(BaseModel):
    user_id: str
    location: LocationPayload
    timestamp: datetime
    weather: str
    amount: float = Field(..., gt=0)
    incident_type: Optional[str] = "weather"
    season: Optional[str] = None
    activity_tier: Optional[str] = "medium"
    poverty_score: Optional[float] = 0.5


class FraudCheckResponse(BaseModel):
    claim_id: str
    fraud_score: float
    fraud_flag: bool
    reason: List[str]
    status: Literal["pending", "approved", "rejected"]


class PayoutRequest(BaseModel):
    claim_id: str
    amount: float = Field(..., gt=0)


class PayoutResponse(BaseModel):
    status: Literal["approved", "rejected"]
    transaction_id: str
    approved_amount: float
    message: str


class ClaimSummary(BaseModel):
    claim_id: str
    status: str
    est_payout: float
    fraud_score: float
    created_at: datetime
    location: LocationPayload


class WorkerDashboardResponse(BaseModel):
    user_id: str
    total_earnings_protected: float
    active_weekly_coverage: int
    claim_status: dict
    recent_claims: List[ClaimSummary]


class FraudTrendPoint(BaseModel):
    date: str
    fraud_rate: float
    total_claims: int


class PredictedDisruption(BaseModel):
    city: str
    season: str
    predicted_loss_ratio: float
    sustainable: bool


class AdminDashboardResponse(BaseModel):
    fraud_trends: List[FraudTrendPoint]
    loss_ratio_overview: dict
    predicted_disruptions: List[PredictedDisruption]


class SimulationRequest(BaseModel):
    user_id: Optional[str] = "worker-001"
    city: str
    event_type: str
    severity: Literal["low", "medium", "high"] = "medium"
    amount: float = Field(..., gt=0)


class SimulationResponse(BaseModel):
    event_id: str
    claim_id: str
    fraud_score: float
    fraud_flag: bool
    payout_status: Literal["approved", "rejected"]
    transaction_id: str
    message: str
