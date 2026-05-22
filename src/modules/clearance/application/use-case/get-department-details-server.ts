import { DashBoardRepository } from "../repository/dashboard-repository";

export class getDepartmentDetailsServer {
    constructor (private repository: DashBoardRepository) {}

    async execute(userId?: string) {
        return await this.repository.getDepartmentDetails(userId)
    }
}
