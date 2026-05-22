import { createDrizzleSupabaseClient } from "@/lib/db/create-drizzle-supabase-client";
import { getDepartmentDetailsServer } from "@/modules/clearance/application/use-case/get-department-details-server";
import { DrizzleDashBoardRepository } from "@/modules/clearance/infrastructure/drizzle-dashboard-repository";

export async function makeGetDepartmentDetailsServer() {
    const drizzle = await createDrizzleSupabaseClient();
    const repository = new DrizzleDashBoardRepository(drizzle)
    return new getDepartmentDetailsServer(repository)
}
