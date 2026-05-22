"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useAddStudentTasks } from "@/hooks/department/add-student-tasks";
import { Clipboard, CheckCircle, Upload } from "lucide-react";
import { Dispatch, SetStateAction, useState } from "react";

type CheckedState = boolean | "indeterminate";

type Data = {
  data: Preset[];
  id: string;
};

// 1. Updated to include the new 'title' field!
type Preset = {
  task_id: string;
  title: string;
  description: string;
};

type Props = {
  preset: Data;
  taskId: string[] | null;
  setTaskId: Dispatch<SetStateAction<string[]>>;
  clearanceId: string[];
  description: string;
  sectionId?: string | null;
};

export default function AddPreset({
  preset,
  taskId,
  setTaskId,
  clearanceId,
  description,
  sectionId,
}: Props) {
  const { mutate } = useAddStudentTasks(clearanceId[0] || null, sectionId);
  const [dropboxTasks, setDropboxTasks] = useState<string[]>([]);

  if (!preset) return <div>No preset available</div>;

  const addTask = () => {
    if (clearanceId.length === 0) {
      alert("Select at least one student");
      return;
    }

    const targetTaskIds = taskId && taskId.length > 0 ? taskId : [];

    if (targetTaskIds.length === 0) {
      alert("Please select at least one preset task");
      return;
    }

    const payload = clearanceId.flatMap((student) =>
      targetTaskIds.map((tId) => {
        let finalDescription = description;
        let finalTitle = "Preset Task"; // Fallback title

        if (tId) {
          const taskItem = preset.data.find((item) => item.task_id === tId);
          if (taskItem) {
            finalDescription = taskItem.description;
            finalTitle = taskItem.title; // Extract the title from the preset
          }
        }

        const dropbox = tId && dropboxTasks.includes(tId) ? "pending" : "NULL";

        return {
          clearance_id: student,
          task_id: tId,
          title: finalTitle, // 2. Ensure title is sent to the database!
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

    if (checked === false) {
      setDropboxTasks((prev) => prev.filter((item) => item !== id));
    }
  };

  const handleDropboxToggle = (id: string, checked: boolean) => {
    setDropboxTasks((prev) =>
      checked ? [...prev, id] : prev.filter((item) => item !== id)
    );
  };

  const resetState = () => {
    setTaskId([]);
    setDropboxTasks([]);
  };

  return (
    <div>
      <Dialog onOpenChange={resetState}>
        <DialogTrigger asChild>
          <button className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900">
            <Clipboard className="h-4 w-4" /> Preset
          </button>
        </DialogTrigger>

        <DialogContent className="p-0 overflow-hidden sm:max-w-125 border-none shadow-2xl">
          <DialogHeader className="bg-[#0b3b75] px-6 py-5 text-white">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold tracking-wide">
              <Clipboard className="h-5 w-5" />
              Assign Preset Tasks
            </DialogTitle>
            <p className="text-sm text-blue-200 font-medium">
              Select predefined requirements to assign to {clearanceId.length > 1 ? "students" : "a student"}
            </p>
          </DialogHeader>

          <div className="flex flex-col gap-5 p-6">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                {clearanceId.length > 1 ? "👥" : "👤"}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {clearanceId.length > 1
                    ? `${clearanceId.length} Students Selected`
                    : `Student ID: ${clearanceId[0] || "None Selected"}`}
                </h3>
                <p className="text-xs text-slate-500">
                  {clearanceId.length > 1 ? "Bulk assignment" : "Targeted assignment"}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-700">Available Presets</h4>

              {/* Added min-h-40 so the empty state has room to breathe */}
              <div className="flex min-h-40 max-h-60 flex-col gap-2 overflow-y-auto pr-2 rounded-xl border border-slate-200 bg-slate-50/50 p-2">

                {/* 3. Added the Conditional Fallback Rendering here */}
                {preset?.data?.length > 0 ? (
                  preset.data.map((item) => {
                    const isSelected = taskId?.includes(item.task_id);
                    const isDropboxEnabled = dropboxTasks.includes(item.task_id);

                    return (
                      <div
                        key={item.task_id}
                        className={`flex flex-col gap-3 rounded-lg border p-3 transition-all ${
                          isSelected
                            ? "border-blue-300 bg-blue-50/30 shadow-sm"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            id={`preset-${item.task_id}`}
                            checked={isSelected}
                            onCheckedChange={(checked) => handleOnClick(item.task_id, checked)}
                            className="mt-1 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                          />
                          <label
                            htmlFor={`preset-${item.task_id}`}
                            className="cursor-pointer flex-1 space-y-1"
                          >
                            {/* 4. Display the Title and Description beautifully */}
                            <div className="text-sm font-bold text-slate-800">
                              {item.title}
                            </div>
                            <div className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                              {item.description}
                            </div>
                          </label>
                        </div>

                        {isSelected && (
                          <div className="flex items-center justify-between pl-7 pr-1 pt-1 border-t border-slate-200/60 mt-1">
                            <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                              <Upload className="h-3.5 w-3.5 text-slate-400" />
                              Require File Upload
                            </div>
                            <Switch
                              checked={isDropboxEnabled}
                              onCheckedChange={(checked) => handleDropboxToggle(item.task_id, checked)}
                              className="scale-75 data-[state=checked]:bg-blue-600 origin-right"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  // Fallback Empty State
                  <div className="flex h-full min-h-32 flex-col items-center justify-center gap-2 text-slate-400">
                    <Clipboard className="h-8 w-8 opacity-20" />
                    <p className="text-sm font-medium">No presets configured yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
            <DialogClose asChild>
              <Button variant="outline" className="font-semibold text-slate-700">
                Cancel
              </Button>
            </DialogClose>
            <DialogClose asChild>
              <Button
                onClick={addTask}
                disabled={!taskId || taskId.length === 0}
                className="bg-[#c22d2d] font-semibold text-white hover:bg-[#a32222] gap-2 px-5 disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4" />
                Assign Presets
              </Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
