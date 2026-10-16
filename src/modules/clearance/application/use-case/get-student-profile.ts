import { DashBoardRepository } from "../repository/dashboard-repository";

export class GetStudentProfile {
    constructor(private repository: DashBoardRepository) {}

    async execute(userId?: string) {
        return await this.repository.getStudentProfile(userId);
    }
}
