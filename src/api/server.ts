import { Elysia } from "elysia";
import { authMiddleware } from "./middlewares/auth";

export const app = new Elysia()
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
            .post("/send", ({ client }) => {
                return {
                    status: "accepted",
                    message: "Email queued (dummy)",
                    clientId: client.id
                };
            })
    );

export type App = typeof app;
