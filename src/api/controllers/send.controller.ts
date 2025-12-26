// import { Utils } from "../../lib/utils"; // Removed unused import
// Actually Elysia provides a good context. 
// I'll stick to Elysia handlers.
import { type Context } from "elysia";
import { enqueueEmail } from "../../lib/queue/client";
// import { randomUUID } from "node:crypto"; // Bun has native crypto

export const sendEmail = async (ctx: Context) => {
    // TODO: Add Zod/TypeBox validation middleware. 
    // For now, we assume the body is valid or valid enough.
    const body = ctx.body as any; // We'll improve this with strict types later

    if (!body.to || !body.template) {
        ctx.set.status = 400;
        return { error: "Missing required fields: to, template" };
    }

    // Trace ID should be coming from a middleware or generated here
    // const traceId = ctx.headers["x-trace-id"] || crypto.randomUUID();

    try {
        const jobId = await enqueueEmail({
            to: body.to,
            template: body.template,
            props: body.props || {},
            subject: body.subject,
            // traceId
        });

        ctx.set.status = 202;
        return {
            status: "accepted",
            message_id: jobId,
        };
    } catch (err: any) {
        console.error("Failed to enqueue email:", err);
        ctx.set.status = 500;
        return { error: "Internal Server Error" };
    }
};
