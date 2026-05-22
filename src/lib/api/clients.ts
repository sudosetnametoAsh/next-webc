import { Students } from "@/types/students";
import { serverFetch } from "./server-fetch";

export async function fetchClientsServer(
  sectionId: string,
): Promise<Students[]> {
  const response = await serverFetch(`/api/department/clients/${sectionId}`);
  const json = await response.json();
  if (!response.ok) throw new Error("Failed to fetch");
  return json.data;
}
