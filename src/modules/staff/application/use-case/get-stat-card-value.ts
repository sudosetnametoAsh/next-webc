import { DashboardRepository } from "../repository/dashboard-repository";

export class GetStatCardValue {
    constructor(private repository: DashboardRepository){}

    async execute(email: string) {
        return this.repository.getStatCardValue(email)
    }
}
