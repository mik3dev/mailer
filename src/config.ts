import { z } from "zod";

const envSchema = z.object({
    // Role
    SERVICE_ROLE: z.enum(["API", "WORKER", "DEV", "STANDALONE", "GRPC"]).default("DEV"),

    // Database
    DATABASE_URL: z.string().default("postgres://postgres:postgres@localhost:5432/mailer_db"),

    // Redis
    REDIS_URL: z.string().default("redis://localhost:6379"),

    // gRPC
    GRPC_PORT: z.coerce.number().default(50051),

    // SMTP (Optional defaults for dev)
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().optional().default(587),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_SECURE: z.preprocess((val) => val === "true" || val === true, z.boolean()).default(false),
    SMTP_FROM: z.string().default("noreply@example.com"),

    // AWS SES
    AWS_REGION: z.string().optional(),
    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),

    // Provider Config
    EMAIL_PROVIDER: z.enum(["smtp", "ses"]).default("smtp"),
}).refine((data) => {
    if (data.EMAIL_PROVIDER === "ses") {
        return !!(data.AWS_REGION && data.AWS_ACCESS_KEY_ID && data.AWS_SECRET_ACCESS_KEY);
    }
    return true;
}, {
    message: "AWS SES credentials are required when EMAIL_PROVIDER is set to 'ses'",
    path: ["EMAIL_PROVIDER"],
});

// Validate env vars
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error("❌ Invalid environment variables:", parsed.error.format());
    process.exit(1);
}

export const env = parsed.data;
