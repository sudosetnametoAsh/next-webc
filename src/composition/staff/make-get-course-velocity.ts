import { GetCourseVelocity } from "@/modules/staff/application/use-case/get-course-velocity";
import { DrizzleDashBoardRepository } from "@/modules/staff/infrastructure/drizzle-dashboard-repository";

export function makeGetCourseVelocity() {
  const repository = new DrizzleDashBoardRepository();
  return new GetCourseVelocity(repository);
}
