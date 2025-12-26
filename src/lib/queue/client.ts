import { Queue } from "bullmq";
import Redis from "ioredis";
import { env } from "../../config";

export interface EmailPayload {
    to: string;
    template: string;
    props: Record<string, any>;
    subject?: string;
    traceId?: string; // OpenTelemetry Trace ID
    messageId: string; // Internal DB Message ID
    clientId: string; // Internal DB Client ID
}

/**
 * The core 'Email Queue'.
 * Producers (API) add jobs here.
 * Consumers (Workers) process jobs from here.
 */
export const emailQueue = new Queue("email-sending", {
    connection: new Redis(env.REDIS_URL, { maxRetriesPerRequest: null }),
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
