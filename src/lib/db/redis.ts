
import Redis from "ioredis";

// Singleton Redis connection
// If REDIS_URL is provided, use it, otherwise fallback to localhost
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: null, // Required for BullMQ, good practice generally
    enableReadyCheck: false,
});

redis.on("error", (err) => {
    console.error("Redis connection error:", err);
});
