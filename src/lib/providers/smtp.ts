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
            auth: env.SMTP_USER
                ? {
                    user: env.SMTP_USER,
                    pass: env.SMTP_PASS,
                }
                : undefined,
        });
    }

    async send(email: EmailMessage): Promise<EmailResult> {
        try {
            const result = await this.transporter.sendMail({
                from: email.from || env.SMTP_FROM,
                to: email.to,
                subject: email.subject,
                html: email.html,
            });

            return {
                id: result.messageId,
                provider: this.name
            };
        } catch (error) {
            console.error(`[SmtpProvider] Failed to send email to ${email.to}`, error);
            throw error; // Rethrow to let the manager/circuit breaker handle it
        }
    }
}
