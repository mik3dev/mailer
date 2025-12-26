import { NodeSDK } from "@opentelemetry/sdk-node";
import { ConsoleSpanExporter } from "@opentelemetry/sdk-trace-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { logger } from "./logger";

// Initialize OpenTelemetry SDK
// Using ConsoleSpanExporter for now (development visibility).
// In production, this would likely be an OTLP exporter.
const sdk = new NodeSDK({
    traceExporter: new ConsoleSpanExporter(),
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
