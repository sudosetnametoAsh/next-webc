import { DrizzleDashBoardRepository } from "../../infrastructure/drizzle-dashboard-repository";

export class GetRecentSubmissions {
    constructor(private repository: DrizzleDashBoardRepository) {}

    async execute(email: string) {
        return await this.repository.getRecentSubmissions(email);
    }
}
