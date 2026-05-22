import { GetRecentSubmissions } from "@/modules/staff/application/use-case/get-recent-submissions";
import { DrizzleDashBoardRepository } from "@/modules/staff/infrastructure/drizzle-dashboard-repository";

export function makeGetRecentSubmissions() {
    const repository = new DrizzleDashBoardRepository();
    return new GetRecentSubmissions(repository);
}
