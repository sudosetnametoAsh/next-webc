import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAddStudentTasks } from "@/hooks/department/add-student-tasks";
import { Dispatch, SetStateAction } from "react";

type Props = {
    preset: Data
    clearanceId: string[]
    taskId: string[]
    description: string
    setDescription: Dispatch<SetStateAction<string>>
}

type Data = {
    data: Preset[];
    id: string;
}

type Preset = {
    task_id: string;
    description: string;
}

export default function AddTask({ preset, clearanceId, taskId, description, setDescription }: Props) {
    const { mutate } = useAddStudentTasks("243")


    const addTask = () => {
        if (clearanceId.length === 0) {
            alert("Select at least one student");
            return
        }

        const targetTaskIds = (taskId && taskId.length > 0) ? taskId : [null];

        const payload = clearanceId.flatMap((student) =>
            targetTaskIds.map((tId) => {
                let finalDescription = description;

                if (tId) {
                    const taskItem = preset.data.find(item => item.task_id === tId);
                    finalDescription = taskItem ? taskItem.description : description;
                }

                return {
                    clearance_id: student,
                    task_id: tId,
                    description: finalDescription,
                    staff_id: preset.id
                };
            })
        );

        mutate(payload);
        console.log("Submitted payload: ", payload)
    };

    return (
        <div className="">
            <Popover>
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
            </Popover>
        </div>

    )
}
