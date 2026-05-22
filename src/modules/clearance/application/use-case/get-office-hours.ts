import { DashBoardRepository } from "../repository/dashboard-repository";

export class GetOfficeHours {
    constructor(private repository: DashBoardRepository) {}

    async execute(userId?: string) {
        return await this.repository.getOfficeHours(userId);
    }
}
