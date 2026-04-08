from fastapi import APIRouter, Depends, Query
from typing import List, Any
from app.core.observation_store import observation_store
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.models.api_call_log import ApiCallLog

router = APIRouter(prefix="/observation", tags=["observation"])

@router.get("/logs", response_model=List[Any])
async def get_observation_logs(
    limit: int = Query(100, ge=1, le=1000, description="Number of logs to return"),
    db: Session = Depends(get_db),
):
    """
    Returns recent API observation logs.
    This provides structured behavioral data ('CCTV recordings') of API traffic.
    """
    db_logs = (
        db.query(ApiCallLog)
        .order_by(ApiCallLog.created_at.desc())
        .limit(limit)
        .all()
    )

    if db_logs:
        return [
            {
                "timestamp": log.created_at.isoformat() if log.created_at else None,
                "endpoint": log.endpoint,
                "method": log.method,
                "status_code": log.status_code,
                "response_time_ms": log.response_time_ms,
                "request_id": log.request_id,
                "service_name": log.service_name,
                "failure_type": log.failure_type,
                "client_ip": log.client_ip,
                "error_message": log.error_message,
            }
            for log in db_logs
        ]

    return await observation_store.get_logs(limit=limit)
