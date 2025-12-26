import { pgTable, uuid, varchar, integer, timestamp, text, pgEnum, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const clientStatusEnum = pgEnum("client_status", ["active", "suspended"]);
export const messageStatusEnum = pgEnum("message_status", ["queued", "processing", "sent", "delivered", "bounced", "failed"]);

export const clients = pgTable("clients", {
    id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
    name: varchar("name", { length: 255 }).notNull(),
    apiKeyPrefix: varchar("api_key_prefix", { length: 32 }).notNull(),
    apiSecretHash: varchar("api_secret_hash", { length: 255 }).notNull(),
    rateLimit: integer("rate_limit").default(600),
    quotaLimit: integer("quota_limit").default(10000),
    quotaUsage: integer("quota_usage").default(0),
    status: clientStatusEnum("status").default("active"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
    return {
        apiKeyPrefixIdx: index("idx_clients_api_key_prefix").on(table.apiKeyPrefix),
    };
});

export const messages = pgTable("messages", {
    id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
    traceId: varchar("trace_id", { length: 128 }),
    templateName: varchar("template_name", { length: 255 }).notNull(),
    recipient: varchar("recipient", { length: 255 }).notNull(),
    subject: varchar("subject", { length: 255 }),
    status: messageStatusEnum("status").notNull().default("queued"),
    provider: varchar("provider", { length: 50 }),
    providerMsgId: varchar("provider_msg_id", { length: 255 }),
    attempts: integer("attempts").default(0),
    errorMessage: text("error_message"),
    sentAt: timestamp("sent_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
    return {
        clientIdIdx: index("idx_messages_client_id").on(table.clientId),
        providerMsgIdIdx: index("idx_messages_provider_msg_id").on(table.providerMsgId),
        createdAtIdx: index("idx_messages_created_at").on(table.createdAt),
    };
});
