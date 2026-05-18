import { Dialog, DialogContent, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { useForm } from "@tanstack/react-form";
import { useSubmitTask } from "@/hooks/student/submit-task";
import { toast } from "sonner";
import { Upload, FileText } from "lucide-react";

export default function TaskSubmissionModal({
  isOpen,
  onClose,
  taskTitle,
  taskId,
  deptName,
  studentId,
}: {
  isOpen: boolean;
  onClose: () => void;
  taskTitle: string;
  taskId: number;
  deptName: string;
  studentId: string;
}) {
  const { mutate, isPending } = useSubmitTask();

  const form = useForm({
    defaultValues: {
      file: undefined as File | undefined,
    },
    onSubmit: async ({ value }) => {
      if (!value.file) return;

      const formData = new FormData();
      formData.append("file", value.file);
      formData.append("task", taskTitle);
      formData.append("taskId", taskId.toString());
      formData.append("department", deptName);
      formData.append("studentId", studentId);

      mutate(formData, {
        onSuccess: () => {
          toast.success("Task submitted successfully!");
          form.reset();
          onClose(); // Close the modal on success
        },
        onError: () => {
          toast.error("Failed to submit task. Please try again.");
        },
      });
    },
  });

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          form.reset();
          onClose();
        }
      }}
    >
      <DialogContent className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl [&>button]:hidden">
        <div className="mb-2">
          <DialogTitle className="text-lg font-bold text-gray-900">
            Submit Requirement
          </DialogTitle>
        </div>

        <div className="mb-6 flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-500">Task:</span>
          <p className="rounded-lg border bg-gray-50 p-3 text-sm font-semibold text-gray-900">
            {taskTitle}
          </p>
        </div>

        <form
          id="task-submission-form"
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <form.Field
            name="file"
            validators={{
              onSubmit: ({ value }) =>
                !value ? "A file is required to submit." : undefined,
            }}
          >
            {(field) => (
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="file-upload"
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
                    field.state.meta.errors
                      ? "border-red-400 bg-red-50 hover:bg-red-100"
                      : "border-gray-300 bg-gray-50 hover:border-blue-500 hover:bg-blue-50"
                  }`}
                >
                  {field.state.value ? (
                    <div className="flex flex-col items-center text-center">
                      <FileText className="mb-2 text-blue-500" size={32} />
                      <p className="text-sm font-medium text-gray-900">
                        {field.state.value.name}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">Click to change file</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center">
                      <Upload className="mb-2 text-gray-400" size={32} />
                      <p className="text-sm font-medium text-gray-600">
                        Click to upload or drag and drop
                      </p>
                      <p className="mt-1 text-xs text-gray-400">PDF, PNG, JPG (max. 5MB)</p>
                    </div>
                  )}

                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) field.handleChange(file);
                    }}
                  />
                </label>

                {field.state.meta.errors ? (
                  <em className="text-sm font-medium text-red-500">
                    {field.state.meta.errors}
                  </em>
                ) : null}
              </div>
            )}
          </form.Field>
        </form>

        <div className="mt-6 flex gap-3">
          <DialogClose asChild>
            <button
              type="button"
              className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
          </DialogClose>
          <button
            type="submit"
            form="task-submission-form"
            disabled={isPending || form.state.isSubmitting}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? "Submitting..." : "Confirm Submission"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
