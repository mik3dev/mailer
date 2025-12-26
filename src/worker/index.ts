import { Worker } from "bullmq";
import { env } from "../config";
import { emailProcessor } from "./processors/email.processor";
import { db } from "../lib/db";
import { messages } from "../lib/db/schema";
import { eq } from "drizzle-orm";

// Startup Configuration Log (Sanitized)
const configSanitized = {
    role: "WORKER",
    smtp_host: env.SMTP_HOST || "localhost",
    smtp_port: env.SMTP_PORT,
    aws_region: env.AWS_REGION || "disabled",
    redis_host: env.REDIS_HOST,
};

console.log(`[Worker] Starting Email Worker...`, JSON.stringify(configSanitized, null, 2));

const worker = new Worker("email-sending", emailProcessor, {
    connection: {
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
    },
    concurrency: 5,
    limiter: {
        max: 10,
        duration: 1000,
    },
});

worker.on("completed", (job) => {
    console.log(`[Worker] Job ${job.id} completed`);
});

worker.on("failed", async (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed: ${err.message}`);

    if (job && job.data.messageId) {
        // Only mark as permanently failed if no retries left
        // Note: job.attemptsMade includes the current failed attempt.
        const maxAttempts = job.opts.attempts || 1;

        if (job.attemptsMade >= maxAttempts) {
            console.log(`[Worker] Job ${job.id} reached max attempts. Marking as FAILED in DB.`);
            await db.update(messages)
                .set({
                    status: "failed",
                    errorMessage: err.message || "Unknown Error",
                    updatedAt: new Date(),
                })
                .where(eq(messages.id, job.data.messageId));
        } else {
            console.log(`[Worker] Job ${job.id} failed attempt ${job.attemptsMade}/${maxAttempts}. Will retry.`);
            // Optionally update 'attempts' count here if not done in processor, 
            // but processor already increments 'attempts' at start of processing.
            // We can update error message but keep status as processing/queued? 
            // Ideally we leave it as 'processing' or let it stay whatever it is 
            // (it was set to 'processing' at start).
        }
    }
});

console.log(`[Worker] Listening for jobs...`);
