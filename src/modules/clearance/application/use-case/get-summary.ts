import { DashBoardRepository } from "../repository/dashboard-repository";

export class GetSummary {
    constructor(private repository: DashBoardRepository) {}

    async execute(userId?: string) {
        return await this.repository.getSummary(userId);
    }
}
