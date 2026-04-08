"""
Persistent API call logs for observation and debugging.
"""
from sqlalchemy import Column, DateTime, Float, Integer, String, Text
from sqlalchemy.sql import func

from app.db.base import Base


class ApiCallLog(Base):
    __tablename__ = "api_call_logs"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(String(64), index=True, nullable=False)
    method = Column(String(10), nullable=False)
    endpoint = Column(String(512), index=True, nullable=False)
    status_code = Column(Integer, nullable=False)
    response_time_ms = Column(Float, nullable=False)
    service_name = Column(String(128), nullable=False, default="demo-food-delivery")
    failure_type = Column(String(128), nullable=False, default="none")
    client_ip = Column(String(64), nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
