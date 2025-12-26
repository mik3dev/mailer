export interface EmailMessage {
    to: string;
    subject: string;
    html: string;
    from?: string;
}

export interface EmailResult {
    id: string;
    provider: string;
}

export interface EmailProvider {
    name: string;
    /**
     * Sends an email.
     * Should throw an error if sending fails to trigger retries.
     */
    send(email: EmailMessage): Promise<EmailResult>;
}
