import { z } from "zod";

const envSchema = z.object({
    // Role
    SERVICE_ROLE: z.enum(["API", "WORKER", "DEV"]).default("DEV"),

    // Database
    DATABASE_URL: z.string().default("postgres://postgres:postgres@localhost:5432/mailer_db"),

    // Redis
    REDIS_HOST: z.string().default("localhost"),
    REDIS_PORT: z.coerce.number().default(6379),

    // SMTP (Optional defaults for dev)
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().optional().default(587),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_SECURE: z.coerce.boolean().default(false),
    SMTP_FROM: z.string().default("noreply@example.com"),

    // AWS SES
    AWS_REGION: z.string().optional(),
    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),
});

// Validate env vars
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error("❌ Invalid environment variables:", parsed.error.format());
    process.exit(1);
}

export const env = parsed.data;
