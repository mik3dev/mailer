import { Queue } from "bullmq";
import { env } from "../../config";

export interface EmailPayload {
    to: string;
    template: string;
    props: Record<string, any>;
    subject?: string;
    traceId?: string; // OpenTelemetry Trace ID
}

/**
 * The core 'Email Queue'.
 * Producers (API) add jobs here.
 * Consumers (Workers) process jobs from here.
 */
export const emailQueue = new Queue("email-sending", {
    connection: {
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
    },
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
    },
});

export const enqueueEmail = async (payload: EmailPayload) => {
    const job = await emailQueue.add("email:send", payload);
    return job.id;
};
