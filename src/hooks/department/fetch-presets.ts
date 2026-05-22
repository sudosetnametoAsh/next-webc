import { useQuery } from "@tanstack/react-query";

type FetchedData = {
  data: Preset[]
  id: string
};

type Preset = {
  task_id: string;
  description: string
  title: string;
}


export function useFetchPreset() {
  return useQuery<FetchedData>({
    queryKey: ["preset"],
    queryFn: fetchPreset,
    staleTime: 1000 * 60 * 5
  });
}

export async function fetchPreset(): Promise<FetchedData> {
  const response = await fetch("/api/department/presets");
  const json = await response.json();

  return {
    data: json.data,
    id: json.id
  };
}
