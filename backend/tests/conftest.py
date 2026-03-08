import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import text

from app.main import app
from app.database import Base, get_db
from app.models.user import User
from app.core.security import hash_password

TEST_DATABASE_URL = (
    "postgresql+asyncpg://tracker:tracker@localhost:5432/service_reliability_test"
)


@pytest_asyncio.fixture
async def db_engine():
    engine = create_async_engine(TEST_DATABASE_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.execute(
            text(
                "TRUNCATE TABLE health_checks, services, users RESTART IDENTITY CASCADE"
            )
        )
    await engine.dispose()


@pytest_asyncio.fixture
async def client(db_engine):
    session_factory = async_sessionmaker(db_engine, expire_on_commit=False)

    async def override_get_db():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def auth_client(db_engine):
    session_factory = async_sessionmaker(db_engine, expire_on_commit=False)

    async def override_get_db():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        async with session_factory() as session:
            session.add(
                User(
                    username="testusername",
                    hashed_password=hash_password("testpassword"),
                )
            )
            await session.commit()
        await ac.post(
            "/auth/login", json={"username": "testusername", "password": "testpassword"}
        )
        yield ac
    app.dependency_overrides.clear()
