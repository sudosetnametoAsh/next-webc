import { DrizzleDashBoardRepository } from "../../infrastructure/drizzle-dashboard-repository";

export class GetReadyToSignClients {
  constructor(private repository: DrizzleDashBoardRepository) {}

  async execute(staffId: string) {
    return await this.repository.getReadyToSignClients(staffId);
  }
}
