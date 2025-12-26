import { initTelemetry } from "./lib/otel";

// Initialize OpenTelemetry before anything else
initTelemetry();

import { app } from "./api/server";

const ROLE = process.env.SERVICE_ROLE || "DEV";

console.log(`Starting service with role: ${ROLE}`);

if (ROLE === "API" || ROLE === "DEV") {
    app.listen(3000);
    console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
}

if (ROLE === "WORKER" || ROLE === "DEV") {
    // TODO: Start worker
    console.log("Worker starting... (placeholder)");
}
