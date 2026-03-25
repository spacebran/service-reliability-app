from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.checker.scheduler import schedule_service
from app.database import get_db
from app.models.health_check import HealthCheck
from app.models.service import Service
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.health_check import HealthCheckResponse
from app.schemas.service import ServiceCreate, ServiceResponse, ServiceUpdate

router = APIRouter()


async def _get_service_or_404(service_id: int, db: AsyncSession) -> Service:
    result = await db.execute(select(Service).where(Service.id == service_id))
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    return service


async def _attach_latest_check(service: Service, db: AsyncSession) -> ServiceResponse:
    subquery = (
        select(func.max(HealthCheck.id))
        .where(HealthCheck.service_id == service.id)
        .scalar_subquery()
    )
    result = await db.execute(select(HealthCheck).where(HealthCheck.id == subquery))
    latest = result.scalar_one_or_none()
    response = ServiceResponse.model_validate(service)
    if latest:
        response.latest_check = HealthCheckResponse.model_validate(latest)
    return response


@router.get("", response_model=list[ServiceResponse])
async def list_services(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    # Latest health check per service, grouped by service_id
    latest_checks_subquery = (
        select(
            func.max(HealthCheck.id).label("max_id"),
            HealthCheck.service_id.label("service_id"),
        )
        .group_by(HealthCheck.service_id)
        .subquery()
    )

    result = await db.execute(
        select(Service, HealthCheck)
        .select_from(Service)
        .outerjoin(
            latest_checks_subquery, Service.id == latest_checks_subquery.c.service_id
        )  # Left outer join services table with subquery
        .outerjoin(
            HealthCheck, HealthCheck.id == latest_checks_subquery.c.max_id
        )  # Left outer join services with health checks
        .order_by(Service.name)
    )

    # Full SQL. We do two left outer joins to preserve services with no health checks >>>
    # SELECT services.*, health_checks.*
    # FROM services
    # LEFT OUTER JOIN (
    #     SELECT MAX(id) AS max_id, service_id
    #     FROM health_checks
    #     GROUP BY service_id
    # ) AS subq ON services.id = subq.service_id
    # LEFT OUTER JOIN health_checks ON health_checks.id = subq.max_id
    # ORDER BY services.name

    rows = result.unique().all()

    responses = []
    for row in rows:
        service, health_check = row
        response = ServiceResponse.model_validate(service)
        if health_check:
            response.latest_check = HealthCheckResponse.model_validate(health_check)
        responses.append(response)
    return responses


@router.post("", response_model=ServiceResponse, status_code=201)
async def create_service(
    payload: ServiceCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    service = Service(**payload.model_dump())
    db.add(service)
    await db.commit()
    await db.refresh(service)
    if service.is_active:
        schedule_service(service)
    return ServiceResponse.model_validate(service)


@router.put("/{service_id}", response_model=ServiceResponse)
async def update_service(
    service_id: int,
    payload: ServiceUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    service = await _get_service_or_404(service_id, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(service, field, value)
    await db.commit()
    await db.refresh(service)
    if service.is_active:
        schedule_service(service)
    return await _attach_latest_check(service, db)


@router.delete("/{service_id}", status_code=204)
async def delete_service(
    service_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    service = await _get_service_or_404(service_id, db)
    await db.delete(service)
    await db.commit()


@router.get("/{service_id}/history", response_model=list[HealthCheckResponse])
async def service_history(
    service_id: int,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    await _get_service_or_404(service_id, db)
    result = await db.execute(
        select(HealthCheck)
        .where(HealthCheck.service_id == service_id)
        .order_by(HealthCheck.checked_at.desc())
        .limit(limit)
    )
    return result.scalars().all()
