import { type Job } from "bullmq";
import { type EmailPayload } from "../../lib/queue/client";
import { ProviderManager } from "../../lib/providers/manager";
import { env } from "../../config";
import { logger } from "../../lib/logger";
import { trace, context, propagation } from "@opentelemetry/api";

// WARNING: Epic 3 (Template Engine) might be mocked or partially implemented.
// I'll assume `renderTemplate` exists and works or I'll wrap it.

// Check imports:
// import { renderTemplate } from "../../lib/engine/renderer";
// import { buildTemplate } from "../../lib/engine/builder";

export const emailProcessor = async (job: Job<EmailPayload>) => {
    const { to, template, props, subject, traceId } = job.data;
    const tracer = trace.getTracer("mailer-worker");

    // Reconstruct context from traceId if passed
    // BullMQ job data might strictly just have the ID string.
    // Ideally we propagate the W3C headers via job options or data.
    // For MVP/Story 5.1, if we just have the ID, we can link it manually or just log it.

    // Simplification: We will just set the attribute if we start a span, 
    // but without full W3C propagation headers (parent-id etc), it's a new root span 
    // that links to the previous one via "links" or just sharing the ID tag.

    // Better approach: Start a span, and if we have traceId, set that as an attribute 
    // so we can query "trace_id:<ID>" in logs.

    await tracer.startActiveSpan("process_email", {
        attributes: {
            "app.trace_id": traceId // Custom attribute for manual correlation
        }
    }, async (span) => {
        try {
            logger.info("Processing email job", {
                job_id: job.id,
                to,
                template,
                trace_id: traceId // Log explicity as well
            });

            // MOCKING RENDERING FOR NOW till Epic 3 is fully integrated:
            const html = `<html><body><h1>Mock Body for ${template}</h1><p>Props: ${JSON.stringify(props)}</p></body></html>`;

            // 2. Send via Provider
            const manager = ProviderManager.getInstance();

            await manager.send({
                to,
                from: env.SMTP_FROM,
                subject: subject || "No Subject",
                html,
            });

            logger.info("Email sent successfully", { job_id: job.id, provider: manager.getPrimaryName() });
        } catch (error) {
            logger.error("Failed to process email", { job_id: job.id, error });
            span.recordException(error as Error);
            throw error; // BullMQ needs to know it failed
        } finally {
            span.end();
        }
    });
};
