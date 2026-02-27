// import { Send } from "lucide-react";
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
  // dropbox,
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

  // const isSubmitted = dropbox !== "pending" ? "#008000" : "#000000";

  return (
    <div className="flex flex-row gap-2">
      <Dialog>
        <DialogTrigger asChild>
          {/* <Send className="cursor-pointer" color={isSubmitted} /> */}
          {<Button className="cursor-pointer">Upload</Button>}
        </DialogTrigger>

        <DialogContent className="p-5!">
          <DialogTitle>Submit Task</DialogTitle>
          <form
            id="task-submission-form"
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
                <Input
                  className="p-10!"
                  type="file"
                  onChange={(e) => field.handleChange(e.target.files?.[0])}
                />
              )}
            </form.Field>
          </form>

          <DialogClose asChild>
            <Button type="submit" form="task-submission-form">
              Submit
            </Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </div>
  );
}
