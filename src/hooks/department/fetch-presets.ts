import { useQuery } from "@tanstack/react-query";

type FetchedData = {
  data: Preset[]
  id: string
};

type Preset = {
  task_id: string;
  description: string
}


export function useFetchPreset() {
  return useQuery<FetchedData>({
    queryKey: ["preset"],
    queryFn: async () => {
      const response = await fetch("/api/department/presets");
      const json = await response.json();

      return {
        data: json.data,
        id: json.id
      };
    },
  });
}
