import { Elysia } from "elysia";
import { context, trace } from "@opentelemetry/api";
import { randomUUID } from "crypto";

export const traceMiddleware = (app: Elysia) => {
    return app.onRequest(({ request, set }) => {
        const tracer = trace.getTracer("mailer-api");
        const existingTraceId = request.headers.get("x-trace-id");

        // Start a new span
        const span = tracer.startSpan(
            `${request.method} ${new URL(request.url).pathname}`,
            undefined,
            context.active()
        );

        if (existingTraceId) {
            // Link to existing trace if needed, but for now we just log it
            // In a real scenario we'd use propagation API to extract context
            span.setAttribute("user_provided_trace_id", existingTraceId);
        }

        // Add trace_id to response headers
        set.headers["x-trace-id"] = span.spanContext().traceId;

        // Context management in Elysia/async hooks is tricky.
        // For simple auto-instrumentation, the SDK handles a lot.
        // But to ensure our logger picks it up, we might need to rely on the SDK's auto-patching of http/bun.

        // Store span in request store if we had one, but strict extraction is handled by OTEL auto-instrumentation.

        // End span on response - this is tricky in onRequest without onAfterResponse hook properly wrapping.
        // Ideally, we'd use a derive or simple wrapper.
        // But let's rely on auto-instrumentation for the "real" HTTP span, and this middleware just specifically ensures we have a Trace ID for our own business logic if needed.

        // Actually, with @opentelemetry/auto-instrumentations-node, HTTP requests are automatically traced.
        // We just need to make sure we return the Trace ID to the user.

        const currentSpan = trace.getSpan(context.active());
        if (currentSpan) {
            set.headers["x-trace-id"] = currentSpan.spanContext().traceId;
        }
    });
};

// Simplified version: Just ensure X-Trace-Id header presence for client visibility
// The actual span creation is handled by auto-instrumentation.
export const traceHeaderMiddleware = (app: Elysia) => {
    return app.onAfterHandle(({ set }) => {
        const span = trace.getSpan(context.active());
        if (span) {
            set.headers["x-trace-id"] = span.spanContext().traceId;
        }
    });
};
