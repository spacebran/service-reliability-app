# Service Reliability Dashboard

A full-stack service reliability monitoring application. Periodically polls configured HTTP endpoints, tracks health status and latency, detects version drift, and exposes results through an authenticated dashboard.

Built as a take-home assessment using Anthropic's stack: React + TypeScript frontend, FastAPI backend, PostgreSQL database, containerised with Docker, deployed to AWS EC2 via GitHub Actions CI/CD.

---

## Tech Stack

| Layer      | Technology                                                           |
| ---------- | -------------------------------------------------------------------- |
| Frontend   | React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, Recharts   |
| Backend    | Python 3.12, FastAPI, SQLAlchemy 2 (async), Pydantic v2, APScheduler |
| Database   | PostgreSQL 16                                                        |
| Migrations | Alembic                                                              |
| Testing    | pytest + pytest-asyncio (backend)                                    |
| CI/CD      | GitHub Actions                                                       |
| Deployment | AWS EC2, Docker, Docker Compose                                      |

---

## Features

- Polls configured HTTP services on a per-service interval
- Classifies health as **healthy** (2xx, <2000ms), **degraded** (2xx, ≥2000ms), or **down** (non-2xx or unreachable)
- Detects **version drift** when a service's reported version differs from its expected version
- Groups services by environment (production, staging, development)
- Live dashboard with 30s auto-refresh, latency sparklines, and health history
- Services configurable via `services.yaml` seed file or through the dashboard UI
- JWT authentication with HTTP-only cookies

---

## Project Structure

```
service-reliability-app/
├── frontend/               # React + TypeScript (Vite)
│   ├── src/
│   │   ├── api/            # Axios API layer
│   │   ├── components/     # Dashboard, ServiceList, ServiceDetail, etc.
│   │   ├── context/        # Auth context
│   │   └── types/          # TypeScript interfaces
│   └── Dockerfile
├── backend/
│   ├── app/
│   │   ├── checker/        # APScheduler polling engine
│   │   ├── core/           # Config, security (JWT, bcrypt)
│   │   ├── models/         # SQLAlchemy models
│   │   ├── routers/        # FastAPI route handlers
│   │   └── schemas/        # Pydantic schemas
│   ├── alembic/            # Database migrations
│   ├── tests/              # pytest suite
│   └── services.yaml       # Seed config
├── docker-compose.yml      # Local development
└── docker-compose.prod.yml # Production
```

---

## Local Development

### Prerequisites

- Docker Desktop
- Node.js 20+
- [uv](https://docs.astral.sh/uv/)

### 1. Start the database

```bash
docker compose up db -d
```

### 2. Run the backend

```bash
cd backend
uv venv
uv pip install -e ".[dev]"
.venv\Scripts\activate        # Windows
source .venv/bin/activate     # macOS/Linux
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

### 3. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:5173 · Backend API docs: http://localhost:8000/docs

### 4. Seed admin user

```bash
cd backend
uv run python -c "
import asyncio
from app.database import AsyncSessionLocal
from app.models.user import User
from app.core.security import hash_password

async def seed():
    async with AsyncSessionLocal() as db:
        db.add(User(username='admin', hashed_password=hash_password('Password@123')))
        await db.commit()

asyncio.run(seed())
"
```

---

## Running Tests

```bash
cd backend
uv run pytest tests/ -v
```

---

## Deployment

---
