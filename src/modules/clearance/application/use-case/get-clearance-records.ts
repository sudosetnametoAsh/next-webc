import { DashBoardRepository } from "../repository/dashboard-repository";

export class GetClearanceRecords {
    constructor(private repository: DashBoardRepository) {}

    async execute(userId?: string) {
        return await this.repository.getClearanceRecords(userId);
    }
}

