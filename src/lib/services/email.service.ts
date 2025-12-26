import { db } from "../db";
import { messages } from "../db/schema";
import { enqueueEmail } from "../queue/client";
import { randomUUID } from "crypto";

export interface SendEmailInput {
    to: string;
    template: string;
    subject?: string;
    props?: Record<string, any>;
}

export interface SendEmailMeta {
    clientId: string;
    traceId?: string;
}

export const sendEmailUseCase = async (input: SendEmailInput, meta: SendEmailMeta) => {
    const messageId = randomUUID();

    // 1. Persist "Queued" status
    await db.insert(messages).values({
        id: messageId,
        clientId: meta.clientId,
        templateName: input.template,
        recipient: input.to,
        subject: input.subject,
        status: "queued",
        traceId: meta.traceId,
        createdAt: new Date(),
    });

    // 2. Enqueue
    await enqueueEmail({
        to: input.to,
        template: input.template,
        props: input.props || {},
        subject: input.subject,
        messageId,
        clientId: meta.clientId,
        traceId: meta.traceId
    });

    return {
        messageId,
        status: "accepted"
    };
};
