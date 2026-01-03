import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAddStudentTasks } from "@/hooks/department/add-student-tasks";
import { Dispatch, SetStateAction } from "react";

type CheckedState = boolean | "indeterminate"

// 1. Define the shape of a Preset Item (Optional but good for TS)
type Data = {
    data: Preset[]
    id: string
};

type Preset = {
    task_id: string;
    description: string;
}

type Props = {
    preset: Data
    taskId: string[] | null
    setTaskId: Dispatch<SetStateAction<string[]>>;
    clearanceId: string[];
    description: string
}

export default function AddPreset({ preset, taskId, setTaskId, clearanceId, description }: Props) {
    const { mutate } = useAddStudentTasks("243")

    // 3. Removed local fetching logic

    if (!preset) return <div>No preset available</div>

    const addTask = () => {
        if (clearanceId.length === 0) {
            alert("Select at least one student");
            return
        }

        // Determine if we are using presets or custom task
        const targetTaskIds = (taskId && taskId.length > 0) ? taskId : [null];

        const payload = clearanceId.flatMap((student) =>
            targetTaskIds.map((tId) => {
                // 3. Logic to find the correct description
                let finalDescription = description;

                if (tId) {
                    // If tId is not null, find the matching preset description
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

    const handleOnClick = (id: string, checked: CheckedState) => {
        setTaskId((prev) => {
            const current = prev || [];
            return checked === true
                ? [...current, id]
                : current.filter((item) => item !== id)
        });
    }

    return (
        <div>
            <Popover>
                <PopoverTrigger asChild>
                    <Button>Add Preset</Button>
                </PopoverTrigger>
                <PopoverContent>
                    <div className="flex flex-col gap-2">
                        {preset.data.map((item) => (
                            <div key={item.task_id} className="flex items-center gap-2">
                                <Checkbox
                                    id={`preset-${item.task_id}`}
                                    checked={taskId?.includes(item.task_id)}
                                    onCheckedChange={(checked) => handleOnClick(item.task_id, checked)}
                                />
                                <label
                                    htmlFor={`preset-${item.task_id}`}
                                    className="text-sm cursor-pointer"
                                >
                                    {item.description}
                                </label>
                            </div>
                        ))}
                        <Button onClick={addTask} className="mt-2">Submit</Button>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}