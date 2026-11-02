import { GetDepartmentReport } from "@/modules/staff/application/use-case/get-department-report";
import { DrizzleDashBoardRepository } from "@/modules/staff/infrastructure/drizzle-dashboard-repository";

export function makeGetDepartmentReport() {
  const repository = new DrizzleDashBoardRepository();
  return new GetDepartmentReport(repository);
}
