from fastapi import APIRouter, HTTPException
from ..schemas import SimulationRequest
from ..services.simulation_service import simulate_event

router = APIRouter()


@router.post("/simulate/event")
def simulate_event_route(payload: SimulationRequest):
    try:
        return simulate_event(payload)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))
