import { createDrizzleSupabaseClient } from "@/lib/db/create-drizzle-supabase-client";
import { GetSummary } from "@/modules/clearance/application/use-case/get-summary";
import { DrizzleDashBoardRepository } from "@/modules/clearance/infrastructure/drizzle-dashboard-repository";

export async function makeGetSummary() {
    const drizzle = await createDrizzleSupabaseClient();
    const repository = new DrizzleDashBoardRepository(drizzle);
    return new GetSummary(repository);
}
