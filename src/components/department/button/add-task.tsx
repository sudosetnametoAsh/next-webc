"use client";

import { APP_TIME_ZONE, campusEndOfDay } from "@/lib/date-time";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea"; // Make sure to install this
import { useAddClientTasks } from "@/hooks/department/add-client-tasks";
import { DialogClose, DialogTitle } from "@radix-ui/react-dialog";
import { Plus, Upload, CheckCircle, Calendar, Users } from "lucide-react";
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
  buttonClassName?: string;
  existingTasks?: { task_id?: number | string | null; title: string }[];
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
  buttonClassName,
  existingTasks,
}: Props) {
  const { mutate } = useAddClientTasks(clearanceId[0] || null, sectionId);

  const [hasDropBox, setHasDropBox] = useState<boolean>(false);
  const [dueDate, setDueDate] = useState<string>("");

  const isTitleDuplicate = Boolean(
    title.trim() &&
    existingTasks?.some(
      (t) => t.title && t.title.trim().toLowerCase() === title.trim().toLowerCase()
    )
  );

  const addTask = () => {
    if (clearanceId.length === 0) {
      toast.error("Select at least one student");
      return;
    }

    if (isTitleDuplicate) {
      toast.error("A task with this title has already been assigned to this client.");
      return;
    }

    // Added validation for the new title state
    if (title.trim() === "" || description.trim() === "") {
      return toast.error("Title and Description cannot be empty");
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
        // The selected deadline is end of day in the user's local timezone.
        const formattedDueDate = dueDate ? campusEndOfDay(dueDate) : null;

        return {
          clearance_id: student,
          task_id: tId,
          title: finalTitle, // <-- Added to payload
          description: finalDescription,
          staff_id: preset.id,
          dropbox: dropbox,
          due_date: formattedDueDate,
        };
      }),
    );

    mutate(payload);
    console.log("Submitted payload: ", payload);

    setTitle("");
    setDescription("");
    setHasDropBox(false);
    setDueDate("");
  };

  return (
    <div className="">
      <Dialog>
        <DialogTrigger asChild>
          <button className={buttonClassName || "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-700 hover:text-slate-900"}>
            <Plus className="h-4 w-4" /> Task
          </button>
        </DialogTrigger>

        <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden rounded-2xl border-slate-800 bg-[#0a101f] p-0 text-slate-100 shadow-2xl sm:max-w-xl [&>button]:text-slate-400">
          {/* Deep Blue Header */}
          <DialogHeader className="shrink-0 border-b border-slate-800 px-5 py-5 pr-12 text-left sm:px-6">
            <DialogTitle className="flex items-center gap-3 text-lg font-semibold tracking-tight">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-amber-300"><Plus className="h-5 w-5" /></span>
              Assign New Task
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed text-slate-400">Create a requirement and choose how clients complete it.</DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-col gap-5 overflow-y-auto p-5 sm:p-6">
            {/* Student Target Indicator Card */}
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
                  {clearanceId.length > 1
                    ? "Assign to all selected clients"
                    : "Assign to the selected client"}
                </p>
              </div>
            </div>

            {/* Task Title (Mapped to existing 'description' state) */}
            <div className="space-y-2">
              <Label htmlFor="new-task-title" className="text-sm font-medium text-slate-300">
                Task Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="new-task-title"
                aria-invalid={isTitleDuplicate}
                className={`h-10 bg-[#070c18] text-slate-100 placeholder:text-slate-600 ${isTitleDuplicate ? "border-rose-500 focus-visible:ring-rose-500" : "border-slate-700 focus-visible:ring-amber-400/40"}`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Submit Library Clearance Form"
              />
              {isTitleDuplicate && (
                <p className="text-xs font-semibold text-rose-500">
                  A task with this title has already been assigned to this client.
                </p>
              )}
            </div>

            {/* Task Description */}
            <div className="space-y-2">
              <Label htmlFor="new-task-description" className="text-sm font-medium text-slate-300">
                Instructions <span className="text-rose-400">*</span>
              </Label>
              <Textarea
                id="new-task-description"
                className="min-h-28 resize-y border-slate-700 bg-[#070c18] text-slate-100 placeholder:text-slate-600 focus-visible:ring-amber-400/40"
                placeholder="Provide details about this task..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Due Date (Optional) */}
            <div className="space-y-2 rounded-xl border border-slate-800 bg-[#070c18] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-amber-300" />
                  <Label htmlFor="task-due-date" className="text-sm font-medium text-slate-200">
                    Due Date <span className="text-xs font-normal text-slate-500">(Optional)</span>
                  </Label>
                </div>
                {dueDate && (
                  <button
                    type="button"
                    onClick={() => setDueDate("")}
                    className="text-xs font-medium text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    Clear date
                  </button>
                )}
              </div>
              <Input
                id="task-due-date"
                type="date"
                min={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="border-slate-700 bg-[#0a101f] text-slate-200 [color-scheme:dark] focus-visible:ring-amber-400/40"
              />
              <p className="text-xs text-slate-500">
                {dueDate
                  ? `Clients must complete this requirement by ${new Date(dueDate + "T00:00:00+08:00").toLocaleDateString("en-US", { timeZone: APP_TIME_ZONE, month: "short", day: "numeric", year: "numeric" })}.`
                  : "Leave blank to allow completion until the end of the clearance season."}
              </p>
            </div>

            {/* Dropbox Toggle Panel */}
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#070c18] p-4 transition-colors hover:border-slate-700">
              <div className="flex items-start gap-3">
                <Upload className="mt-0.5 h-5 w-5 text-amber-300" />
                <div className="space-y-1">
                  <Label
                    htmlFor="dropbox-switch"
                    className="cursor-pointer text-sm font-medium text-slate-200"
                  >
                    File submission
                  </Label>
                  <p className="text-xs text-slate-500">
                    Allow clients to upload supporting files
                  </p>
                </div>
              </div>
              <Switch
                id="dropbox-switch"
                checked={hasDropBox}
                onCheckedChange={setHasDropBox}
                className="data-[state=checked]:bg-amber-400"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-slate-800 bg-[#070c18] px-5 py-4 sm:px-6">
            <DialogClose asChild>
              <Button
                variant="ghost"
                className="rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white"

              >
                Cancel
              </Button>
            </DialogClose>
            <DialogClose asChild>
              <Button
                onClick={addTask}
                disabled={clearanceId.length === 0 || isTitleDuplicate || !title.trim() || !description.trim()}
                className="gap-2 rounded-lg bg-amber-400 px-5 text-xs font-semibold text-slate-950 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed"
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
