import { DashBoardRepository } from "../repository/dashboard-repository";

export class GetClearanceRecords {
  constructor(private repository: DashBoardRepository) {}

  async execute() {
    return await this.repository.getClearanceRecords();
  }
}
