# Service Reliability Dashboard

A full-stack service reliability monitoring application.
Periodically calls configured HTTP endpoints, tracks health status and latency, detects version drift, and exposes results through a simple dashboard with auth.

---

## Tech Stack

| Layer      | Technology                                                                   |
| ---------- | ---------------------------------------------------------------------------- |
| Frontend   | React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, Recharts           |
| Backend    | Python 3.12, FastAPI, SQLAlchemy 2 (async), Pydantic v2, APScheduler         |
| Database   | PostgreSQL 16                                                                |
| Migrations | Alembic                                                                      |
| Testing    | pytest + pytest-asyncio (backend), @testing-library/react, vitest (frontend) |
| CI/CD      | GitHub Actions                                                               |
| Deployment | AWS EC2, Docker, Docker Compose                                              |

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

This will seed a user on your local database with credentials: `admin / Password@123`

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

### Backend

Create the test database (one-time setup) while Docker Desktop is running.

```bash
docker exec -it service-reliability-app-db-1 psql -U tracker -c "CREATE DATABASE service_reliability_test;"
```

```bash
cd backend
uv run pytest tests/ -v
```

### Frontend

```bash
cd frontend
npm test
```

---

## Deployment

Deployed to AWS EC2 via GitHub Actions on every push to `main`. The pipeline has three stages:

- Runs tests
- Builds Docker images, pushes to Docker Hub
- Deploy to EC2 instance via SSH

Live demo: **http://3.142.232.149/login** · Credentials: `admin / Password@123`

## Infrastructure & Production Monitoring

### Current Deployment

The application runs on a single AWS EC2 instance (t2.micro) with three Docker containers managed by Docker Compose: a React/nginx frontend on port 80, a FastAPI backend, and PostgreSQL with a persistent named volume.

### Production-Grade Evolution

For a production deployment I would make the following changes:

**Infrastructure**: Move from a single EC2 instance to EKS for container orchestration, enabling horizontal scaling and automatic restarts.
The database would move to RDS PostgreSQL.

**Networking**: I would place the application behind a load balancer, a CDN for static frontend assets, and restrict EC2/ECS security groups to only accept traffic from the LB.

**Monitoring**: Pipe application logs to SIEM of my choice, whatever is being used in the organization (personally Datadog or Dynatrace). I would use the tool to compile metrics, visualize them, and configure automated alerting, for example through PagerDuty.
Alerting boilerplate already exists in the scheduler's warning logs.

**Secrets**: Replace environment variable secrets with AWS Secrets Manager.

**CI/CD**: Add staging environment deployment before production, with smoke tests on the staging URL as a pipeline blocking gate.
Database migrations can run as a separate ECS task before new application versions start.

## AI Assistance

This project was built with assistance from Claude:

- **Architecture & scaffolding**: Architected initial project structure, Docker Compose configuration, Dockerfile setup, and CI/CD pipeline configurations.
- **Boilerplate generation**: Generated boilerplate for models, router patterns, and React component scaffolding.
- **Debugging**: Debugging of asyncpg SSL connection failures, bcrypt/passlib compatibility issues, pytest event loop conflicts.

All generated code was reviewed and understood by myself before use, and modified where appropriate. I used AI as a very capable pair programmer and collaborator.

## Outcome

All requirements in spec were implemented, but I was not able to implement the AI-generated summary on my EC2 deployment. However, it works **locally** but ran out of time to debug the bug in prod.

Addendum for clarification (added this after time limit was up, please feel free to disregard):
The AI-generated incident summary feature is fully implemented and functional locally.
The production deployment encountered an env variable injection issue (of my Anthropic API key) that could not be resolved within the assessment time limit.
The feature and its integration with the Anthropic API can be verified by running the app locally, if you have an Anthropic API key of your own.

<img width="2557" height="1305" alt="image" src="https://github.com/user-attachments/assets/fc4a4545-ce06-486d-804a-a8a9ac4fcb99" />
