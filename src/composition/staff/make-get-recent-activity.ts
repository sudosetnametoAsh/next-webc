import { GetRecentActivity } from "@/modules/staff/application/use-case/get-recent-activity";
import { DrizzleDashBoardRepository } from "@/modules/staff/infrastructure/drizzle-dashboard-repository";

export function makeGetRecentActivity() {
    const repository = new DrizzleDashBoardRepository()
    return new GetRecentActivity(repository);
}
