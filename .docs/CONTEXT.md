# Project Context: Epics & User Stories (Roadmap)

This document outlines the development roadmap for the **Bun-Native Email Microservice**.
Use this context to guide code generation step-by-step.

## Epic 1: Foundation & Infrastructure
**Goal:** Initialize the Bun project, set up the database schema, and prepare the local development environment.

* **Story 1.1: Project Scaffold (Bun)**
    * **As a** Developer,
    * **I want** to initialize a Bun project with `elysia`, `drizzle-orm`, and `bullmq`, adhering to the structure in `PROJECT_STRUCTURE.md`.
    * **So that** I have a clean base to start coding.
* **Story 1.2: Docker Infrastructure**
    * **As a** System,
    * **I need** a `compose.yml` file running PostgreSQL 15 and Redis 7 (with persistence),
    * **So that** the application has the necessary backing services.
* **Story 1.3: Database Schema & Migration**
    * **As a** Developer,
    * **I want** to define the `clients` and `messages` tables using Drizzle ORM and generate the initial SQL migration,
    * **So that** the data structure is ready for the API.

## Epic 2: Core API & Authentication
**Goal:** Build the REST API entry point (`src/api`) and secure it.

* **Story 2.1: Elysia Server Setup**
    * **As a** Developer,
    * **I want** to configure the Elysia server with basic middleware (Error handling, JSON parsing),
    * **So that** it can accept HTTP requests.
* **Story 2.2: Client Management (CRUD)**
    * **As an** Admin,
    * **I want** internal utilities (or endpoints) to create API Keys and Hash Secrets for new clients,
    * **So that** I can onboard users manually.
* **Story 2.3: Security Middleware**
    * **As a** System,
    * **I need** a middleware that validates `X-Api-Key`, checks the Secret Hash, and enforces Rate Limiting (Token Bucket in Redis),
    * **So that** the API is protected against abuse and unauthorized access.

## Epic 3: The Template Engine (Lazy Compilation)
**Goal:** Implement the "Just-in-Time" compilation logic in `src/lib/engine`.

* **Story 3.1: The Builder (Bun.build)**
    * **As a** System,
    * **I want** a function that takes a source path (`.tsx`) and compiles it to a destination path (`.js`) using `Bun.build`,
    * **So that** React code becomes executable JavaScript.
* **Story 3.2: Distributed Locking (Redis)**
    * **As a** System,
    * **I need** to acquire a Redis Lock before compiling any template,
    * **So that** multiple concurrent requests don't corrupt the file system by writing to the same file simultaneously.
* **Story 3.3: The Renderer (Timeout Protected)**
    * **As a** Developer,
    * **I want** to load the compiled module, inject `props`, and render it to HTML, enforcing a strict execution timeout (e.g., 200ms),
    * **So that** I can generate email bodies safely without freezing the worker.

## Epic 4: The Sending Pipeline (Worker)
**Goal:** Process email jobs asynchronously using BullMQ.

* **Story 4.1: Queue Producer**
    * **As the** API,
    * **I want** to push a job `email:send` to Redis when `POST /v1/send` is called, returning a `202 Accepted` immediately,
    * **So that** the API remains non-blocking and high-performance.
* **Story 4.2: Provider Interface & SMTP**
    * **As a** Developer,
    * **I want** a generic `EmailProvider` interface and a concrete `SmtpProvider` implementation,
    * **So that** the business logic doesn't depend on a specific vendor.
* **Story 4.3: Circuit Breaker Logic**
    * **As a** System,
    * **I need** a manager that monitors provider failures. If the Primary Provider fails X times, it should automatically switch to the Secondary Provider,
    * **So that** email delivery continues even if a provider goes down.
* **Story 4.4: Worker Processor**
    * **As a** Worker,
    * **I want** to consume jobs from BullMQ, invoke the Template Engine, and send the email via the active Provider,
    * **So that** the email actually reaches the user.

## Epic 5: Observability & Feedback
**Goal:** Track what is happening inside the system.

* **Story 5.1: OpenTelemetry Tracing**
    * **As a** Developer,
    * **I want** a `TraceID` generated at the API level to be propagated to the Worker logs,
    * **So that** I can debug a specific request across the async boundary.
* **Story 5.2: Inbound Webhooks**
    * **As a** System,
    * **I want** an endpoint `POST /webhooks/:provider` that receives events (Delivered/Bounced), finds the original message, and updates its status in the DB,
    * **So that** we have accurate delivery data.

## Epic 6: Production Readiness
**Goal:** Prepare the artifact for deployment.

* **Story 6.1: Multi-Role Entrypoint**
    * **As a** DevOps,
    * **I want** `src/index.ts` to read the `SERVICE_ROLE` env var and decide whether to start the API, the Worker, or both,
    * **So that** I can use the same Docker image for different scaling needs.
* **Story 6.2: Docker Optimization**
    * **As a** DevOps,
    * **I want** a multi-stage `Dockerfile` that produces a minimal image containing only the Bun runtime and necessary source files,
    * **So that** deployments are fast and lightweight.