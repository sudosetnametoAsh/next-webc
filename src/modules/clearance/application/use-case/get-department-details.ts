import { DepartmentRepository } from "../repository/department-repository";

export class GetDeapartmentDetails {
    constructor(private repository: DepartmentRepository) {}

    async execute(staff_id: string, clearance_id?: number) {
        return await this.repository.getDepartmentDetails(staff_id, clearance_id);
    }
}
