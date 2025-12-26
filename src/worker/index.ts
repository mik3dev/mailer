import { Worker } from "bullmq";
import { env } from "../config";
import { emailProcessor } from "./processors/email.processor";

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

worker.on("failed", (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed: ${err.message}`);
});

console.log(`[Worker] Listening for jobs...`);
