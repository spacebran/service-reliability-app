from datetime import datetime

from pydantic import BaseModel

from app.models.health_check import HealthStatus


class HealthCheckResponse(BaseModel):
    id: int
    service_id: int
    status: HealthStatus
    latency_ms: int | None
    actual_version: str | None
    status_code: int | None
    error_message: str | None
    checked_at: datetime

    model_config = {"from_attributes": True}
