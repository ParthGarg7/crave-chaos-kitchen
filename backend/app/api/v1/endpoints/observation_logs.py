from fastapi import APIRouter, Query
from typing import List, Any
from app.core.observation_store import observation_store

router = APIRouter(prefix="/observation", tags=["observation"])

@router.get("/logs", response_model=List[Any])
async def get_observation_logs(
    limit: int = Query(100, ge=1, le=1000, description="Number of logs to return")
):
    """
    Returns recent API observation logs.
    This provides structured behavioral data ('CCTV recordings') of API traffic.
    """
    return await observation_store.get_logs(limit=limit)
