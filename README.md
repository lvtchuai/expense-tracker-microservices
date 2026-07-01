# Expense Tracker — Microservices

A personal expense tracker built as microservices, designed as a Kubernetes-deployment portfolio project.

## Architecture (Phase 1)

```
        ┌──────────────┐        ┌─────────────────────┐
client  │ auth-service │        │ transaction-service │
  ──────▶  :3001       │        │  :3002              │
        │  Postgres    │        │  Postgres           │
        └──────┬───────┘        └──────────┬──────────┘
               │  issues JWT               │  verifies same JWT
               └──────── shared JWT_SECRET ┘  (stateless, no cross-call)
```

**Design choices**
- **Database per service** — `auth` and `transactions` are separate Postgres instances; no shared tables, no cross-DB FKs.
- **Stateless auth** — auth-service signs a JWT; transaction-service verifies it with the same `JWT_SECRET`, so it authenticates requests without calling auth-service.
- **NestJS monorepo** — `apps/*` are deployable services, `libs/common` holds shared code (health checks, JWT guard).

## Tech stack
NestJS 10 · TypeScript · TypeORM · PostgreSQL 16 · Passport-JWT · Docker Compose

## Layout
```
apps/
  auth-service/         register, login, JWT, /auth/me
  transaction-service/  CRUD transactions + summary, JWT-guarded
libs/
  common/               health module, JWT guard, @CurrentUser decorator
Dockerfile              shared multi-stage build (--build-arg APP=…)
docker-compose.yml      2 services + 2 Postgres, healthchecks
```

## Run locally

```bash
cp .env.example .env
docker compose up --build
```

Or without Docker (needs two local Postgres DBs `auth` and `transactions`):

```bash
npm install
npm run start:auth:dev        # :3001
npm run start:transaction:dev # :3002
```

## API quickstart

```bash
# 1. Register → returns accessToken
curl -s localhost:3001/api/auth/register \
  -H 'content-type: application/json' \
  -d '{"email":"me@example.com","password":"password123","displayName":"Me"}'

TOKEN=... # copy accessToken from above

# 2. Create a transaction (auth via shared JWT)
curl -s localhost:3002/api/transactions \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"type":"expense","amount":12.50,"category":"food","occurredAt":"2026-07-01T10:00:00Z"}'

# 3. Summary (income / expense / balance)
curl -s localhost:3002/api/transactions/summary -H "authorization: Bearer $TOKEN"
```

### Endpoints
| Service | Method | Path | Auth |
|---|---|---|---|
| auth | POST | `/api/auth/register` | – |
| auth | POST | `/api/auth/login` | – |
| auth | GET  | `/api/auth/me` | Bearer |
| transaction | POST | `/api/transactions` | Bearer |
| transaction | GET | `/api/transactions` | Bearer |
| transaction | GET | `/api/transactions/summary` | Bearer |
| transaction | GET | `/api/transactions/:id` | Bearer |
| transaction | DELETE | `/api/transactions/:id` | Bearer |
| both | GET | `/health`, `/health/ready` | – |

## Roadmap
- **Phase 1 ✅** auth + transaction services, docker-compose
- **Phase 2** RabbitMQ, import-worker (CSV), notification-service, report-service
- **Phase 3** production Dockerfiles, health/readiness hardening
- **Phase 4** Kubernetes: Deployments, Services, Ingress+TLS, HPA, KEDA, CronJob
- **Phase 5** Prometheus/Grafana, GitHub Actions + GitOps

> Note: `synchronize: true` is on for Phase 1 convenience. Switch to TypeORM migrations before Phase 3/K8s.
