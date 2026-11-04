import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

type ApiResponse = {
  url: string;
};

export function useSubmitTask() {
  return useMutation<ApiResponse, Error, FormData>({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/student/submissions", {
        method: "POST",
        body: formData,
      });

      if (!response.ok)
        throw new Error(
          "An error occured submitting your task, please try again",
        );

      return response.json();
    },
    onSuccess: () => toast.success("Document submitted for review"),
    onError: (error) => toast.error(error.message),
  });
}
