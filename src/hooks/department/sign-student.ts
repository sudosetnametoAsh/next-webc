import { useMutation, useQueryClient } from "@tanstack/react-query";

type Payload = {
  ids: string[];
  status: string;
};
export function useSignStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Payload) => {
      const response = await fetch(`/api/department/students/sign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Unable to sign student");

      return response.json;
    },
  });
}
