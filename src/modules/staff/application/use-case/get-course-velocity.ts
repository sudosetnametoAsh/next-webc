import { DrizzleDashBoardRepository } from "../../infrastructure/drizzle-dashboard-repository";

export class GetCourseVelocity {
  constructor(private repository: DrizzleDashBoardRepository) {}

  async execute(staffId: string) {
    return await this.repository.getCourseVelocity(staffId);
  }
}
