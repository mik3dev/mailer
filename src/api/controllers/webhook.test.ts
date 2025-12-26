import { describe, it, expect, mock, beforeEach } from "bun:test";
import { handleWebhook } from "./webhook.controller";
import { db } from "../../lib/db";
import { messages } from "../../lib/db/schema";

// Mock DB
mock.module("../../lib/db", () => ({
    db: {
        update: mock(() => ({
            set: mock(() => ({
                where: mock(() => ({
                    returning: mock(() => Promise.resolve([{ id: "msg-123", status: "delivered" }]))
                }))
            }))
        }))
    }
}));

// Mock logger to avoid console spam
mock.module("../../lib/logger", () => ({
    logger: {
        info: mock(),
        error: mock(),
        warn: mock()
    }
}));

describe("Webhook Controller", () => {
    it("should handle SendGrid delivered event", async () => {
        const ctx: any = {
            params: { provider: "sendgrid" },
            body: [
                {
                    email: "test@example.com",
                    event: "delivered",
                    sg_message_id: "SG.123"
                }
            ],
            set: {}
        };

        const response = await handleWebhook(ctx);
        expect(response).toEqual({ status: "received" });
    });

    it("should handle SES Bounce", async () => {
        const ctx: any = {
            params: { provider: "ses" },
            body: {
                eventType: "Bounce",
                mail: { messageId: "SES-123" },
                bounce: {}
            },
            set: {}
        };

        const response = await handleWebhook(ctx);
        expect(response).toEqual({ status: "received" });
    });

    it("should return 400 for unknown provider", async () => {
        const ctx: any = {
            params: { provider: "unknown" },
            body: {},
            set: {}
        };

        const response = await handleWebhook(ctx);
        expect(response).toEqual({ error: "Unknown provider" });
        expect(ctx.set.status).toBe(400);
    });
});
