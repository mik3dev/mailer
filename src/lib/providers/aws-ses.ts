
import { SESClient, SendEmailCommand, type SendEmailCommandInput } from "@aws-sdk/client-ses";
import type { EmailProvider, EmailMessage, EmailResult } from "./interface";
import { logger } from "../logger";

export class AWSSESProvider implements EmailProvider {
    name = "aws-ses";
    private client: SESClient;

    constructor(region: string, accessKeyId: string, secretAccessKey: string) {
        this.client = new SESClient({
            region,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });
    }

    async send(message: EmailMessage): Promise<EmailResult> {
        const input: SendEmailCommandInput = {
            Source: message.from,
            Destination: {
                ToAddresses: [message.to],
            },
            Message: {
                Subject: {
                    Data: message.subject,
                    Charset: "UTF-8",
                },
                Body: {
                    Html: {
                        Data: message.html,
                        Charset: "UTF-8",
                    },
                },
            },
        };

        try {
            const command = new SendEmailCommand(input);
            const response = await this.client.send(command);

            logger.info("Email sent via SES", { messageId: response.MessageId });

            return {
                id: response.MessageId || "unknown",
                provider: this.name,
            };
        } catch (error: any) {
            logger.error("Failed to send email via SES", { error });
            throw new Error(`SES Error: ${error.message}`);
        }
    }
}
