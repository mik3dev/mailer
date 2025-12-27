import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { logger } from "./logger";

// Initialize OpenTelemetry SDK
// Note: No span exporter configured (no console noise).
// Instrumentation still active → trace_id generation works.
// To export spans, configure OTLP/Jaeger exporter in production.
const sdk = new NodeSDK({
    instrumentations: [getNodeAutoInstrumentations()],
});

export const initTelemetry = () => {
    try {
        sdk.start();
        logger.info("OpenTelemetry SDK started successfully");
    } catch (error) {
        logger.error("Error initializing OpenTelemetry SDK", { error });
    }
};

// Graceful shutdown
process.on("SIGTERM", () => {
    sdk.shutdown()
        .then(() => console.log("Tracing terminated"))
        .catch((error) => console.log("Error terminating tracing", error));
});
