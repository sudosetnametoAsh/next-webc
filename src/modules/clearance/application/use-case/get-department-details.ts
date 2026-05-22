import { DepartmentRepository } from "../repository/department-repository";

export class GetDeapartmentDetails {
    constructor(private repository: DepartmentRepository) {}

    async execute(staff_id: string) {
        return await this.repository.getDepartmentDetails(staff_id);
    }
}
