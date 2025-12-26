# Database Schema Reference

This document serves as the **Source of Truth** for the data model.
The implementation will be done using **Drizzle ORM** in TypeScript, but the logic must strictly follow these SQL definitions.

## 1. Overview
* **Dialect:** PostgreSQL 15+
* **Extensions:** `uuid-ossp` (for UUID generation)

## 2. Tables

### 2.1. Table: `clients`
Stores the developers or systems consuming the API.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `PK`, `DEFAULT uuid_generate_v4()` | Unique identifier for the client. |
| `name` | `varchar(255)` | `NOT NULL` | Human-readable name (e.g., "Acme Corp"). |
| `api_key_prefix` | `varchar(32)` | `NOT NULL` | The first 8 chars of the key for identification. |
| `api_secret_hash` | `varchar(255)` | `NOT NULL` | Bcrypt or Argon2 hash of the secret. |
| `rate_limit` | `int` | `DEFAULT 600` | Allowed requests per minute (for Token Bucket). |
| `quota_limit` | `int` | `DEFAULT 10000` | Monthly email sending quota. |
| `quota_usage` | `int` | `DEFAULT 0` | Current usage for the billing cycle. |
| `status` | `varchar(20)` | `DEFAULT 'active'` | Enum: `active`, `suspended`. |
| `created_at` | `timestamp` | `DEFAULT NOW()` | |
| `updated_at` | `timestamp` | `DEFAULT NOW()` | |

**Indexes:**
* `idx_clients_api_key_prefix` on `api_key_prefix` (for fast lookup during auth).

---

### 2.2. Table: `messages`
The immutable log of every email transaction.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `PK`, `DEFAULT uuid_generate_v4()` | Unique message ID (returned to the user). |
| `client_id` | `uuid` | `FK -> clients.id`, `NOT NULL` | Who sent this email. |
| `trace_id` | `varchar(128)` | `NULLABLE` | OpenTelemetry Trace ID for debugging. |
| `template_name` | `varchar(255)` | `NOT NULL` | Name of the template used (e.g., "welcome-v1"). |
| `recipient` | `varchar(255)` | `NOT NULL` | To address. |
| `subject` | `varchar(255)` | `NULLABLE` | Subject line (captured after render). |
| `status` | `varchar(50)` | `NOT NULL` | Enum (see below). |
| `provider` | `varchar(50)` | `NULLABLE` | Which provider handled it (e.g., "aws-ses"). |
| `provider_msg_id` | `varchar(255)` | `NULLABLE` | External ID given by the provider (for webhooks). |
| `attempts` | `int` | `DEFAULT 0` | Number of send attempts (for retries). |
| `error_message` | `text` | `NULLABLE` | Last known error if failed. |
| `sent_at` | `timestamp` | `NULLABLE` | When the provider accepted the email. |
| `created_at` | `timestamp` | `DEFAULT NOW()` | |
| `updated_at` | `timestamp` | `DEFAULT NOW()` | |

**Status Enum Values:**
* `queued`: Accepted by API, waiting in Redis.
* `processing`: Worker has picked up the job.
* `sent`: Successfully handed off to the Provider (SMTP/API).
* `delivered`: (Async) Provider confirmed delivery via Webhook.
* `bounced`: (Async) Provider reported a bounce.
* `failed`: Permanent failure after max retries or render error.

**Indexes:**
* `idx_messages_client_id` (For filtering logs by client).
* `idx_messages_provider_msg_id` (Crucial for fast Webhook updates).
* `idx_messages_created_at` (For cleanup/retention policies).

---

## 3. Reference SQL (DDL)

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE client_status AS ENUM ('active', 'suspended');
CREATE TYPE message_status AS ENUM ('queued', 'processing', 'sent', 'delivered', 'bounced', 'failed');

CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    api_key_prefix VARCHAR(32) NOT NULL,
    api_secret_hash VARCHAR(255) NOT NULL,
    rate_limit INT DEFAULT 600,
    quota_limit INT DEFAULT 10000,
    quota_usage INT DEFAULT 0,
    status client_status DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    trace_id VARCHAR(128),
    template_name VARCHAR(255) NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    status message_status NOT NULL DEFAULT 'queued',
    provider VARCHAR(50),
    provider_msg_id VARCHAR(255),
    attempts INT DEFAULT 0,
    error_message TEXT,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_clients_api_key_prefix ON clients(api_key_prefix);
CREATE INDEX idx_messages_client_id ON messages(client_id);
CREATE INDEX idx_messages_provider_msg_id ON messages(provider_msg_id);