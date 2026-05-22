import { createDrizzleSupabaseClient } from "@/lib/db/create-drizzle-supabase-client"
import { GetClearanceRecords } from "@/modules/clearance/application/use-case/get-clearance-records"
import { DrizzleDashBoardRepository } from "@/modules/clearance/infrastructure/drizzle-dashboard-repository"

export async function makeGetClearanceRecords () {
    const drizzle = await createDrizzleSupabaseClient()
    const repository = new DrizzleDashBoardRepository(drizzle)
    return new GetClearanceRecords(repository)
}
