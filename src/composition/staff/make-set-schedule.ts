import { createClient } from "@/lib/db/supabase-client";
import { SetSchedule } from "@/modules/staff/application/use-case/set-schedule";
import { SupabaseStaffRepository } from "@/modules/staff/infrastructure/supabase-schedule-repository";

export function makeSetSchedule() {
    const supabase = createClient()
    const repository = new SupabaseStaffRepository(supabase);
    return new SetSchedule(repository);
}
