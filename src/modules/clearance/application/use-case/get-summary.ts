import { DashBoardRepository } from "../repository/dashboard-repository";

export class GetSummary {
    constructor(private repository: DashBoardRepository) {}

    async execute() {
        return await this.repository.getSummary();
    }
}
