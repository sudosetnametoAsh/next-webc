// add-preset.tsx
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dispatch, SetStateAction } from "react";

type CheckedState = boolean | "indeterminate"

// 1. Define the shape of a Preset Item (Optional but good for TS)
type PresetItem = {
  task_id: string;
  description: string;
};

type Props = {
    preset: { clearance_tasks_preset: PresetItem[] } | undefined; // 2. Accept preset as prop
    taskId: string[] | null
    setTaskId: Dispatch<SetStateAction<string[]>>
    addTask: () => void
}

export default function AddPreset({ preset, taskId, setTaskId, addTask }: Props) {
    // 3. Removed local fetching logic

    if (!preset) return <div>No preset available</div>

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
                        {preset.clearance_tasks_preset.map((item) => (
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