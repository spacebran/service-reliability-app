import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def test_login_wrong_password(client: AsyncClient):
    response = await client.post(
        "/auth/login", json={"username": "nobody", "password": "wrong"}
    )
    assert response.status_code == 401


async def test_get_services_unauthenticated(client: AsyncClient):
    response = await client.get("/services")
    assert response.status_code == 401


async def test_login_success(client: AsyncClient, db_engine):
    from sqlalchemy.ext.asyncio import async_sessionmaker
    from app.models.user import User
    from app.core.security import hash_password

    session_factory = async_sessionmaker(db_engine, expire_on_commit=False)
    async with session_factory() as session:
        session.add(
            User(username="testusername", hashed_password=hash_password("testpassword"))
        )
        await session.commit()

    response = await client.post(
        "/auth/login", json={"username": "testusername", "password": "testpassword"}
    )
    assert response.status_code == 200


async def test_create_and_list_services(auth_client: AsyncClient):
    payload = {
        "name": "My Service",
        "url": "https://example.com",
        "environment": "production",
        "check_interval_seconds": 60,
    }
    create = await auth_client.post("/services", json=payload)
    assert create.status_code == 201
    data = create.json()
    assert data["name"] == "My Service"
    assert data["environment"] == "production"

    listing = await auth_client.get("/services")
    assert listing.status_code == 200
    assert len(listing.json()) == 1


async def test_update_service(auth_client: AsyncClient):
    create = await auth_client.post(
        "/services",
        json={
            "name": "Svc",
            "url": "https://example.com",
            "environment": "staging",
            "check_interval_seconds": 30,
        },
    )
    service_id = create.json()["id"]

    update = await auth_client.put(
        f"/services/{service_id}",
        json={"name": "Svc Updated", "expected_version": "2.0.0"},
    )
    assert update.status_code == 200
    assert update.json()["name"] == "Svc Updated"
    assert update.json()["expected_version"] == "2.0.0"


async def test_delete_service(auth_client: AsyncClient):
    create = await auth_client.post(
        "/services",
        json={
            "name": "ToDelete",
            "url": "https://example.com",
            "environment": "development",
            "check_interval_seconds": 60,
        },
    )
    service_id = create.json()["id"]

    delete = await auth_client.delete(f"/services/{service_id}")
    assert delete.status_code == 204

    listing = await auth_client.get("/services")
    assert listing.json() == []


async def test_service_not_found(auth_client: AsyncClient):
    response = await auth_client.get("/services/99999/history")
    assert response.status_code == 404
