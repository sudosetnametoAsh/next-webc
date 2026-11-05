"use client";

import { APP_TIME_ZONE, campusEndOfDay, campusDateInput, taskDeadlineError } from "@/lib/date-time";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAddClientTasks } from "@/hooks/department/add-client-tasks";
import { Clipboard, CheckCircle, Upload, Calendar, Clock, Users } from "lucide-react";
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
      toast.error("Select at least one student");
      return;
    }

    const rawTargetIds = taskId && taskId.length > 0 ? taskId : [];
    const targetTaskIds = rawTargetIds.filter((tId) => {
      const item = preset.data.find((p) => p.task_id === tId);
      return item && !isTaskAlreadyAssigned(item);
    });

    if (targetTaskIds.length === 0) {
      toast.error(
        rawTargetIds.length > 0
          ? "The selected preset requirement(s) are already assigned to this client."
          : "Please select at least one preset task to assign."
      );
      return;
    }

    const dateError = targetTaskIds.map(id => presetDueDates[id] || batchDueDate || '').map(date => taskDeadlineError(date ? campusEndOfDay(date) : null)).find(Boolean);
    if (dateError) { toast.error(dateError); return; }

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
          ? campusEndOfDay(effectiveDueDate)
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
          <button className={buttonClassName || "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-700 hover:text-slate-900"}>
            <Clipboard className="h-4 w-4" /> Preset
          </button>
        </DialogTrigger>

        <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden rounded-2xl border-slate-800 bg-[#0a101f] p-0 text-slate-100 shadow-2xl sm:max-w-xl [&>button]:text-slate-400">
          <DialogHeader className="shrink-0 border-b border-slate-800 px-5 py-5 pr-12 text-left sm:px-6">
            <DialogTitle className="flex items-center gap-3 text-lg font-semibold tracking-tight">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-amber-300"><Clipboard className="h-5 w-5" /></span>
              Assign Preset Tasks
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed text-slate-400">Choose saved requirements and customize their deadlines.</DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-col gap-5 overflow-y-auto p-5 sm:p-6">
            <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-[#070c18] p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-sm font-semibold text-slate-400">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-200">
                  {clearanceId.length > 0
                    ? `${clearanceId.length} ${clearanceId.length === 1 ? "client" : "clients"} selected`
                    : "No clients selected"}
                </h3>
                <p className="text-xs text-slate-500">
                  {clearanceId.length > 1 ? "Assign to all selected clients" : "Assign to the selected client"}
                </p>
              </div>
            </div>

            {/* Batch Due Date (Optional) */}
            <div className="space-y-2 rounded-xl border border-slate-800 bg-[#070c18] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-amber-300" />
                  <Label htmlFor="preset-batch-due-date" className="text-sm font-medium text-slate-200">
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
                min={campusDateInput(new Date())}
                value={batchDueDate}
                onChange={(e) => setBatchDueDate(e.target.value)}
                className="border-slate-700 bg-[#0a101f] text-slate-200 [color-scheme:dark] focus-visible:ring-amber-400/40"
              />
              <p className="text-xs text-slate-500">
                {batchDueDate
                  ? `Selected presets will be due by ${new Date(batchDueDate + "T00:00:00+08:00").toLocaleDateString("en-US", { timeZone: APP_TIME_ZONE, month: "short", day: "numeric", year: "numeric" })}.`
                  : "Leave blank to allow completion until the end of the clearance season."}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3"><h4 className="text-sm font-medium text-slate-300">Available presets</h4><span className="rounded-md border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-xs tabular-nums text-amber-300">{validSelectedCount} selected</span></div>

              {allPresetsAssigned && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-300">
                  <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span>All available preset tasks have already been assigned to this client.</span>
                </div>
              )}

              {/* Added min-h-40 so the empty state has room to breathe */}
              <div className="flex min-h-40 max-h-60 flex-col gap-2 overflow-y-auto pr-2 rounded-xl border border-slate-800 bg-[#070c18] p-2">

                {/* 3. Added the Conditional Fallback Rendering here */}
                {preset?.data?.length > 0 ? (
                  preset.data.map((item) => {
                    const isAssigned = isTaskAlreadyAssigned(item);
                    const isSelected = isAssigned ? false : taskId?.includes(item.task_id);
                    const isDropboxEnabled = dropboxTasks.includes(item.task_id);

                    return (
                      <div
                        key={item.task_id}
                        className={`flex flex-col gap-3 rounded-lg border p-3 transition-ui ${
                          isAssigned
                            ? "border-slate-800 bg-slate-900/50 opacity-75"
                            : isSelected
                            ? "border-amber-400/40 bg-amber-400/5"
                            : "border-slate-800 bg-[#0a101f] hover:border-slate-600"
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
                                ? "mt-1 cursor-not-allowed border-slate-700 bg-slate-800 text-slate-500 data-[state=checked]:bg-slate-700 data-[state=checked]:border-slate-700"
                                : "mt-1 border-slate-600 data-[state=checked]:bg-amber-400 data-[state=checked]:border-amber-400 data-[state=checked]:text-slate-950"
                            }
                          />
                          <label
                            htmlFor={isAssigned ? undefined : `preset-${item.task_id}`}
                            className={`min-w-0 flex-1 space-y-1 ${isAssigned ? "cursor-not-allowed" : "cursor-pointer"}`}
                          >
                            {/* 4. Display the Title and Description beautifully */}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className={`break-words text-sm font-semibold ${isAssigned ? "text-slate-500" : "text-slate-100"}`}>
                                {item.title}
                              </div>
                              {isAssigned && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                                  <CheckCircle className="h-3 w-3 text-emerald-400" />
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
                          <div className="space-y-2 pl-7 pr-1 pt-2 border-t border-slate-800 mt-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
                                <Upload className="h-3.5 w-3.5 text-slate-400" />
                                Require File Upload
                              </div>
                              <Switch
                                aria-label={`Require file upload for ${item.title}`}
                                checked={isDropboxEnabled}
                                onCheckedChange={(checked) => handleDropboxToggle(item.task_id, checked)}
                                className="scale-75 data-[state=checked]:bg-amber-400 origin-right"
                              />
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800">
                              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                <span>Deadline:</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="date"
                                  aria-label={`Deadline for ${item.title}`}
                                  min={campusDateInput(new Date())}
                                  value={presetDueDates[item.task_id] || ""}
                                  onChange={(e) =>
                                    setPresetDueDates((prev) => ({
                                      ...prev,
                                      [item.task_id]: e.target.value,
                                    }))
                                  }
                                  className="h-8 min-w-0 rounded-md border border-slate-700 bg-[#070c18] px-2 text-xs text-slate-300 [color-scheme:dark] focus:border-amber-400 focus:outline-none"
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
                    <p className="text-sm font-medium text-slate-300">No presets configured yet</p><p className="max-w-64 text-center text-xs text-slate-500">Create reusable requirements in Settings &amp; Presets to assign them here.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-slate-800 bg-[#070c18] px-5 py-4 sm:px-6">
            <DialogClose asChild>
              <Button variant="ghost" className="rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white">
                Cancel
              </Button>
            </DialogClose>
            <DialogClose asChild>
              <Button
                onClick={addTask}
                disabled={clearanceId.length === 0 || allPresetsAssigned || validSelectedCount === 0}
                className="gap-2 rounded-lg bg-amber-400 px-5 text-xs font-semibold text-slate-950 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle className="h-4 w-4" />
                Assign {validSelectedCount || ""} {validSelectedCount === 1 ? "preset" : "presets"}
              </Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
