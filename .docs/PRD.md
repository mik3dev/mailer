# Product Requirements Document (PRD): Bun-Based Email Microservice

## 1. Executive Summary
We are developing a high-performance, self-hosted Transactional Email Microservice designed for the modern developer. Built on the **Bun runtime**, this system acts as a robust abstraction layer over email providers (SMTP, SES, SendGrid).

Its core value proposition is the **Developer Experience (DX)**: it allows developers to write email templates using **React (TSX) and Tailwind CSS**, which are dynamically compiled and rendered by the service, eliminating the need for external build pipelines or legacy HTML coding.

## 2. Problem Statement
* **Legacy DX:** Creating responsive HTML emails is painful and error-prone.
* **Vendor Lock-in:** Tightly coupling code to a specific provider (e.g., AWS SDK) makes switching difficult.
* **Performance:** Synchronous email sending blocks application threads.
* **Operational Complexity:** Managing build pipelines for email templates adds unnecessary friction to deployments.

## 3. User Personas
* **The API Consumer (Dev):** Wants to send an email by strictly defining a template name and a JSON payload. Expects the system to "just work" when mounting a folder of `.tsx` files.
* **The Operator (DevOps):** Wants a single Docker image that can be deployed as a monolith or scaled horizontally without configuring complex file synchronization.

## 4. Functional Requirements

### 4.1. Core API & Authentication
* **Runtime:** The system must run on **Bun** using TypeScript.
* **Endpoints:** RESTful API for sending emails (`POST /v1/send`).
* **Security:**
    * Authentication via `X-Api-Key` and `X-Api-Secret`.
    * Secrets must be hashed (Argon2/Bcrypt) in storage.
* **Rate Limiting:** Implementation of Token Bucket algorithm (backed by Redis) to limit requests per client/minute.

### 4.2. Advanced Template Engine (Lazy Compilation)
* **Source Format:** Support for `.tsx` (React Email) and Tailwind CSS.
* **Storage Strategy:**
    * **Source Volume (Read-Only):** Where user mounts raw templates.
    * **Dist Volume (Ephemeral):** Where the system caches compiled `.js` files.
* **Compilation Mechanism (Production):**
    * **Just-in-Time:** Templates are compiled only when requested.
    * **Distributed Locking:** Use **Redis Locks** to coordinate compilation across multiple replicas. If 5 nodes request a new template simultaneously, only one compiles; the others wait.
    * **Caching:** Compiled templates must be cached in RAM (LRU) to minimize disk I/O.
* **Safety (Improvement #3):** The rendering engine must enforce a strict **Timeout** (e.g., 200ms) per render to prevent "infinite loop" attacks or CPU exhaustion.

### 4.3. Sending Engine & Provider Resiliency
* **Provider Agnostic:** Interface-based design to support multiple providers (SMTP, AWS SES, SendGrid, Mailgun).
* **Default Provider:** Generic SMTP.
* **Resiliency (Improvement #4):** Implement a **Failover/Circuit Breaker** mechanism.
    * *Scenario:* If the Primary Provider (e.g., SES) fails X times or times out, the system must automatically switch to a Secondary Provider (e.g., SMTP) for a defined cooldown period.
* **Queuing:** Asynchronous processing using **BullMQ** (Redis).

### 4.4. Feedback Loop & Webhooks (Improvement #5)
* **Event Ingestion:** The system must expose endpoints (e.g., `/webhooks/sendgrid`, `/webhooks/ses`) to receive delivery events from providers.
* **Status Reconciliation:**
    * Convert external events (Delivered, Bounced, Spam) into internal standard statuses.
    * Update the `messages` table in the database.
* **Visibility:** Clients must be able to query the final status of a message ID to know if it actually arrived.

### 4.5. Client Management
* **CRUD:** Internal API or CLI tools to Register, Update, and Suspend clients.
* **Quotas:** Ability to define monthly sending limits per client.

## 5. Non-Functional Requirements

### 5.1. Observability (Improvement #6)
* **Distributed Tracing:** Implement **OpenTelemetry**.
    * A `Trace ID` must be generated at the API level, passed through the Redis Queue, and logged by the Worker.
    * Allows debugging the full lifecycle of a request across async boundaries.
* **Structured Logging:** All logs must be JSON formatted for easy ingestion by tools like Datadog/Loki.

### 5.2. Infrastructure & Deployment
* **Single Image Strategy:** A single Docker image capable of acting as API, Worker, or Watcher (dev mode) via environment variables (`SERVICE_ROLE`).
* **State:** The service must be stateless (except for the ephemeral compiled cache). Persistence relies strictly on Postgres and Redis.
* **Cold Start:** Leveraging Bun for sub-millisecond startup times.

### 5.3. Reliability
* **Dead Letter Queue (DLQ):** Failed jobs after N retries must be moved to a DLQ for manual inspection.
* **At-Least-Once Delivery:** Ensure emails are not lost during service restarts.

## 6. Constraints & Assumptions
* **Database:** PostgreSQL 15+.
* **Cache/Broker:** Redis 7+.
* **Volumes:** The user is responsible for mounting the `./templates` volume.
* **Node Compatibility:** While running on Bun, libraries used must be compatible with Node.js APIs (like `fs`, `path`).

## 7. Future Scope (Post-MVP)
* **Outbound Webhooks:** Notify the client's URL when an email bounces.
* **Batch Sending:** Endpoint for bulk emails.
* **UI Dashboard:** A frontend to view logs and manage API keys.