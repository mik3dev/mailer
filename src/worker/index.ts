import { Worker } from "bullmq";
import { env } from "../config";
import { emailProcessor } from "./processors/email.processor";

console.log(`[Worker] Starting Email Worker...`);

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
