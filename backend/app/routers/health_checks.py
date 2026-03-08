from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.health_check import HealthCheck, HealthStatus
from app.models.service import Service
from app.models.user import User
from app.routers.auth import get_current_user
from app.core.config import settings

import httpx
import re
from datetime import datetime, timezone, timedelta

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
        select(Service.environment, func.count().label("count")).group_by(
            Service.environment
        )
    )
    by_environment = {row.environment: row.count for row in env_result}

    return {
        "total_services": total_services,
        "by_status": status_counts,
        "by_environment": by_environment,
    }


@router.get("/dashboard/ai-summary")
async def get_ai_summary(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    # Fetch incidents from last 24 hours
    since = datetime.now(timezone.utc) - timedelta(hours=24)
    result = await db.execute(
        select(HealthCheck)
        .where(HealthCheck.status != HealthStatus.healthy)
        .where(HealthCheck.checked_at >= since)
        .order_by(HealthCheck.checked_at.desc())
        .limit(50)
    )
    incidents = result.scalars().all()

    # Fetch service names
    service_ids = list({i.service_id for i in incidents})
    services_result = await db.execute(
        select(Service).where(Service.id.in_(service_ids))
    )
    services_map = {s.id: s.name for s in services_result.scalars().all()}

    if not incidents:
        return {
            "summary": "All services have been healthy in the last 24 hours. No incidents to report."
        }

    # Build incident description for the prompt
    lines = []
    for inc in incidents:
        name = services_map.get(inc.service_id, f"Service {inc.service_id}")
        ts = inc.checked_at.strftime("%H:%M UTC")
        latency = f"{inc.latency_ms}ms" if inc.latency_ms else "N/A"
        err = f" — {inc.error_message}" if inc.error_message else ""
        lines.append(f"- {name}: {inc.status.value} at {ts}, latency {latency}{err}")

    incident_text = "\n".join(lines)

    prompt = f"""You are a site reliability engineer summarizing recent incidents.
Here are the non-healthy service checks from the last 24 hours:

{incident_text}

Write a concise 2-3 sentence incident summary for a dashboard. 
Mention which services were affected, the nature of the issues, and any patterns.
Be factual and professional. Do not use bullet points. Do not include a title or label at the start. Begin directly with the summary."""

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": settings.ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": "claude-haiku-4-5",
                "max_tokens": 256,
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=30.0,
        )
        data = response.json()

        if "content" not in data:
            raise HTTPException(status_code=500, detail=f"Anthropic API error: {data}")

        summary = data["content"][0]["text"]

    return {"summary": summary}
