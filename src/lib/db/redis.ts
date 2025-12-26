
import Redis from "ioredis";
import { env } from "../../config";

// Singleton Redis connection
export const redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,
});

redis.on("error", (err) => {
    console.error("Redis connection error:", err);
});
