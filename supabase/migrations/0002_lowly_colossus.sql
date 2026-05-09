CREATE TABLE "notifications" (
	"notif_id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"type" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"ref_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "type_check" CHECK ("notifications"."type" IN ('System', 'Warning', 'Info'))
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notif_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- DROP POLICY "Students view own clearances" ON "student_clearances" CASCADE;
