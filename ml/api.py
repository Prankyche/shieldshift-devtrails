from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes.dashboard import router as dashboard_router
from .routes.fraud import router as fraud_router
from .routes.payout import router as payout_router
from .routes.premium import router as premium_router
from .routes.simulate import router as simulation_router

app = FastAPI(
    title="ShieldShift ML & Fraud API",
    description="FastAPI service powering premium pricing, fraud detection, payout simulation, and actionable dashboards.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(premium_router, prefix="/api")
app.include_router(fraud_router, prefix="/api")
app.include_router(payout_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(simulation_router, prefix="/api")


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ShieldShift ML API"}
