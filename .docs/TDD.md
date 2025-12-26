# Technical Design Document (TDD): Bun-Native Email Service

## 1. System Overview
We are building a unified, high-performance transactional email service running entirely on the **Bun Runtime**. The system allows developers to send emails using **React (TSX) & Tailwind** templates without setting up their own build pipelines.

The architecture follows a **"Modular Monolith"** approach: a single codebase and Docker image capable of performing multiple roles (API, Worker, Watcher) based on configuration.

## 2. Architecture & Patterns

### 2.1. The "Single Image, Multi-Role" Pattern
The application entry point (`src/index.ts`) determines which sub-systems to start based on the `SERVICE_ROLE` environment variable:
* `API`: Starts the REST API server.
* `WORKER`: Starts the BullMQ processor for email sending.
* `DEV`: Starts both API + Worker + File Watcher (for local development).

### 2.2. Template Engine Strategy (Lazy Compilation)
Instead of pre-building via CI/CD, we use a **Just-in-Time** compilation strategy with distributed coordination:
1.  **Check RAM:** Is the template component in the memory `Map`?
2.  **Check Disk:** Is the compiled `.js` file present and fresh?
3.  **Coordination:** If compilation is needed, acquire a **Redis Lock**. Only one instance compiles; others wait.
4.  **Build:** Use `Bun.build` to transpile `.tsx` -> `.js` (ESM).
5.  **Safety:** Render logic is wrapped in a strict timeout to prevent CPU exhaustion.

### 2.3. Resiliency
* **Circuit Breaker:** Logic to detect if the Primary Email Provider is failing and automatically switch to a Backup Provider.
* **Queueing:** All email requests are offloaded to Redis (BullMQ) to ensure non-blocking API responses.

## 3. Technology Stack (Hard Constraints)

### 3.1. Core Runtime & Language
* **Runtime:** `Bun` (latest).
* **Language:** TypeScript (Strict mode).
* **Package Manager:** `bun install`.

### 3.2. Libraries
* **Web Framework:** `ElysiaJS` (Chosen for performance on Bun) or `Hono`.
* **Database ORM:** `Drizzle ORM` (Lightweight, SQL-like, high performance).
* **Queue:** `BullMQ` (Redis-based).
* **Validation:** `TypeBox` (Native to Elysia) or `Zod`.
* **Templating:** `@react-email/components`, `tailwindcss`.
* **Distributed Locking:** `ioredis` (used with simple SET NX logic or `redlock`).
* **Observability:** `@opentelemetry/sdk-node` (Auto-instrumentation).

### 3.3. Infrastructure
* **Database:** PostgreSQL 15+.
* **Broker:** Redis 7+ (Persistence enabled).

## 4. Data Model (Schema Design)

### 4.1. Table: `clients`
* `id` (UUID, PK)
* `name` (VARCHAR)
* `api_key_prefix` (VARCHAR)
* `api_secret_hash` (VARCHAR)
* `quota_limit` (INT)
* `rate_limit` (INT) - Requests per minute.
* `status` (ENUM: active, suspended)

### 4.2. Table: `messages` (Logs)
* `id` (UUID, PK)
* `client_id` (FK)
* `trace_id` (VARCHAR) - OpenTelemetry Trace ID.
* `template_name` (VARCHAR)
* `recipient` (VARCHAR)
* `subject` (VARCHAR)
* `status` (ENUM: queued, sent, delivered, bounced, failed, spam)
* `provider` (VARCHAR) - e.g., "aws-ses", "smtp-primary".
* `provider_msg_id` (VARCHAR) - External ID for reconciliation.
* `attempts` (INT)
* `created_at` (TIMESTAMP)
* `updated_at` (TIMESTAMP)

## 5. Core Workflows & Logic

### 5.1. Ingestion (API Role)
1.  **Auth Middleware:** Validate `X-Api-Key` against DB hash. Check Redis Rate Limiter.
2.  **Validation:** Validate payload `props` against schema (if provided).
3.  **Trace:** Start an OpenTelemetry span.
4.  **Enqueue:** Push job to `email_queue` with `trace_id`.
5.  **Response:** Return `202 Accepted` + `message_id`.

### 5.2. Processing (Worker Role)
1.  **Job Fetch:** BullMQ worker picks up job.
2.  **Rendering (The "Engine"):**
    * Call `TemplateEngine.render(name, props)`.
    * *Engine Internals:* Checks Cache -> Redis Lock -> `Bun.build` -> `import()`.
    * *Timeout:* Abort if render takes > 200ms.
3.  **Sending:**
    * Select active Provider (Check Circuit Breaker status).
    * Send email.
4.  **Handling Result:**
    * *Success:* Update DB `messages` -> `sent`.
    * *Fail:*
        * If eligible for retry: throw error (BullMQ retries with backoff).
        * If circuit breaker threshold reached: Open circuit, switch provider.
        * If max retries reached: Move to DLQ, update DB -> `failed`.

### 5.3. Webhooks (API Role)
1.  Endpoint: `POST /webhooks/:provider`.
2.  Normalize payload (map Provider status to System status).
3.  Find message by `provider_msg_id`.
4.  Update status (e.g., `sent` -> `delivered` or `bounced`).

## 6. Project Structure

```text
/
├── Dockerfile                  # Multi-stage build (Source -> Dist)
├── compose.yml                 # Local dev infra
├── src/
│   ├── index.ts                # Entrypoint (Role Switcher)
│   ├── config.ts               # Env vars (Type-safe)
│   ├── api/                    # ElysiaJS Server
│   │   ├── controllers/
│   │   ├── middleware/         # Auth, RateLimit
│   │   └── routes.ts
│   ├── worker/                 # BullMQ Processor
│   │   └── email.processor.ts
│   ├── lib/
│   │   ├── engine/             # Template Logic
│   │   │   ├── builder.ts      # Bun.build wrapper
│   │   │   ├── locker.ts       # Redis Lock logic
│   │   │   └── renderer.ts     # React render
│   │   ├── providers/          # SMTP, SES adapters (Circuit Breaker here)
│   │   └── db/                 # Drizzle setup
│   └── db/                     # Schema definitions
├── templates/                  # (Dev Only) Local templates source
└── .docs/                      # Context documentation
```

## 7. Configuration Variables

* SERVICE_ROLE: "API" | "WORKER" | "DEV"
* DATABASE_URL: Postgres Connection String
* REDIS_URL: Redis Connection String
* TEMPLATES_SOURCE_DIR: Default /app/templates-src
* TEMPLATES_DIST_DIR: Default /app/templates-dist
* SMTP_HOST, SMTP_USER, SMTP_PASS...

