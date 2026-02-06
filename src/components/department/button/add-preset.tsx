import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
   Popover,
   PopoverContent,
   PopoverTrigger,
} from '@/components/ui/popover';
import { useAddStudentTasks } from '@/hooks/department/add-student-tasks';
import { Dispatch, SetStateAction } from 'react';

type CheckedState = boolean | 'indeterminate';

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
   const { mutate } = useAddStudentTasks('243');

   if (!preset) return <div>No preset available</div>;

   const addTask = () => {
      if (clearanceId.length === 0) {
         alert('Select at least one student');
         return;
      }

      const targetTaskIds = taskId && taskId.length > 0 ? taskId : [null];

      const payload = clearanceId.flatMap((student) =>
         targetTaskIds.map((tId) => {
            let finalDescription = description;

            if (tId) {
               const taskItem = preset.data.find(
                  (item) => item.task_id === tId,
               );
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
      console.log('Submitted payload: ', payload);
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
         <Popover>
            <PopoverTrigger asChild>
               <Button className="p-2.5!">Add Preset</Button>
            </PopoverTrigger>
            <PopoverContent>
               <div className="flex flex-col gap-2">
                  {preset.data.map((item) => (
                     <div
                        key={item.task_id}
                        className="flex items-center gap-2"
                     >
                        <Checkbox
                           id={`preset-${item.task_id}`}
                           checked={taskId?.includes(item.task_id)}
                           onCheckedChange={(checked) =>
                              handleOnClick(item.task_id, checked)
                           }
                        />
                        <label
                           htmlFor={`preset-${item.task_id}`}
                           className="text-sm cursor-pointer"
                        >
                           {item.description}
                        </label>
                     </div>
                  ))}
                  <Button onClick={addTask} className="mt-2">
                     Submit
                  </Button>
               </div>
            </PopoverContent>
         </Popover>
      </div>
   );
}
