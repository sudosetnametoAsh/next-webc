ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "section_id" integer;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "course_id" integer;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notif_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."course_sections"("section_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notif_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("course_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "users can view own notifications" ON "notifications" AS PERMISSIVE FOR SELECT TO "authenticated" USING (user_id IN (SELECT user_id FROM public.users WHERE auth_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "users can update own notifications" ON "notifications" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (user_id IN (SELECT user_id FROM public.users WHERE auth_id = auth.uid())) WITH CHECK (user_id IN (SELECT user_id FROM public.users WHERE auth_id = auth.uid()));