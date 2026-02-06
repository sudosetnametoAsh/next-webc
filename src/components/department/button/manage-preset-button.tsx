import { Button } from '@/components/ui/button';
import {
   Dialog,
   DialogClose,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
   DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAddTaskPreset } from '@/hooks/department/add-task-preset';
import { useDeleteTaskPreset } from '@/hooks/department/delete-task-preset';
import { useUpdateTaskPreset } from '@/hooks/department/update-task-preset';
import { SquarePen, Trash2 } from 'lucide-react';
import { useState } from 'react';

type Data = {
   data: Preset[];
   id: string;
};

type Preset = {
   task_id: string;
   description: string;
};

export default function ManagePresetButton({ preset }: { preset: Data }) {
   const { mutate: addTaskPreset } = useAddTaskPreset();
   const { mutate: deleteTaskPreset } = useDeleteTaskPreset();
   const { mutate: updateTaskPreset } = useUpdateTaskPreset();

   // Add task states
   const [addTaskDescription, setAddTaskDescription] = useState<string>('');
   // Edit task states
   const [editPresetId, setEditPresetId] = useState<string | null>(null);
   const [editingDescription, setEditingDesciption] = useState<string>('');

   const submitTaskPreset = () => {
      if (addTaskDescription.trim() === '') {
         return alert('Please enter description');
      }

      addTaskPreset({ description: addTaskDescription });
      setAddTaskDescription('');
   };

   const saveUpdatedTaskPreset = (taskId: string) => {
      if (editingDescription.trim() === '') {
         return alert('Description cannot be empty while editing');
      }
      updateTaskPreset({
         updatedDescription: editingDescription,
         task_id: taskId,
      });
      setEditingDesciption('');
      setEditPresetId(null);
   };

   const editMode = (item: Preset) => {
      return (
         <>
            <Input
               autoFocus
               value={editingDescription}
               onChange={(e) => setEditingDesciption(e.target.value)}
               className="pl-2!"
            />

            <div className="flex ml-auto! gap-2">
               <Button
                  variant={'outline'}
                  className="p-2.5!"
                  onClick={() => {
                     setEditPresetId(null);
                     setEditingDesciption('');
                  }}
               >
                  Cancel
               </Button>
               <Button
                  className="p-2.5!"
                  onClick={() => saveUpdatedTaskPreset(item.task_id)}
               >
                  Save
               </Button>
            </div>
         </>
      );
   };

   const viewMode = (item: Preset) => {
      return (
         <>
            <span>{item.description}</span>
            <div className="flex ml-auto! gap-2">
               <SquarePen
                  className="cursor-pointer hover:text-blue-500 duration-350"
                  onClick={() => {
                     setEditPresetId(item.task_id);
                     setEditingDesciption(item.description);
                  }}
               />
               <Trash2
                  onClick={() =>
                     deleteTaskPreset({
                        task_id: item.task_id,
                     })
                  }
                  className="hover:text-red-500 cursor-pointer duration-350"
               />
            </div>
         </>
      );
   };

   return (
      <div>
         <Dialog>
            <DialogTrigger asChild>
               <Button className="p-2.5!"> Manage Preset</Button>
            </DialogTrigger>

            <DialogContent className="w-150 h-120 p-5!">
               <DialogHeader className="">
                  <DialogTitle>Task Preset Manager</DialogTitle>
                  <DialogDescription>
                     Create and manage task for quick assigment
                  </DialogDescription>

                  {/* Existing Preset */}
                  <main className="h-57">
                     <span className="text-[20px] font-semibold">
                        Existing Preset
                     </span>

                     <section className="border-2 h-50 p-2.5! overflow-scroll">
                        {preset.data.length !== 0 ? (
                           preset.data.map((item) => (
                              <div
                                 key={item.task_id}
                                 className={`flex items-center min-h-20 border-2 p-2.5! mb-2! gap-2 transition-all duration-900 ease-in-out ${editPresetId === item.task_id ? 'opacity-100 translate-y-0' : 'opacity-100 translate-y-0'}`}
                              >
                                 {editPresetId === item.task_id
                                    ? editMode(item)
                                    : viewMode(item)}
                              </div>
                           ))
                        ) : (
                           <div className="flex h-full items-center justify-center font-bold">
                              No
                           </div>
                        )}
                     </section>
                  </main>

                  {/* Create Preset */}
                  <section className="flex flex-col gap-3">
                     <span className="text-[20px] font-semibold">
                        Create Preset
                     </span>

                     <Input
                        value={addTaskDescription}
                        onChange={(e) => setAddTaskDescription(e.target.value)}
                        placeholder="Task description"
                        className="pl-2!"
                     />

                     <div className="flex justify-end gap-2">
                        <DialogClose asChild>
                           <Button variant={'outline'} className="p-2.5!">
                              Cancel
                           </Button>
                        </DialogClose>

                        <Button
                           onClick={submitTaskPreset}
                           variant={'default'}
                           className="p-2.5!"
                        >
                           Submit
                        </Button>
                     </div>
                  </section>
               </DialogHeader>
            </DialogContent>
         </Dialog>
      </div>
   );
}
