import { type Context } from "elysia";
import { sendEmailUseCase } from "../../lib/services/email.service";

export const sendEmail = async (ctx: Context) => {
    // TODO: Add Zod/TypeBox validation middleware. 
    // For now, we assume the body is valid or valid enough.
    const body = ctx.body as any; // We'll improve this with strict types later

    if (!body.to || !body.template) {
        ctx.set.status = 400;
        return { error: "Missing required fields: to, template" };
    }

    // Trace ID from derived context (middleware)
    const traceId = (ctx as any).traceId;

    // Authenticated client is available in ctx.store or similar if strictly typed
    const client = (ctx as any).client;
    if (!client) {
        ctx.set.status = 500;
        return { error: "Auth client missing in context" };
    }

    try {
        const result = await sendEmailUseCase({
            to: body.to,
            template: body.template,
            subject: body.subject,
            props: body.props
        }, {
            clientId: client.id,
            traceId
        });

        console.log(`[API] Email enqueued successfully`, {
            message_id: result.messageId,
            trace_id: traceId,
            to: body.to,
            template: body.template
        });

        ctx.set.status = 202;
        return {
            status: result.status,
            message_id: result.messageId,
        };
    } catch (err: any) {
        console.error("Failed to enqueue email:", err);
        ctx.set.status = 500;
        return { error: "Internal Server Error" };
    }
};
