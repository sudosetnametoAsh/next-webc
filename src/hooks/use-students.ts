import { useQuery } from "@tanstack/react-query";

export function useStudents() {
  return useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const res = await fetch("/api/students");
      if (!res.ok) {
        throw new Error("Failed to fetch students");
      }
      return res.json();
    },
  });
}
