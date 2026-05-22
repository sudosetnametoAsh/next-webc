import { createDrizzleSupabaseClient } from "@/lib/db/create-drizzle-supabase-client";
import { GetOfficeHours } from "@/modules/clearance/application/use-case/get-office-hours";
import { DrizzleDashBoardRepository } from "@/modules/clearance/infrastructure/drizzle-dashboard-repository";

export async function makeGetOfficeHours() {
    const drizze = await createDrizzleSupabaseClient()
    const repository = new DrizzleDashBoardRepository(drizze)
    return new GetOfficeHours(repository)
}
