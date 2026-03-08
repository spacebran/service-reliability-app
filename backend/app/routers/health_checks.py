from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.health_check import HealthCheck, HealthStatus
from app.models.service import Service
from app.models.user import User
from app.routers.auth import get_current_user

router = APIRouter()


@router.get("/dashboard/summary")
async def dashboard_summary(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    total_result = await db.execute(select(func.count()).select_from(Service))
    total_services = total_result.scalar_one()

    # Latest check per service via subquery
    latest_id_subq = (
        select(func.max(HealthCheck.id))
        .where(HealthCheck.service_id == Service.id)
        .correlate(Service)
        .scalar_subquery()
    )
    latest_checks_result = await db.execute(
        select(HealthCheck.status).where(HealthCheck.id == latest_id_subq)
    )
    statuses = latest_checks_result.scalars().all()

    status_counts = {s.value: 0 for s in HealthStatus}
    for s in statuses:
        status_counts[s.value] += 1

    env_result = await db.execute(
        select(Service.environment, func.count().label("count"))
        .group_by(Service.environment)
    )
    by_environment = {row.environment: row.count for row in env_result}

    return {
        "total_services": total_services,
        "by_status": status_counts,
        "by_environment": by_environment,
    }
