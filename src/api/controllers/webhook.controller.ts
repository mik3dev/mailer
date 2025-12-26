import type { Context } from "elysia";
import { db } from "../../lib/db";
import { messages } from "../../lib/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "../../lib/logger";

export const handleWebhook = async (ctx: Context) => {
    const { params, body } = ctx;
    const provider = params.provider;

    logger.info("Received webhook", { provider, body });

    try {
        if (provider === "sendgrid") {
            await handleSendGrid(body as any[]);
        } else if (provider === "ses") {
            await handleSES(body as any);
        } else {
            ctx.set.status = 400;
            return { error: "Unknown provider" };
        }

        return { status: "received" };
    } catch (error) {
        logger.error("Error processing webhook", { error });
        ctx.set.status = 500;
        return { error: "Internal Server Error" };
    }
};

async function handleSendGrid(events: any[]) {
    for (const event of events) {
        const { sg_message_id, event: status, email } = event;
        // Map SendGrid status to internal status
        // Internal: queued, sent, delivered, bounced, failed, spam
        let newStatus = null;
        if (status === "delivered") newStatus = "delivered";
        if (status === "bounce") newStatus = "bounced";
        if (status === "spamreport") newStatus = "failed"; // or spam if we had it

        if (newStatus && sg_message_id) {
            // We need to parse sg_message_id to match what we stored. 
            // Often SendGrid appends stuff. 
            // For MVP we assume we stored the exact ID returned during send.

            // NOTE: In `email.processor.ts` (Sending part), we haven't actually updated `provider_msg_id` yet.
            // Story 4.4 says "Update DB messages -> sent". 
            // We assume the sending logic (ProviderManager -> SmtpProvider) returns an ID and we update it.
            // Since we mocked the sending in Story 4.4 context (passed previously), we might rely on `providerMsgId` being set.

            // Ideally we search by `providerMsgId`
            // await db.update(messages).set({ status: newStatus }).where(eq(messages.providerMsgId, sg_message_id));

            // For MVP, lets just log that we would update. 
            // Real implementation needs robust ID matching.

            // We will try to update if we can find it.
            const result = await db.update(messages)
                .set({ status: newStatus as any, updatedAt: new Date() })
                .where(eq(messages.providerMsgId, sg_message_id))
                .returning();

            if (result.length > 0) {
                logger.info("Updated message status via webhook", { id: result[0].id, status: newStatus });
            } else {
                logger.warn("Webhook: Message not found for provider ID", { sg_message_id });
            }
        }
    }
}

async function handleSES(body: any) {
    // SES sends a JSON object with `Type` (Notification) and `Message` (JSON string) usually, 
    // or if verifying, SubscriptionConfirmation.
    // Simplifying for typical Event Publishing logic.
    const { mail, eventType, bounce, complaint } = body;

    if (!mail || !eventType) return;

    const messageId = mail.messageId; // SES Message ID
    let newStatus = null;

    if (eventType === "Delivery") newStatus = "delivered";
    if (eventType === "Bounce") newStatus = "bounced";
    if (eventType === "Complaint") newStatus = "failed"; // Spam complaint

    if (newStatus && messageId) {
        const result = await db.update(messages)
            .set({ status: newStatus as any, updatedAt: new Date() })
            .where(eq(messages.providerMsgId, messageId))
            .returning();

        if (result.length > 0) {
            logger.info("Updated message status via SES webhook", { id: result[0].id, status: newStatus });
        } else {
            logger.warn("Webhook: Message not found for SES ID", { messageId });
        }
    }
}
