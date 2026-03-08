from datetime import datetime

from pydantic import BaseModel

from app.schemas.health_check import HealthCheckResponse


class ServiceBase(BaseModel):
    name: str
    url: str
    expected_version: str | None = None
    environment: str = "production"
    check_interval_seconds: int = 60
    is_active: bool = True


class ServiceCreate(ServiceBase):
    pass


class ServiceUpdate(BaseModel):
    name: str | None = None
    url: str | None = None
    expected_version: str | None = None
    environment: str | None = None
    check_interval_seconds: int | None = None
    is_active: bool | None = None


class ServiceResponse(ServiceBase):
    id: int
    created_at: datetime
    updated_at: datetime
    latest_check: HealthCheckResponse | None = None

    model_config = {"from_attributes": True}
