import { useQuery } from "@tanstack/react-query";
type FetchedData = {
  staff_id: string;
  clearance_tasks_preset: Preset[];
};

type Preset = {
  task_id: string
  description: string;
};

export function useFetchPreset() {
  return useQuery<FetchedData>({
    queryKey: ["preset"],
    queryFn: async () => {
      const response = await fetch("/api/department/fetch-clearance-preset");
      const json = await response.json();

      return {
        staff_id: json.data[0].staff_id,
        clearance_tasks_preset: json.data[0].clearance_tasks_preset.map(
          (item: Preset) => ({
            task_id: item.task_id,
            description: item.description,
          })
        ),
      };
    },
  });
}
