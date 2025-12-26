import { type Job } from "bullmq";
import { type EmailPayload } from "../../lib/queue/client";
import { ProviderManager } from "../../lib/providers/manager";
import { env } from "../../config";
import { logger } from "../../lib/logger";
import { trace, context, propagation } from "@opentelemetry/api";
import { db } from "../../lib/db";
import { messages } from "../../lib/db/schema";
import { eq, sql } from "drizzle-orm";

// WARNING: Epic 3 (Template Engine) might be mocked or partially implemented.
// I'll assume `renderTemplate` exists and works or I'll wrap it.

// Check imports:
import { loadTemplate } from "../../lib/engine/loader";

export const emailProcessor = async (job: Job<EmailPayload>) => {
    const { to, template, props, subject, traceId, messageId } = job.data;
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
                message_id: messageId,
                to,
                template,
                trace_id: traceId // Log explicity as well
            });

            // 0. Update DB -> Processing
            if (messageId) {
                await db.update(messages)
                    .set({
                        status: "processing",
                        attempts: sql`${messages.attempts} + 1`,
                        updatedAt: new Date()
                    })
                    .where(eq(messages.id, messageId));
            }

            // 1. Render Template (JIT)
            const html = await loadTemplate(template, props);

            // 2. Send via Provider
            const manager = ProviderManager.getInstance();

            const result = await manager.send({
                to,
                from: env.SMTP_FROM,
                subject: subject || "No Subject",
                html,
            });

            // 3. Update DB -> Sent
            if (messageId) {
                await db.update(messages)
                    .set({
                        status: "sent",
                        provider: result.provider,
                        providerMsgId: result.id,
                        sentAt: new Date(),
                        updatedAt: new Date()
                    })
                    .where(eq(messages.id, messageId));
            }

            logger.info("Email sent successfully", { job_id: job.id, provider: manager.getPrimaryName() });
        } catch (error: any) {
            logger.error("Failed to process email", { job_id: job.id, message_id: messageId, error });

            // 4. Update DB -> Failed
            if (messageId) {
                await db.update(messages)
                    .set({
                        status: "failed",
                        errorMessage: error.message || "Unknown Error",
                        updatedAt: new Date()
                    })
                    .where(eq(messages.id, messageId));
            }

            span.recordException(error as Error);
            throw error; // BullMQ needs to know it failed
        } finally {
            span.end();
        }
    });
};
