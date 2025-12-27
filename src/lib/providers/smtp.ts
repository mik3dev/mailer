import nodemailer from "nodemailer";
import type { EmailMessage, EmailProvider, EmailResult } from "./interface";
import { env } from "../../config";

export class SmtpProvider implements EmailProvider {
    name = "smtp-primary";
    private transporter: nodemailer.Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: env.SMTP_HOST,
            port: env.SMTP_PORT,
            secure: env.SMTP_SECURE,
            ignoreTLS: true, // Force plaintext for dev/MailHog
            requireTLS: false,
            auth: env.SMTP_USER
                ? {
                    user: env.SMTP_USER,
                    pass: env.SMTP_PASS,
                }
                : undefined,
            // Allow self-signed certs / localhost issues in Dev
            tls: {
                rejectUnauthorized: false
            }
        });
    }

    async send(email: EmailMessage): Promise<EmailResult> {
        try {
            console.log(`[SmtpProvider] Connecting to ${env.SMTP_HOST}:${env.SMTP_PORT}...`);
            const result = await this.transporter.sendMail({
                from: email.from || env.SMTP_FROM,
                to: email.to,
                subject: email.subject,
                html: email.html,
            });

            console.log(`[SmtpProvider] Sent OK. Response: ${result.response}, MessageID: ${result.messageId}`);

            return {
                id: result.messageId,
                provider: this.name
            };
        } catch (error: any) {
            console.error(`[SmtpProvider] Failed to send email to ${email.to}`, {
                error_message: error.message,
                error_code: error.code,
                error_command: error.command,
                error_response: error.response,
            });
            throw error; // Rethrow to let the manager/circuit breaker handle it
        }
    }
}
