import { GetStatCardValue } from "@/modules/staff/application/use-case/get-stat-card-value"
import { DrizzleDashBoardRepository } from "@/modules/staff/infrastructure/drizzle-dashboard-repository"

export function makeGetStatCardValue() {
    const repository = new DrizzleDashBoardRepository()
    return new GetStatCardValue(repository);
}
