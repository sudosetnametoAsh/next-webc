import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAddStudentTasks } from "@/hooks/department/add-student-tasks";
import { Dispatch, SetStateAction, useState } from "react";

type CheckedState = boolean | "indeterminate";

type Data = {
  data: Preset[];
  id: string;
};

type Preset = {
  task_id: string;
  description: string;
};

type Props = {
  preset: Data;
  taskId: string[] | null;
  setTaskId: Dispatch<SetStateAction<string[]>>;
  clearanceId: string[];
  description: string;
};

export default function AddPreset({
  preset,
  taskId,
  setTaskId,
  clearanceId,
  description,
}: Props) {
  const { mutate } = useAddStudentTasks("243");
  const [hasDropBox, setHasDropBox] = useState<boolean>(false);

  if (!preset) return <div>No preset available</div>;

  const addTask = () => {
    if (clearanceId.length === 0) {
      alert("Select at least one student");
      return;
    }

    const targetTaskIds = taskId && taskId.length > 0 ? taskId : [null];

    const payload = clearanceId.flatMap((student) =>
      targetTaskIds.map((tId) => {
        let finalDescription = description;

        if (tId) {
          const taskItem = preset.data.find((item) => item.task_id === tId);
          finalDescription = taskItem ? taskItem.description : description;
        }
        const dropbox = hasDropBox ? "pending" : "NULL";

        return {
          clearance_id: student,
          task_id: tId,
          description: finalDescription,
          staff_id: preset.id,
          dropbox: dropbox,
        };
      }),
    );

    mutate(payload);
    console.log("Submitted payload: ", payload);
  };

  const handleOnClick = (id: string, checked: CheckedState) => {
    setTaskId((prev) => {
      const current = prev || [];
      return checked === true
        ? [...current, id]
        : current.filter((item) => item !== id);
    });
  };

  return (
    <div>
      <Dialog onOpenChange={() => setTaskId([])}>
        <DialogTrigger asChild>
          <Button className="p-2.5!">Add Preset</Button>
        </DialogTrigger>

        <DialogContent className="p-2.5!">
          <DialogHeader>
            <DialogTitle> Add Preset </DialogTitle>
          </DialogHeader>

          {preset.data.map((item) => (
            <section className="flex flex-row gap-2" key={item.task_id}>
              <Checkbox
                id={`preset-${item.task_id}`}
                checked={taskId?.includes(item.task_id)}
                onCheckedChange={(checked) =>
                  handleOnClick(item.task_id, checked)
                }
              />
              <label
                htmlFor={`preset-${item.task_id}`}
                className="cursor-pointer text-sm"
              >
                {item.description}
              </label>
            </section>
          ))}
          <div className="flex cursor-pointer flex-row gap-2">
            <Checkbox
              id="dropbox"
              checked={hasDropBox}
              onCheckedChange={(checked) => setHasDropBox(!!checked)}
            />
            <Label htmlFor="dropbox">Dropbox</Label>
          </div>

          <Button className="cursor-pointer" onClick={addTask}>
            Submit
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
