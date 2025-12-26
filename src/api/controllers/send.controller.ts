// import { Utils } from "../../lib/utils"; // Removed unused import
// Actually Elysia provides a good context. 
// I'll stick to Elysia handlers.
import { type Context } from "elysia";
import { enqueueEmail } from "../../lib/queue/client";
import { db } from "../../lib/db";
import { messages } from "../../lib/db/schema";
import { randomUUID } from "crypto";

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

    // Authenticated client is available in ctx.store or similar if strictly typed
    // But for derived context, we access it directly if we defined it well.
    // Based on 'auth.ts', the derive returns { client }.
    const client = (ctx as any).client;
    if (!client) {
        ctx.set.status = 500;
        return { error: "Auth client missing in context" };
    }

    const messageId = randomUUID();

    try {
        // 1. Persist "Queued" status
        await db.insert(messages).values({
            id: messageId,
            clientId: client.id,
            templateName: body.template,
            recipient: body.to,
            subject: body.subject,
            status: "queued",
            createdAt: new Date(),
        });

        // 2. Enqueue
        const jobId = await enqueueEmail({
            to: body.to,
            template: body.template,
            props: body.props || {},
            subject: body.subject,
            messageId,
            clientId: client.id
        });

        ctx.set.status = 202;
        return {
            status: "accepted",
            message_id: messageId, // Return internal ID, not BullMQ Job ID
        };
    } catch (err: any) {
        console.error("Failed to enqueue email:", err);
        ctx.set.status = 500;
        return { error: "Internal Server Error" };
    }
};
