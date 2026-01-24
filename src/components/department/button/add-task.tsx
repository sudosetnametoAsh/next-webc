import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAddStudentTasks } from "@/hooks/department/add-student-tasks";
import { DialogTitle } from "@radix-ui/react-dialog";
import { Dispatch, SetStateAction } from "react";

type Props = {
  preset: Data;
  clearanceId: string[];
  taskId: string[];
  description: string;
  setDescription: Dispatch<SetStateAction<string>>;
};

type Data = {
  data: Preset[];
  id: string;
};

type Preset = {
  task_id: string;
  description: string;
};

export default function AddTask({
  preset,
  clearanceId,
  taskId,
  description,
  setDescription,
}: Props) {
  const { mutate } = useAddStudentTasks("243");

  const addTask = () => {
    if (clearanceId.length === 0) {
      alert("Select at least one student");
      return;
    }

    if (description.trim() === "") {
      return alert("Description cannot be empty");
    }

    const targetTaskIds = taskId && taskId.length > 0 ? taskId : [null];

    const payload = clearanceId.flatMap((student) =>
      targetTaskIds.map((tId) => {
        let finalDescription = description;

        if (tId) {
          const taskItem = preset.data.find((item) => item.task_id === tId);
          finalDescription = taskItem ? taskItem.description : description;
        }

        return {
          clearance_id: student,
          task_id: tId,
          description: finalDescription,
          staff_id: preset.id,
        };
      }),
    );

    mutate(payload);
    console.log("Submitted payload: ", payload);
  };

  return (
    <div className="">
      {/* <Popover>
                <PopoverTrigger asChild>
                    <Button className="p-2.5!">Add Task</Button>
                </PopoverTrigger>
                <PopoverContent>
                    <Input
                        className="col-span-2 h-8"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="e.g., Submit paperworks"
                    />
                    <Button onClick={addTask}>Assign Task</Button>
                </PopoverContent>
            </Popover> */}

      <Dialog>
        <DialogTrigger asChild>
          <Button className="p-2.5!">Add Task</Button>
        </DialogTrigger>

        <DialogContent className="p-2.5!">
          <DialogHeader>
            <DialogTitle className="text-bold">
              Add custom task to
              {clearanceId.length > 1 ? " students" : " student"}
            </DialogTitle>
          </DialogHeader>

          <Input
            className="pl-2.5!"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Submit paperworks"
          />
          <Button onClick={addTask}>Assign Task</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
