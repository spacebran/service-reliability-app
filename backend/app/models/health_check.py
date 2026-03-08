import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class HealthStatus(str, enum.Enum):
    healthy = "healthy"
    degraded = "degraded"
    down = "down"


class HealthCheck(Base):
    __tablename__ = "health_checks"

    id: Mapped[int] = mapped_column(primary_key=True)
    service_id: Mapped[int] = mapped_column(ForeignKey("services.id", ondelete="CASCADE"), nullable=False, index=True)
    status: Mapped[HealthStatus] = mapped_column(Enum(HealthStatus), nullable=False)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    actual_version: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status_code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error_message: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    checked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    service: Mapped["Service"] = relationship("Service", back_populates="health_checks")  # noqa: F821
