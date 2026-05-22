import { DashboardRepository } from "../repository/dashboard-repository";

export class GetRecentActivity {
    constructor (private repository: DashboardRepository) {}

    async execute(email: string) {
        return await this.repository.getRecentActivity(email);
    }
}
