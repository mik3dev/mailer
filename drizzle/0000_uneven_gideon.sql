CREATE EXTENSION IF NOT EXISTS "uuid-ossp";--> statement-breakpoint
CREATE TYPE "public"."client_status" AS ENUM('active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."message_status" AS ENUM('queued', 'processing', 'sent', 'delivered', 'bounced', 'failed');--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"name" varchar(255) NOT NULL,
	"api_key_prefix" varchar(32) NOT NULL,
	"api_secret_hash" varchar(255) NOT NULL,
	"rate_limit" integer DEFAULT 600,
	"quota_limit" integer DEFAULT 10000,
	"quota_usage" integer DEFAULT 0,
	"status" "client_status" DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"client_id" uuid NOT NULL,
	"trace_id" varchar(128),
	"template_name" varchar(255) NOT NULL,
	"recipient" varchar(255) NOT NULL,
	"subject" varchar(255),
	"status" "message_status" DEFAULT 'queued' NOT NULL,
	"provider" varchar(50),
	"provider_msg_id" varchar(255),
	"attempts" integer DEFAULT 0,
	"error_message" text,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_clients_api_key_prefix" ON "clients" USING btree ("api_key_prefix");--> statement-breakpoint
CREATE INDEX "idx_messages_client_id" ON "messages" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_messages_provider_msg_id" ON "messages" USING btree ("provider_msg_id");--> statement-breakpoint
CREATE INDEX "idx_messages_created_at" ON "messages" USING btree ("created_at");