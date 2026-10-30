CREATE TYPE "public"."ticket_channel" AS ENUM('web', 'email', 'partner_area');--> statement-breakpoint
CREATE TYPE "public"."ticket_message_kind" AS ENUM('inbound', 'reply', 'note');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('open', 'waiting', 'resolved');--> statement-breakpoint
CREATE TABLE "support_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"kind" "ticket_message_kind" NOT NULL,
	"author_name" text NOT NULL,
	"author_user_id" uuid,
	"body" text NOT NULL,
	"email_message_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "support_messages_email_message_id_unique" UNIQUE("email_message_id")
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" serial NOT NULL,
	"subject" text NOT NULL,
	"topic" text DEFAULT 'other' NOT NULL,
	"status" "ticket_status" DEFAULT 'open' NOT NULL,
	"channel" "ticket_channel" NOT NULL,
	"requester_name" text NOT NULL,
	"requester_email" text NOT NULL,
	"user_id" uuid,
	"partner_id" uuid,
	"assignee_id" uuid,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "support_tickets_number_unique" UNIQUE("number")
);
--> statement-breakpoint
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "support_messages_ticket_idx" ON "support_messages" USING btree ("ticket_id","created_at");--> statement-breakpoint
CREATE INDEX "support_tickets_status_idx" ON "support_tickets" USING btree ("status","last_message_at");--> statement-breakpoint
CREATE INDEX "support_tickets_partner_idx" ON "support_tickets" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "support_tickets_requester_idx" ON "support_tickets" USING btree ("requester_email");--> statement-breakpoint
-- Come le altre tabelle (0004): chiuse alla Data API di Supabase.
ALTER TABLE "support_tickets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "support_messages" ENABLE ROW LEVEL SECURITY;
