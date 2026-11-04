import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "Unable to sign client");
      }

      return response.json();
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["department-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["department-client-progress"] });
      queryClient.invalidateQueries({ queryKey: ["department-clients"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["staff-clearance"] });
    },
  });
}
