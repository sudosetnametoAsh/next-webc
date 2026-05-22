"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea"; // Make sure to install this
import { useAddStudentTasks } from "@/hooks/department/add-student-tasks";
import { DialogClose, DialogTitle } from "@radix-ui/react-dialog";
import { Plus, Upload, CheckCircle } from "lucide-react";
import { Dispatch, SetStateAction, useState } from "react";

type Props = {
  preset: Data;
  clearanceId: string[];
  taskId: string[];
  description: string;
  setDescription: Dispatch<SetStateAction<string>>;
  title: string;
  setTitle: Dispatch<SetStateAction<string>>;
  sectionId?: string | null;
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
  title,
  setTitle,
  sectionId,
}: Props) {
  const { mutate } = useAddStudentTasks(clearanceId[0] || null, sectionId);

  const [hasDropBox, setHasDropBox] = useState<boolean>(false);
  // Optional: Add a state for the detailed description if needed in the future.
  // const [detailedDesc, setDetailedDesc] = useState<string>("");

  const addTask = () => {
    if (clearanceId.length === 0) {
      alert("Select at least one student");
      return;
    }

    // Added validation for the new title state
    if (title.trim() === "" || description.trim() === "") {
      return alert("Title and Description cannot be empty");
    }

    const targetTaskIds = taskId && taskId.length > 0 ? taskId : [null];

    const payload = clearanceId.flatMap((student) =>
      targetTaskIds.map((tId) => {
        let finalDescription = description;
        const finalTitle = title; // Default to the manual title state

        // If a preset is selected, use the preset's description
        // (and preset's title if you add it to your Preset type later)
        if (tId) {
          const taskItem = preset.data.find((item) => item.task_id === tId);
          finalDescription = taskItem ? taskItem.description : description;

          // Optional: If your preset data eventually includes a title, uncomment this:
          // finalTitle = (taskItem as any).title ? (taskItem as any).title : title;
        }

        const dropbox = hasDropBox ? "pending" : "NULL";

        return {
          clearance_id: student,
          task_id: tId,
          title: finalTitle, // <-- Added to payload
          description: finalDescription,
          staff_id: preset.id,
          dropbox: dropbox,
        };
      }),
    );

    mutate(payload);
    console.log("Submitted payload: ", payload);

    setTitle("");
    setDescription("");
    setHasDropBox(false);
  };

  return (
    <div className="">
      <Dialog>
        <DialogTrigger asChild>
          <button className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900">
            <Plus className="h-4 w-4" /> Task
          </button>
        </DialogTrigger>

        <DialogContent className="overflow-hidden border-none p-0 shadow-2xl sm:max-w-125">
          {/* Deep Blue Header */}
          <DialogHeader className="bg-[#0b3b75] px-6 py-5 text-white">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold tracking-wide">
              <Plus className="h-5 w-5" />
              Assign New Task
            </DialogTitle>
            <p className="text-sm font-medium text-blue-200">
              Assign a new clearance task to{" "}
              {clearanceId.length > 1 ? "students" : "a student"}
            </p>
          </DialogHeader>

          <div className="flex flex-col gap-6 p-6">
            {/* Student Target Indicator Card */}
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                {clearanceId.length > 1 ? "👥" : "👤"}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {clearanceId.length > 1
                    ? `${clearanceId.length} Students Selected`
                    : `Clearance ID: ${clearanceId[0] || "None Selected"}`}
                </h3>
                <p className="text-xs text-slate-500">
                  {clearanceId.length > 1
                    ? "Bulk assignment"
                    : "Targeted assignment"}
                </p>
              </div>
            </div>

            {/* Task Title (Mapped to existing 'description' state) */}
            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-700">
                Task Title <span className="text-red-500">*</span>
              </Label>
              <Input
                className="focus-visible:ring-blue-600"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Submit Library Clearance Form"
              />
            </div>

            {/* Task Description */}
            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-700">
                Description
              </Label>
              {/* <Input
                className="focus-visible:ring-blue-600"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Submit Library Clearance Form"
              /> */}
              <Textarea
                className="min-h-25 resize-none placeholder:text-slate-400 focus-visible:ring-blue-600"
                placeholder="Provide details about this task..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Dropbox Toggle Panel */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-4 shadow-sm transition-colors hover:bg-slate-50">
              <div className="flex items-start gap-3">
                <Upload className="mt-0.5 h-5 w-5 text-blue-600" />
                <div className="space-y-1">
                  <Label
                    htmlFor="dropbox-switch"
                    className="cursor-pointer text-sm font-bold text-slate-900"
                  >
                    Enable Dropbox Submission
                  </Label>
                  <p className="text-xs text-slate-500">
                    Allow students to upload files
                  </p>
                </div>
              </div>
              <Switch
                id="dropbox-switch"
                checked={hasDropBox}
                onCheckedChange={setHasDropBox}
                className="data-[state=checked]:bg-blue-600"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-100 px-6 py-4">
            <DialogClose asChild>
              <Button
                variant="outline"
                className="font-semibold text-slate-700 cursor-pointer"

              >
                Cancel
              </Button>
            </DialogClose>
            <DialogClose asChild>
              <Button
                onClick={addTask}
                className="gap-2 bg-[#0b3b75] px-5 font-semibold text-white cursor-pointer hover:bg-[#1d5ead]"
              >
                <CheckCircle className="h-4 w-4" />
                Assign Task
              </Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
