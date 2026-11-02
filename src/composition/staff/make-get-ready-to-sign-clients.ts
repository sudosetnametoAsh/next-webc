import { GetReadyToSignClients } from "@/modules/staff/application/use-case/get-ready-to-sign-clients";
import { DrizzleDashBoardRepository } from "@/modules/staff/infrastructure/drizzle-dashboard-repository";

export function makeGetReadyToSignClients() {
  const repository = new DrizzleDashBoardRepository();
  return new GetReadyToSignClients(repository);
}
