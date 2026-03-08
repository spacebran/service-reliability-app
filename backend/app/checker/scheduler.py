import asyncio
import logging
import os
from datetime import datetime, timezone

import aiohttp
import yaml
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.health_check import HealthCheck, HealthStatus
from app.models.service import Service

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

LATENCY_DEGRADED_THRESHOLD_MS = 2000
REQUEST_TIMEOUT_SECONDS = 10


async def check_service(service_id: int) -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Service).where(Service.id == service_id))
        service = result.scalar_one_or_none()
        if not service or not service.is_active:
            return

        start = asyncio.get_event_loop().time()
        status = HealthStatus.down
        latency_ms = None
        actual_version = None
        status_code = None
        error_message = None

        try:
            timeout = aiohttp.ClientTimeout(total=REQUEST_TIMEOUT_SECONDS)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.get(service.url) as resp:
                    elapsed_ms = int((asyncio.get_event_loop().time() - start) * 1000)
                    latency_ms = elapsed_ms
                    status_code = resp.status

                    if 200 <= resp.status < 300:
                        if latency_ms >= LATENCY_DEGRADED_THRESHOLD_MS:
                            status = HealthStatus.degraded
                        else:
                            status = HealthStatus.healthy
                    else:
                        status = HealthStatus.down

                    try:
                        body = await resp.json(content_type=None)
                        if isinstance(body, dict):
                            actual_version = body.get("version")
                    except Exception:
                        pass

        except Exception as exc:
            error_message = str(exc)[:1024]
            status = HealthStatus.down

        health_check = HealthCheck(
            service_id=service.id,
            status=status,
            latency_ms=latency_ms,
            actual_version=actual_version,
            status_code=status_code,
            error_message=error_message,
            checked_at=datetime.now(timezone.utc),
        )
        db.add(health_check)
        await db.commit()
        logger.info("Checked %s → %s (%sms)", service.name, status.value, latency_ms)
        if status == HealthStatus.down:
            logger.warning(
                "ALERT: %s is DOWN — %s",
                service.name,
                error_message or f"HTTP {status_code}",
            )


def schedule_service(service: Service) -> None:
    """Add or replace a polling job for a single service on the running scheduler."""
    job_id = f"service_{service.id}"
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)
    if not service.is_active:
        return
    scheduler.add_job(
        check_service,
        trigger="interval",
        seconds=service.check_interval_seconds,
        id=job_id,
        args=[service.id],
        next_run_time=datetime.now(timezone.utc),
    )


async def _seed_services_if_empty(db) -> None:
    result = await db.execute(select(Service))
    existing = result.scalars().first()
    if existing:
        return

    yaml_path = os.path.join(os.path.dirname(__file__), "..", "..", "services.yaml")
    yaml_path = os.path.normpath(yaml_path)
    if not os.path.exists(yaml_path):
        logger.warning("services.yaml not found at %s", yaml_path)
        return

    with open(yaml_path) as f:
        data = yaml.safe_load(f)

    for svc_data in data.get("services", []):
        service = Service(
            name=svc_data["name"],
            url=svc_data["url"],
            expected_version=svc_data.get("expected_version"),
            environment=svc_data.get("environment", "production"),
            check_interval_seconds=svc_data.get("check_interval_seconds", 60),
        )
        db.add(service)

    await db.commit()
    logger.info("Seeded services from services.yaml")


async def start_scheduler() -> None:
    async with AsyncSessionLocal() as db:
        await _seed_services_if_empty(db)
        result = await db.execute(select(Service).where(Service.is_active == True))  # noqa: E712
        services = result.scalars().all()

    for service in services:
        schedule_service(service)

    scheduler.start()
    logger.info("Scheduler started with %d service(s)", len(services))


async def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
