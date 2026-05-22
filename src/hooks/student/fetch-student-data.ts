import { FetchedData, FetchedDataSchema } from "@/types/client/student-data";
import { useQuery } from "@tanstack/react-query";

export function useFetchRecords() {
  return useQuery<FetchedData>({
    queryKey: ["students"],
    queryFn: async () => {
      const res = await fetch("/api/student");
      if (!res.ok) throw new Error("Failed to fetch students");

      const json = await res.json();
      const parsed = FetchedDataSchema.parse(json);

      return {
        userData: parsed.user_data,
        students: parsed.data,
      };
    },
    staleTime: 1000 * 60 * 5,
  });
}
