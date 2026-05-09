import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { useForm } from "@tanstack/react-form";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { useSubmitTask } from "@/hooks/student/submit-task";
import { toast } from "sonner";

export default function DropBox({
  task,
  taskId,
  deptName,
  studentId,
}: {
  task: string;
  taskId: number;
  deptName: string;
  studentId: string;
  dropbox: string | null;
}) {
  const { mutate } = useSubmitTask();

  const form = useForm({
    defaultValues: {
      file: undefined as File | undefined,
    },
    onSubmit: async ({ value }) => {
      if (!value.file) return;

      const formData = new FormData();
      formData.append("file", value.file);
      formData.append("task", task);
      formData.append("taskId", taskId.toString());
      formData.append("department", deptName);
      formData.append("studentId", studentId);

      mutate(formData);
      toast("Task Submitted");
    },
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="w-24 rounded-md bg-slate-900 text-sm font-medium text-white hover:bg-slate-800 cursor-pointer">
          Upload
        </Button>
      </DialogTrigger>

      <DialogContent className="p-6">
        <DialogTitle className="text-slate-900 font-bold mb-4">Submit Task</DialogTitle>
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
                !value ? "File is required" : undefined,
            }}
          >
            {(field) => (
              <div className="flex flex-col gap-2">
                <Input
                  className="cursor-pointer file:text-slate-900"
                  type="file"
                  onChange={(e) => field.handleChange(e.target.files?.[0])}
                />
                {field.state.meta.errors ? (
                  <em className="text-xs text-red-500">{field.state.meta.errors}</em>
                ) : null}
              </div>
            )}
          </form.Field>
        </form>

        <div className="mt-4 flex justify-end">
          <DialogClose asChild>
            <Button
              type="submit"
              form="task-submission-form"
              className="bg-slate-900 text-white hover:bg-slate-800 rounded-md"
            >
              Submit
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
