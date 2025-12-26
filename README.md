# 📧 Mailer Bun - High Performance Email Microservice

A backend-agnostic transactional email service built with **Bun**, **ElysiaJS**, and **React Email**. It features "Just-in-Time" template compilation, distributed locking, and a circuit-breaker pattern for provider failover (SMTP / AWS SES).

## 🚀 Key Features

- **Bun Runtime**: Lightning fast startup and execution.
- **Lazy Compilation**: Write email templates in React (`.tsx`), and they are compiled to JS on-the-fly and cached using distributed locks.
- **Provider Resiliency**: Automatically switches to a secondary provider (e.g., AWS SES) if the primary (SMTP) fails repeatedly.
- **Worker Queue**: Asynchronous email processing using **BullMQ** and **Redis**.
- **Observability**: OpenTelemetry tracing ready and structured JSON logging.
- **License**: MIT Open Source.

[![CI/CD Pipeline](https://github.com/mik3dev/mailer/actions/workflows/ci.yml/badge.svg)](https://github.com/mik3dev/mailer/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🛠️ Prerequisites

- [Bun](https://bun.sh) (v1.0+)
- [Docker](https://www.docker.com/) & Docker Compose

## 🏁 Quick Start

1.  **Install Dependencies**
    ```bash
    bun install
    ```

2.  **Start Infrastructure**
    Starts Postgres, Redis, and MailHog (SMTP Mock for dev).
    ```bash
    docker compose up -d
    ```

3.  **Setup Environment**
    ```bash
    cp .env.example .env
    # Adjust DATABASE_URL or REDIS_URL if needed.
    # By default, it connects to the docker services locally.
    ```

4.  **Run Migrations**
    ```bash
    bun run db:migrate
    ```

5.  **Start the Services**
    You can run everything in one terminal for dev, or separate them.
    ```bash
    # Start both API and Worker (Development)
    bun run dev
    ```

    Or run them separately:
    ```bash
    SERVICE_ROLE=API bun run src/index.ts
    SERVICE_ROLE=WORKER bun run src/index.ts
    ```

    **Production Monolith (MVP):**
    For small deployments where you want both API and Worker in a single process without the development overhead:
    ```bash
    SERVICE_ROLE=STANDALONE bun run src/index.ts
    ```
    > **Warning:** unique process means compiling emails might block the API event loop momentarily.

## 🔐 Client Management

This service requires API Key authentication (`X-Api-Key`, `X-Api-Secret`). To create a new client, use the included CLI script:

```bash
bun run scripts/create-client.ts --name "My App" --rate-limit 600
```
> **Note:** Save the **API Secret** immediately; it is hashed and cannot be retrieved later.

## 📧 Sending Emails

**Endpoint:** `POST /v1/send`

**Headers:**
- `X-Api-Key`: `{your_prefix}`
- `X-Api-Secret`: `{your_secret}`

**Body:**
```json
{
  "to": "user@example.com",
  "template": "welcome",
  "props": {
    "name": "Miguel",
    "verificationUrl": "https://example.com/verify"
  },
  "subject": "Welcome to the Platform!"
}
```

The service will check for `templates/emails/welcome.tsx`, compile it if needed, and send the email.

## 🎨 Creating Templates

1.  Create a file in `templates/emails/` (e.g., `promotions/sale.tsx`).
2.  Use standard React Email components.
3.  The system automatically detects the file relative to the `templates/emails` directory.

Example `templates/emails/hello.tsx`:
```tsx
import { Html, Button } from "@react-email/components";
import React from "react";

export default function Hello({ name }: { name: string }) {
  return (
    <Html>
      <h1>Hello, {name}!</h1>
      <Button href="https://example.com" style={{ background: "#000", color: "#fff", padding: "12px 20px" }}>
        Click me
      </Button>
    </Html>
  );
}
```

## ⚙️ Configuration (.env)

| Variable | Description | Default |
| :--- | :--- | :--- |
| `SERVICE_ROLE` | `API`, `WORKER`, `GRPC`, `DEV` (local), or `STANDALONE` (prod monolith) | `DEV` |
| `DATABASE_URL` | Postgres Connection String | `...` |
| `REDIS_URL` | Redis Connection String | `...` |
| `SMTP_HOST` | Hostname for SMTP | `localhost` (MailHog: 1025) |
| `GRPC_PORT` | Port for gRPC Server | `50051` |
| `AWS_REGION` | AWS Region for SES (Secondary) | - |

## 🚀 gRPC Support (Experimental)

The service exposes a gRPC interface on port `50051`. Protocol definitions are in `src/grpc/protos/mailer.proto`.

**Run gRPC Server:**
```bash
SERVICE_ROLE=GRPC bun run src/index.ts
```

## 🧪 Testing

```bash
bun test
```

## 🐳 Docker Deployment

The official Docker image is available on GitHub Container Registry:

```bash
docker pull ghcr.io/mik3dev/mailer:latest
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
