import { FetchedData, FetchedDataSchema } from "@/types/student/student-data";
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
    // select: (data) => {
    //   return {
    //     userData: {
    //       name: data.name,
    //       id: data.id,
    //       balance: data.balance,
    //     },
    //     students: data.students,
    //   };
    // },
    staleTime: 1000 * 60 * 5,
  });
}
