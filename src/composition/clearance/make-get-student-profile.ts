import { createDrizzleSupabaseClient } from "@/lib/db/create-drizzle-supabase-client";
import { GetStudentProfile } from "@/modules/clearance/application/use-case/get-student-profile";
import { DrizzleDashBoardRepository } from "@/modules/clearance/infrastructure/drizzle-dashboard-repository";

export async function makeGetStudentProfile() {
    const drizzle = await createDrizzleSupabaseClient();
    const repository = new DrizzleDashBoardRepository(drizzle);
    return new GetStudentProfile(repository);
}
