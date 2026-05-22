import { useQuery } from "@tanstack/react-query";

type FetchedData = {
  description: string;
  dropbox: string;
  status: string;
};

export function useFetchClientTasks(clearanceId: string | null) {
  return useQuery({
    queryKey: ["client-tasks", clearanceId],
    queryFn: async (): Promise<FetchedData[]> => {
      const response = await fetch(
        `/api/department/clients/tasks/${clearanceId}`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch clearance status");
      }

      const data = await response.json();
      return data.data;
    },
    enabled: !!clearanceId,
    staleTime: 1000 * 60 * 5,
  });
}
