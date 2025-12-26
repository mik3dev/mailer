import { describe, it, expect, mock, spyOn, beforeEach } from "bun:test";
import { trace } from "@opentelemetry/api";

// 1. Setup Mocks BEFORE importing the controller
const mockInsertValues = mock(() => Promise.resolve());
const mockDbInsert = mock(() => ({ values: mockInsertValues }));
const mockEnqueueEmail = mock(() => Promise.resolve("job-123"));

mock.module("../../lib/queue/client", () => ({
    enqueueEmail: mockEnqueueEmail,
}));

mock.module("../../lib/db", () => ({
    db: {
        insert: mockDbInsert,
    },
}));

mock.module("../../lib/db/schema", () => ({
    messages: {},
}));

// Import controller AFTER mocks
import { sendEmail } from "./send.controller";

describe("Send Controller", () => {
    beforeEach(() => {
        mockInsertValues.mockClear();
        mockEnqueueEmail.mockClear();
        // Clear spies if any
    });

    it("should extract traceId from active context and pass it to db/queue", async () => {
        // Mock Context
        const fakeTraceId = "trace-1234567890abcdef";
        const ctx = {
            body: {
                to: "test@example.com",
                template: "welcome",
                subject: "Hello",
            },
            client: { id: "client-123" },
            set: { status: 200 },
            traceId: fakeTraceId, // Derived property
        } as any;

        // No need to mock trace.getSpan anymore for this controller logic


        await sendEmail(ctx);

        // Verify DB Insert
        expect(mockDbInsert).toHaveBeenCalled();
        expect(mockInsertValues).toHaveBeenCalled();

        if (mockInsertValues.mock.calls.length > 0) {
            const dbCallArg = mockInsertValues.mock.calls[0][0] as any;
            expect(dbCallArg).toBeObject();
            expect(dbCallArg.traceId).toBe(fakeTraceId);
            expect(dbCallArg.status).toBe("queued");
        }

        // Verify Queue Enqueue
        expect(mockEnqueueEmail).toHaveBeenCalled();
        if (mockEnqueueEmail.mock.calls.length > 0) {
            const queueCallArg = mockEnqueueEmail.mock.calls[0][0] as any;
            expect(queueCallArg).toBeObject();
            expect(queueCallArg.traceId).toBe(fakeTraceId);
            expect(queueCallArg.to).toBe("test@example.com");
        }
    });

    it("should handle missing traceId gracefully", async () => {
        const ctx = {
            body: { to: "test@example.com", template: "welcome" },
            client: { id: "client-123" },
            set: { status: 200 },
            // traceId undefined
        } as any;

        await sendEmail(ctx);

        // Verify DB Insert has undefined traceId
        expect(mockInsertValues).toHaveBeenCalled();
        if (mockInsertValues.mock.calls.length > 0) {
            const dbCallArg = mockInsertValues.mock.calls[0][0] as any;
            expect(dbCallArg.traceId).toBeUndefined();
        }

        // Verify Queue Enqueue has undefined traceId
        expect(mockEnqueueEmail).toHaveBeenCalled();
        if (mockEnqueueEmail.mock.calls.length > 0) {
            const queueCallArg = mockEnqueueEmail.mock.calls[0][0] as any;
            expect(queueCallArg.traceId).toBeUndefined();
        }
    });
});
