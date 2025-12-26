import { Elysia } from "elysia";
import { authMiddleware } from "./middlewares/auth";
import { traceMiddleware } from "./middlewares/trace";
import { sendEmail } from "./controllers/send.controller";
import { handleWebhook } from "./controllers/webhook.controller";

export const app = new Elysia()
    .use(traceMiddleware)
    .onError(({ code, error, set }) => {
        let status = 500;
        const message = (error as any).message || "Unknown Error";

        // Map common errors to status codes
        if (message === "Missing Authentication Headers" || message === "Invalid API Key" || message === "Invalid API Secret") {
            status = 401;
        } else if (message === "Client is suspended") {
            status = 403;
        } else if (message === "Rate Limit Exceeded") {
            status = 429;
        }

        if (status) set.status = status;

        return new Response(JSON.stringify({
            error: message,
            code
        }), {
            status,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    })
    .get("/health", () => ({ status: "ok", timestamp: new Date().toISOString() }))

    // V1 API Group
    .group("/v1", app =>
        app
            .use(authMiddleware)
            .post("/send", sendEmail)
    )
    .post("/webhooks/:provider", handleWebhook);

export type App = typeof app;
