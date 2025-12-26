import type { EmailMessage, EmailProvider } from "./interface";
import { SmtpProvider } from "./smtp";
// import { SesProvider } from "./aws-ses"; // Future

export class ProviderManager {
    private static instance: ProviderManager;
    private primary: EmailProvider;
    private secondary: EmailProvider | null;

    // Circuit Breaker State
    private failures = 0;
    private isCircuitOpen = false;
    private readonly FAILURE_THRESHOLD = 3;
    private readonly RESET_TIMEOUT = 60000; // 1 minute
    private lastFailureTime = 0;

    private constructor() {
        this.primary = new SmtpProvider();
        // For MVP, we don't have a secondary provider configured yet, 
        // but the logic expects one for failover.
        // In a real scenario, this might be new SesProvider()
        this.secondary = null;
    }

    public static getInstance(): ProviderManager {
        if (!ProviderManager.instance) {
            ProviderManager.instance = new ProviderManager();
        }
        return ProviderManager.instance;
    }

    public getPrimaryName(): string {
        return this.primary.name;
    }

    async send(email: EmailMessage): Promise<void> {
        // Check if circuit is open (Primary failed too many times)
        if (this.isCircuitOpen) {
            if (Date.now() - this.lastFailureTime > this.RESET_TIMEOUT) {
                this.closeCircuit(); // Try primary again
            } else {
                return this.sendWithSecondary(email);
            }
        }

        try {
            await this.primary.send(email);
            this.failures = 0; // Reset consecutive failures on success
        } catch (error) {
            this.failures++;
            this.lastFailureTime = Date.now();

            console.error(`[ProviderManager] Primary provider failed (${this.failures}/${this.FAILURE_THRESHOLD})`);

            if (this.failures >= this.FAILURE_THRESHOLD) {
                this.openCircuit();
            }

            // Attempt fallback immediately
            await this.sendWithSecondary(email);
        }
    }

    private async sendWithSecondary(email: EmailMessage): Promise<void> {
        if (!this.secondary) {
            // If no backup, we just have to fail.
            // In a real app we might throw, but since we caught the primary error,
            // we need to ensure we re-throw so the Job Queue knows it failed.
            console.warn("[ProviderManager] No secondary provider configured. Failing.");
            throw new Error("Primary provider failed and no secondary provider available.");
        }

        console.log("[ProviderManager] Using Secondary Provider...");
        try {
            await this.secondary.send(email);
        } catch (error) {
            console.error("[ProviderManager] Both providers failed.");
            throw error;
        }
    }

    private openCircuit() {
        if (!this.isCircuitOpen) {
            console.warn("[ProviderManager] Circuit Breaker OPEN. Switching to secondary.");
            this.isCircuitOpen = true;
        }
    }

    private closeCircuit() {
        console.warn("[ProviderManager] Circuit Breaker RESET. Trying primary.");
        this.isCircuitOpen = false;
        this.failures = 0;
    }
}
