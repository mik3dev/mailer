import { context, trace } from "@opentelemetry/api";

export const logger = {
    info: (message: string, meta: Record<string, any> = {}) => {
        log("INFO", message, meta);
    },
    error: (message: string, meta: Record<string, any> = {}) => {
        log("ERROR", message, meta);
    },
    warn: (message: string, meta: Record<string, any> = {}) => {
        log("WARN", message, meta);
    },
    debug: (message: string, meta: Record<string, any> = {}) => {
        log("DEBUG", message, meta);
    },
};

function log(level: string, message: string, meta: Record<string, any>) {
    const span = trace.getSpan(context.active());
    const traceId = span ? span.spanContext().traceId : undefined;

    const entry = {
        level,
        timestamp: new Date().toISOString(),
        message,
        trace_id: traceId,
        ...meta,
    };

    console.log(JSON.stringify(entry));
}
