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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAddClientTasks } from "@/hooks/department/add-client-tasks";
import { Clipboard, CheckCircle, Upload, Calendar, Clock } from "lucide-react";
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
  buttonClassName?: string;
  existingTasks?: { task_id?: number | string | null; title: string }[];
};

export default function AddPreset({
  preset,
  taskId,
  setTaskId,
  clearanceId,
  description,
  sectionId,
  buttonClassName,
  existingTasks,
}: Props) {
  const { mutate } = useAddClientTasks(clearanceId[0] || null, sectionId);
  const [dropboxTasks, setDropboxTasks] = useState<string[]>([]);
  const [batchDueDate, setBatchDueDate] = useState<string>("");
  const [presetDueDates, setPresetDueDates] = useState<Record<string, string>>({});

  const isTaskAlreadyAssigned = (item: Preset) => {
    if (!existingTasks || existingTasks.length === 0) return false;
    return existingTasks.some((t) => {
      if (t.task_id != null && item.task_id != null && String(t.task_id) === String(item.task_id)) {
        return true;
      }
      if (t.title && item.title && t.title.trim().toLowerCase() === item.title.trim().toLowerCase()) {
        return true;
      }
      return false;
    });
  };

  const allPresetsAssigned =
    preset?.data?.length > 0 && preset.data.every(isTaskAlreadyAssigned);

  const validSelectedCount = (taskId || []).filter((tId) => {
    const item = preset?.data?.find((p) => p.task_id === tId);
    return item && !isTaskAlreadyAssigned(item);
  }).length;

  if (!preset) return <div>No preset available</div>;

  const addTask = () => {
    if (clearanceId.length === 0) {
      alert("Select at least one student");
      return;
    }

    const rawTargetIds = taskId && taskId.length > 0 ? taskId : [];
    const targetTaskIds = rawTargetIds.filter((tId) => {
      const item = preset.data.find((p) => p.task_id === tId);
      return item && !isTaskAlreadyAssigned(item);
    });

    if (targetTaskIds.length === 0) {
      alert(
        rawTargetIds.length > 0
          ? "The selected preset requirement(s) are already assigned to this client."
          : "Please select at least one preset task to assign."
      );
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

        // Determine effective due date (custom per-preset override -> batch due date -> null)
        const effectiveDueDate = (tId && presetDueDates[tId]) || batchDueDate || null;
        const formattedDueDate = effectiveDueDate
          ? new Date(`${effectiveDueDate}T23:59:59Z`).toISOString()
          : null;

        return {
          clearance_id: student,
          task_id: tId,
          title: finalTitle, // 2. Ensure title is sent to the database!
          description: finalDescription,
          staff_id: preset.id,
          dropbox: dropbox,
          due_date: formattedDueDate,
        };
      }),
    );

    mutate(payload);
    console.log("Submitted payload: ", payload);
  };

  const handleOnClick = (id: string, checked: CheckedState) => {
    const item = preset.data.find((p) => p.task_id === id);
    if (item && isTaskAlreadyAssigned(item)) {
      return;
    }

    setTaskId((prev) => {
      const current = prev || [];
      return checked === true
        ? [...current, id]
        : current.filter((item) => item !== id);
    });

    if (checked === false) {
      setDropboxTasks((prev) => prev.filter((item) => item !== id));
      setPresetDueDates((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
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
    setBatchDueDate("");
    setPresetDueDates({});
  };

  return (
    <div>
      <Dialog onOpenChange={resetState}>
        <DialogTrigger asChild>
          <button className={buttonClassName || "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"}>
            <Clipboard className="h-4 w-4" /> Preset
          </button>
        </DialogTrigger>

        <DialogContent className="p-0 overflow-hidden sm:max-w-125 border-none shadow-2xl">
          <DialogHeader className="bg-[#0a1128] px-6 py-5 text-white">
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

            {/* Batch Due Date (Optional) */}
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <Label htmlFor="preset-batch-due-date" className="text-sm font-bold text-slate-900">
                    Batch Due Date <span className="text-xs font-normal text-slate-500">(Optional)</span>
                  </Label>
                </div>
                {batchDueDate && (
                  <button
                    type="button"
                    onClick={() => setBatchDueDate("")}
                    className="text-xs font-medium text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    Clear date
                  </button>
                )}
              </div>
              <Input
                id="preset-batch-due-date"
                type="date"
                min={new Date().toISOString().split("T")[0]}
                value={batchDueDate}
                onChange={(e) => setBatchDueDate(e.target.value)}
                className="bg-white border-slate-200 text-slate-800 focus-visible:ring-blue-600"
              />
              <p className="text-xs text-slate-500">
                {batchDueDate
                  ? `Selected presets will be due by ${new Date(batchDueDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.`
                  : "Leave blank to allow completion until the end of the clearance season."}
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-700">Available Presets</h4>

              {allPresetsAssigned && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-800">
                  <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>All available preset tasks have already been assigned to this client.</span>
                </div>
              )}

              {/* Added min-h-40 so the empty state has room to breathe */}
              <div className="flex min-h-40 max-h-60 flex-col gap-2 overflow-y-auto pr-2 rounded-xl border border-slate-200 bg-slate-50/50 p-2">

                {/* 3. Added the Conditional Fallback Rendering here */}
                {preset?.data?.length > 0 ? (
                  preset.data.map((item) => {
                    const isAssigned = isTaskAlreadyAssigned(item);
                    const isSelected = isAssigned ? false : taskId?.includes(item.task_id);
                    const isDropboxEnabled = dropboxTasks.includes(item.task_id);

                    return (
                      <div
                        key={item.task_id}
                        className={`flex flex-col gap-3 rounded-lg border p-3 transition-all ${
                          isAssigned
                            ? "border-slate-200 bg-slate-100/70 opacity-75"
                            : isSelected
                            ? "border-blue-300 bg-blue-50/30 shadow-sm"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            id={`preset-${item.task_id}`}
                            checked={isAssigned || isSelected}
                            disabled={isAssigned}
                            onCheckedChange={(checked) => !isAssigned && handleOnClick(item.task_id, checked)}
                            className={
                              isAssigned
                                ? "mt-1 cursor-not-allowed border-slate-300 bg-slate-200 text-slate-500 data-[state=checked]:bg-slate-400 data-[state=checked]:border-slate-400"
                                : "mt-1 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                            }
                          />
                          <label
                            htmlFor={isAssigned ? undefined : `preset-${item.task_id}`}
                            className={`flex-1 space-y-1 ${isAssigned ? "cursor-not-allowed" : "cursor-pointer"}`}
                          >
                            {/* 4. Display the Title and Description beautifully */}
                            <div className="flex items-center justify-between gap-2">
                              <div className={`text-sm font-bold ${isAssigned ? "text-slate-500" : "text-slate-800"}`}>
                                {item.title}
                              </div>
                              {isAssigned && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                  <CheckCircle className="h-3 w-3 text-emerald-600" />
                                  Already assigned
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                              {item.description}
                            </div>
                          </label>
                        </div>

                        {!isAssigned && isSelected && (
                          <div className="space-y-2 pl-7 pr-1 pt-2 border-t border-slate-200/60 mt-1">
                            <div className="flex items-center justify-between">
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

                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                <span>Deadline:</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="date"
                                  min={new Date().toISOString().split("T")[0]}
                                  value={presetDueDates[item.task_id] || ""}
                                  onChange={(e) =>
                                    setPresetDueDates((prev) => ({
                                      ...prev,
                                      [item.task_id]: e.target.value,
                                    }))
                                  }
                                  className="h-7 rounded border border-slate-200 bg-white px-2 text-[11px] text-slate-700 shadow-xs focus:border-blue-600 focus:outline-none"
                                />
                                {presetDueDates[item.task_id] ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPresetDueDates((prev) => {
                                        const copy = { ...prev };
                                        delete copy[item.task_id];
                                        return copy;
                                      })
                                    }
                                    className="text-[10px] text-slate-400 hover:text-rose-600 cursor-pointer"
                                    title="Reset to batch deadline"
                                  >
                                    Reset
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">
                                    {batchDueDate ? "Using batch date" : "Season default"}
                                  </span>
                                )}
                              </div>
                            </div>
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
                disabled={allPresetsAssigned || validSelectedCount === 0}
                className="bg-[#0b3b75] font-semibold text-white hover:bg-[#0b3b75] gap-2 px-5 disabled:opacity-50 disabled:cursor-not-allowed"
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
