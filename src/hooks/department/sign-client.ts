import { useMutation, useQueryClient } from "@tanstack/react-query";

type Payload = {
  ids: string[];
  status: string;
  signed_at: string | null;
};
export function useSignClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Payload) => {
      const response = await fetch(`/api/department/clients/sign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Unable to sign client");

      return response.json();
    },
  });
}
