import { Elysia } from "elysia";
import { context, trace, type Span } from "@opentelemetry/api";

// We extend Elysia to include traceId in the derived context
export const traceMiddleware = (app: Elysia) => {
    return app
        .derive(({ request, set }) => {
            const tracer = trace.getTracer("mailer-api");

            // 1. Create a span manually since Bun.serve isn't auto-instrumented by default
            // We use the startSpan API. 
            // Ideally we would use propagation.extract(...) to get parent context from headers.
            // For now, let's ensure we get a fresh span.
            const span = tracer.startSpan(`${request.method} ${new URL(request.url).pathname}`);
            const traceId = span.spanContext().traceId;

            // 2. Set response header
            set.headers["x-trace-id"] = traceId;

            // 3. Return it to the context so controllers can access it reliably
            // We also return the span so we can end it (though ending it in derive is hard, we might just let it be GC'd or end it in onResponse)
            return {
                traceId,
                requestSpan: span
            };
        })
        .onAfterHandle(({ requestSpan }) => {
            // End the span after handler
            if (requestSpan) {
                requestSpan.end();
            }
        })
        .onError(({ requestSpan, error }) => {
            if (requestSpan) {
                requestSpan.recordException(error);
                requestSpan.end();
            }
        });
};


