
import { Elysia } from "elysia";
import { db } from "../../lib/db";
import { clients } from "../../lib/db/schema";
import { redis } from "../../lib/db/redis";
import { eq } from "drizzle-orm";

export const authMiddleware = (app: Elysia) =>
    app
        .derive(async ({ request, set }) => {
            const apiKey = request.headers.get("x-api-key");
            const apiSecret = request.headers.get("x-api-secret");

            // 1. Basic Validation
            if (!apiKey || !apiSecret) {
                set.status = 401;
                throw new Error("Missing Authentication Headers");
            }

            const prefix = apiKey.slice(0, 8);

            // 2. Lookup Client
            // We query by prefix which is indexed
            const [client] = await db
                .select()
                .from(clients)
                .where(eq(clients.apiKeyPrefix, prefix))
                .limit(1);

            if (!client) {
                set.status = 401;
                throw new Error("Invalid API Key");
            }

            // 3. Verify Secret
            const isValid = await Bun.password.verify(apiSecret, client.apiSecretHash);
            if (!isValid) {
                set.status = 401;
                throw new Error("Invalid API Secret");
            }

            if (client.status !== "active") {
                set.status = 403;
                throw new Error("Client is suspended");
            }

            // 4. Rate Limiting (Token Bucket)
            // Key: rate_limit:{clientId}
            const key = `rate_limit:${client.id}`;
            // Allow 1 request consumption
            const current = await redis.incr(key);

            if (current === 1) {
                // Set expiry for 60 seconds on first request
                await redis.expire(key, 60);
            }

            const limit = client.rateLimit || 600;

            if (current > limit) {
                set.status = 429;
                throw new Error("Rate Limit Exceeded");
            }

            return {
                client
            };
        });
