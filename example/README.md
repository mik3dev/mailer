# Example Deployment: Microservices Architecture

This example demonstrates how to deploy `mailer-bun` in a production-like Microservices configuration using Docker Compose.

## 🏗️ Architecture

Instead of running a single "monolith" container, we split the application into three specialized services:

1.  **API (`api`)**: Handles HTTP requests (REST API) on port `3000`.
2.  **Worker (`worker`)**: Background process that consumes the Redis queue and sends emails.
3.  **gRPC Server (`grpc`)**: Handles high-performance RPC calls on port `50051`.

All services share:
-   **Postgres**: Persistent storage for messages and compiled templates index.
-   **Redis**: Distributed locking and job queue.
-   **Templates Volume**: The `../templates` directory is mounted to provide the source `.tsx` files.

## 🚀 How to Run

1.  **Start the services**:
    ```bash
    docker compose up -d
    ```

2.  **Verify Services**:
    -   **API**: http://localhost:3000/health
    -   **MailHog (SMTP UI)**: http://localhost:8025
    -   **gRPC**: `localhost:50051`

3.  **Run Migrations**:
    Since this is a fresh database, you might need to run migrations. You can do this using the new production migration command included in the image:
    ```bash
    docker compose run --rm api bun run db:migrate:prod
    ```

4.  **Send an Email**:
    ```bash
    curl -X POST http://localhost:3000/v1/send \
      -H "Content-Type: application/json" \
      -H "X-Api-Key: your-api-key" \
      -H "X-Api-Secret: your-api-secret" \
      -d '{
        "to": "test@example.com",
        "template": "welcome",
        "subject": "Hello from Microservices!"
      }'
    ```

## 🛑 Stop

```bash
docker compose down
```
