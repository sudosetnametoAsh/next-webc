import { createClient } from "@/lib/db/supabase-client";
import { GetSchedule } from "@/modules/staff/application/use-case/get-schedule";
import { SupabaseStaffRepository } from "@/modules/staff/infrastructure/supabase-schedule-repository";

export function makeGetSchedule() {
    const supabase = createClient();
    const repository = new SupabaseStaffRepository(supabase);
    return new GetSchedule(repository)
}
