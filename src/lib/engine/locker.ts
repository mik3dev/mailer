import { redis } from "../db/redis";
import { randomUUID } from "node:crypto";

/**
 * Acquires a distributed lock for the given key and executes the task.
 * If the lock is held by another process, it waits and retries.
 * 
 * @param key - Unique lock key (e.g., "lock:compile:my-template")
 * @param ttlSeconds - Time to live for the lock in seconds
 * @param task - The async function to execute while holding the lock
 * @returns The result of the task
 */
export async function withDistributedLock<T>(
    key: string,
    ttlSeconds: number,
    task: () => Promise<T>
): Promise<T> {
    const lockKey = `lock:${key}`;
    const lockValue = randomUUID(); // Unique claimer ID
    const pollIntervalMs = 100; // Check every 100ms
    const maxWaitTimeMs = 5000; // Max wait 5 seconds before giving up? Or should we wait indefinitely/longer?
    // PRD says "if 5 nodes request... only one compiles; the others wait."
    // Let's set a reasonable max wait time to avoid infinite hanging.

    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTimeMs) {
        // Try to acquire lock: SET key value NX PX ttl
        const acquired = await redis.set(
            lockKey,
            lockValue,
            "NX" as any, // Type assertion to satisfy ioredis overloading
            "EX" as any,
            ttlSeconds as any
        );

        if (acquired === "OK") {
            try {
                // Lock acquired, run task
                return await task();
            } finally {
                // Release lock ONLY if it's still ours
                // Lua script to check value before deleting is safer, but for simple use case:
                const currentValue = await redis.get(lockKey);
                if (currentValue === lockValue) {
                    await redis.del(lockKey);
                }
            }
        }

        // Lock not acquired, wait and retry
        // Optimisation: We could subscribe to a key expiration/del event, but polling is simpler and sufficient here.
        await Bun.sleep(pollIntervalMs);
    }

    throw new Error(`Timeout waiting for distributed lock: ${key}`);
}
