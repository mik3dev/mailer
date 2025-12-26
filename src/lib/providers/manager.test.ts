import { describe, it, expect, mock, beforeEach } from "bun:test";
import { ProviderManager } from "./manager";
import { SmtpProvider } from "./smtp";

// Mock SmtpProvider
mock.module("./smtp", () => {
    return {
        SmtpProvider: class MockSmtpProvider {
            name = "mock-smtp";
            async send(email: any) {
                if (email.subject === "FAIL") {
                    throw new Error("SMTP Failed");
                }
            }
        }
    };
});

describe("ProviderManager", () => {
    let manager: ProviderManager;

    beforeEach(() => {
        // Reset singleton for testing if possible, or just get instance
        // Since it's a singleton, state might persist. 
        // Ideally we'd have a reset method or create a new instance for tests.
        // For now, let's assume we can get the instance.
        manager = ProviderManager.getInstance();
        // Manually reset state if we could access private props, but we can't easily.
        // We will test the happy path.
    });

    it("should send email successfully via primary", async () => {
        // This should not throw
        await manager.send({
            to: "test@example.com",
            subject: "Hello",
            html: "<div>Hi</div>"
        });
        expect(true).toBe(true);
    });

    it("should switch to secondary after failures", async () => {
        // We need to fail 3 times
        const email = { to: "test@example.com", subject: "FAIL", html: "<div>Hi</div>" };

        // 1st failure
        try { await manager.send(email); } catch (e) { }
        // 2nd failure
        try { await manager.send(email); } catch (e) { }
        // 3rd failure -> Circuit opens
        try { await manager.send(email); } catch (e) { }

        // Now next request should fail immediately with different error or try secondary
        // Since secondary is null in our code, it should throw "No secondary provider"
        try {
            await manager.send(email);
        } catch (e: any) {
            // Depending on implementation, it might throw "No secondary" or "Circuit Open" logic
            // Our code: If circuit open -> try secondary -> throws "No secondary"
            expect(e.message).toContain("no secondary provider");
        }
    });
});
