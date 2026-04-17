from fastapi import APIRouter, HTTPException
from ..services.dashboard_service import admin_dashboard, worker_dashboard

router = APIRouter()


@router.get("/dashboard/worker/{user_id}")
def worker_dashboard_route(user_id: str):
    try:
        return worker_dashboard(user_id)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/dashboard/admin")
def admin_dashboard_route():
    try:
        return admin_dashboard()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))
