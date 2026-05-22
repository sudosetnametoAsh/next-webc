ALTER POLICY "department staff can make changes" ON "staff_predefined_tasks" RENAME TO "department staff can manage their own predefined tasks";--> statement-breakpoint
DROP POLICY "department staff can only view their own task" ON "staff_predefined_tasks" CASCADE;--> statement-breakpoint
ALTER POLICY "department staff can view clearance records" ON "clearance_records" TO authenticated USING ((auth.jwt() -> 'user_metadata' -> 'custom_claims' -> 'roles' ->> 0 ) = 'Department');

ALTER PUBLICATION supabase_realtime ADD TABLE clearance_departments;
ALTER PUBLICATION supabase_realtime ADD TABLE clearance_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE clearance_records;
ALTER PUBLICATION supabase_realtime ADD TABLE clearance_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE clearance_templates;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE staff_predefined_tasks;
