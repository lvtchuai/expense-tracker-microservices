# Expense Tracker — Microservices

A personal expense tracker built as microservices, designed as a Kubernetes-deployment portfolio project.

## Architecture

```
        ┌──────────────┐        ┌─────────────────────┐
client  │ auth-service │        │ transaction-service │
  ──────▶  :3001       │        │  :3002              │
        │  Postgres    │        │  Postgres           │
        └──────┬───────┘        └──────────┬──────────┘
               │  issues JWT               │  verifies same JWT
               └──────── shared JWT_SECRET ┘  (stateless, no cross-call)
                                            │
                            emit "transaction.created"
                                            │
                                     ┌──────▼───────┐
                     ┌──────────────▶│   RabbitMQ   │  :5672 (UI :15672)
                     │               └──┬────────┬──┘
   POST /import      │       consume    │        │ consume
   (CSV) enqueues ───┘   ┌──────────────▼──┐  ┌──▼──────────────────┐
   1 msg/row             │  import-worker  │  │ notification-service │ :3003
                         │  :3004          │  │  (sends notifs)     │
                         │  validate row,  │  └─────────────────────┘
                         │  create tx via  │
                         │  internal API ──┼──▶ transaction-service
                         └─────────────────┘    (owns the DB, re-emits event)

   GET /reports/monthly ──▶ report-service :3005 ──internal API──▶ transaction-service
                            (CPU-heavy in-process rollup; never touches the DB)
```

**Design choices**
- **Database per service** — `auth` and `transactions` are separate Postgres instances; no shared tables, no cross-DB FKs.
- **Stateless auth** — auth-service signs a JWT; transaction-service verifies it with the same `JWT_SECRET`, so it authenticates requests without calling auth-service.
- **Async events** — transaction-service emits `transaction.created` to RabbitMQ; notification-service consumes it. No direct service-to-service call — the producer doesn't know or wait for consumers. Emit is fire-and-forget: a broker outage logs a warning but never fails the write.
- **Async CSV import** — `POST /transactions/import` parses the CSV and enqueues **one message per row**; import-worker consumes them, validates, and creates each transaction by calling transaction-service's API. Bad rows are dropped (nack, no requeue); transient failures (transaction-service down) are requeued (nack + requeue). This is the queue-depth workload KEDA will autoscale in Phase 4.
- **Service-to-service auth** — import-worker and report-service aren't users, so they authenticate to transaction-service with a shared `INTERNAL_API_KEY` header (+ `x-internal-user-id`) instead of a JWT. `UserOrInternalGuard` accepts either on the same endpoint.
- **Reports over the API, not the DB** — report-service verifies the user's JWT, then reads that user's transactions from transaction-service via the internal API and aggregates in-process. It never touches the transactions DB — database-per-service stays intact, and the CPU-bound rollup is the workload HPA scales on.
- **Shared event contract** — event names + payload types live in `libs/common/events`, so producers and consumers can't drift.
- **NestJS monorepo** — `apps/*` are deployable services, `libs/common` holds shared code (health checks, JWT guard, event contracts).

## Tech stack
NestJS 10 · TypeScript · TypeORM · PostgreSQL 16 · RabbitMQ 3.13 · Passport-JWT · Docker Compose

## Services & ports
| Service | Port | Type | Scales on (Phase 4) |
|---|---|---|---|
| auth-service | 3001 | HTTP + Postgres | replicas |
| transaction-service | 3002 | HTTP + Postgres, event producer | replicas |
| notification-service | 3003 | RabbitMQ consumer | queue depth |
| import-worker | 3004 | RabbitMQ consumer | KEDA (queue depth) |
| report-service | 3005 | HTTP, CPU-heavy | HPA (CPU) |

## Layout
```
apps/
  auth-service/         register, login, JWT, /auth/me
  transaction-service/  CRUD + summary + CSV import endpoint, emits events
  notification-service/ RabbitMQ consumer, sends notifications
  import-worker/        RabbitMQ consumer, validates CSV rows → creates txns
  report-service/       CPU-heavy monthly rollups, calls transaction-service API
libs/
  common/               health, JWT guard, internal-auth guard, @CurrentUser, event contracts
Dockerfile              shared multi-stage build (--build-arg APP=…)
docker-compose.yml      5 services + 2 Postgres + RabbitMQ, healthchecks
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
| transaction | POST | `/api/transactions` | Bearer or internal |
| transaction | POST | `/api/transactions/import` | Bearer (CSV body) |
| transaction | GET | `/api/transactions` | Bearer |
| transaction | GET | `/api/transactions/summary` | Bearer |
| report | GET | `/api/reports/monthly?year=&month=` | Bearer |
| transaction | GET | `/api/transactions/:id` | Bearer |
| transaction | DELETE | `/api/transactions/:id` | Bearer |
| all | GET | `/health`, `/health/ready` | – |

Creating a transaction emits `transaction.created` → notification-service logs a notification.
Watch it: `docker compose logs -f notification-service`.
RabbitMQ management UI: http://localhost:15672 (guest/guest).

### CSV import (async via import-worker)

```bash
# CSV columns: type,amount,category,occurredAt[,note]  (header row optional)
printf 'type,amount,category,occurredAt,note
expense,45.90,groceries,2026-07-01T10:00:00Z,weekly shop
income,3000,salary,2026-07-01T09:00:00Z,june pay
expense,7.50,transport,2026-07-03T18:00:00Z,bus\n' | \
curl -s localhost:3002/api/transactions/import \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: text/csv' --data-binary @-
# → {"enqueued":3}; watch: docker compose logs -f import-worker
```

### Monthly report

```bash
curl -s "localhost:3005/api/reports/monthly?year=2026&month=7" \
  -H "authorization: Bearer $TOKEN"
# → totals, byCategory, dailyExpense[], topExpenseCategories, comparedToPrevMonth
# report-service fetches the month's transactions from transaction-service
# (internal API) and aggregates in-process — the CPU workload HPA scales on.
```

## Roadmap
- **Phase 1 ✅** auth + transaction services, docker-compose
- **Phase 2 ✅** event-driven + async workers
  - ✅ RabbitMQ + notification-service (event consumer)
  - ✅ import-worker (parse CSV → async bulk transactions, per-row queue, retry/drop semantics)
  - ✅ report-service (monthly rollups, CPU-heavy; calls transaction-service API)
- **Phase 3** production Dockerfiles, migrations (drop `synchronize`), health hardening
- **Phase 4** Kubernetes: Deployments, Services, Ingress+TLS, HPA (report-service), KEDA (import-worker), CronJob
- **Phase 5** Prometheus/Grafana, GitHub Actions + GitOps

> Note: `synchronize: true` is on for Phase 1 convenience. Switch to TypeORM migrations before Phase 3/K8s.
