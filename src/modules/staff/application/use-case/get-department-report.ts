import { DrizzleDashBoardRepository } from "../../infrastructure/drizzle-dashboard-repository";

export class GetDepartmentReport {
  constructor(private repository: DrizzleDashBoardRepository) {}

  async execute(staffId: string, departmentName?: string) {
    return await this.repository.getDepartmentReport(staffId, departmentName);
  }
}
