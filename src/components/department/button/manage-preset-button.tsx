"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; // Using textarea for description
import { useAddTaskPreset } from "@/hooks/department/add-task-preset";
import { useDeleteTaskPreset } from "@/hooks/department/delete-task-preset";
import { useUpdateTaskPreset } from "@/hooks/department/update-task-preset";
import { Settings, SquarePen, Trash2, Plus, Check, X, Layers } from "lucide-react";
import { useState } from "react";

type Data = {
  data: Preset[];
  id: string;
};

// 1. Updated Preset type to include title
type Preset = {
  task_id: string;
  title: string;
  description: string;
};

export default function ManagePresetButton({
  preset,
  buttonClassName,
}: {
  preset: Data;
  buttonClassName?: string;
}) {
  const { mutate: addTaskPreset } = useAddTaskPreset();
  const { mutate: deleteTaskPreset } = useDeleteTaskPreset();
  const { mutate: updateTaskPreset } = useUpdateTaskPreset();

  // Add task states (Now includes title)
  const [addTaskTitle, setAddTaskTitle] = useState<string>("");
  const [addTaskDescription, setAddTaskDescription] = useState<string>("");

  // Edit task states (Now includes title)
  const [editPresetId, setEditPresetId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>("");
  const [editingDescription, setEditingDescription] = useState<string>("");

  const submitTaskPreset = () => {
    if (addTaskTitle.trim() === "" || addTaskDescription.trim() === "") {
      return alert("Please enter both a title and a description");
    }

    addTaskPreset({
      title: addTaskTitle,
      description: addTaskDescription
    });

    // Clear states after submission
    setAddTaskTitle("");
    setAddTaskDescription("");
  };

  const saveUpdatedTaskPreset = (taskId: string) => {
    if (editingTitle.trim() === "" || editingDescription.trim() === "") {
      return alert("Title and description cannot be empty while editing");
    }
    updateTaskPreset({
      task_id: taskId,
      updatedTitle: editingTitle,
      updatedDescription: editingDescription,
    });
    setEditPresetId(null);
    setEditingTitle("");
    setEditingDescription("");
  };

  const triggerEditMode = (item: Preset) => {
    setEditPresetId(item.task_id);
    setEditingTitle(item.title);
    setEditingDescription(item.description);
  };

  const cancelEditMode = () => {
    setEditPresetId(null);
    setEditingTitle("");
    setEditingDescription("");
  };

  // --- UI FOR EDITING AN ITEM ---
  const editMode = (item: Preset) => {
    return (
      <div className="flex w-full flex-col gap-3 py-1">
        <div className="space-y-2">
          <Input
            autoFocus
            aria-label="Preset title"
            placeholder="Task Title"
            value={editingTitle}
            onChange={(e) => setEditingTitle(e.target.value)}
            className="h-8 border-slate-700 bg-[#070c18] text-slate-100 placeholder:text-slate-500 focus-visible:ring-amber-400/40 text-sm font-semibold"
          />
          <Textarea
            aria-label="Preset instructions"
            placeholder="Task Description"
            value={editingDescription}
            onChange={(e) => setEditingDescription(e.target.value)}
            className="min-h-16 resize-none border-slate-700 bg-[#070c18] text-slate-100 placeholder:text-slate-500 focus-visible:ring-amber-400/40 text-sm"
          />
        </div>
        <div className="flex shrink-0 justify-end gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-slate-400 hover:bg-slate-800 hover:text-white"
            onClick={cancelEditMode}
          >
            <X className="mr-1 h-3 w-3" /> Cancel
          </Button>
          <Button
            size="sm"
            className="h-7 bg-amber-400 hover:bg-amber-300 text-slate-950"
            onClick={() => saveUpdatedTaskPreset(item.task_id)}
          >
            <Check className="mr-1 h-3 w-3" /> Save
          </Button>
        </div>
      </div>
    );
  };

  // --- UI FOR VIEWING AN ITEM ---
  const viewMode = (item: Preset) => {
    return (
      <div className="flex w-full items-start justify-between gap-4 py-1">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="break-words text-sm font-semibold text-slate-100">
            {item.title}
          </span>
          <span className="text-xs text-slate-400 whitespace-pre-wrap break-words leading-relaxed">
            {item.description}
          </span>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-slate-400 hover:bg-slate-800 hover:text-amber-300"
            aria-label={`Edit ${item.title}`}
            onClick={() => triggerEditMode(item)}
          >
            <SquarePen className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400"
            aria-label={`Delete ${item.title}`}
            onClick={() => deleteTaskPreset({ task_id: item.task_id })}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <Dialog>
        <DialogTrigger asChild>
          <button className={buttonClassName || "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 "}>
            <Settings className="h-4 w-4" /> Config
          </button>
        </DialogTrigger>

        <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden rounded-2xl border-slate-800 bg-[#0a101f] p-0 text-slate-100 shadow-2xl sm:max-w-3xl [&>button]:text-slate-400">
          <DialogHeader className="shrink-0 border-b border-slate-800 px-5 py-5 text-left sm:px-6">
            <div className="mb-1 flex items-center gap-3 pr-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-amber-300">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold tracking-tight">Settings & Presets</DialogTitle>
                <DialogDescription className="mt-1 text-xs leading-relaxed text-slate-400">
                  Save reusable requirements for your clients.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="grid min-h-0 overflow-y-auto md:grid-cols-[1.15fr_1fr]">
            <section aria-labelledby="preset-library-title" className="min-w-0 space-y-4 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h3 id="preset-library-title" className="text-sm font-semibold text-slate-200">Your presets</h3>
                <span className="rounded-md border border-slate-700/60 bg-slate-800/70 px-2 py-0.5 text-xs tabular-nums text-slate-400">
                  {preset.data.length} saved
                </span>
              </div>
              <div className="flex max-h-80 flex-col gap-2 overflow-y-auto md:max-h-96">
                {preset.data.length ? preset.data.map((item) => (
                  <div key={item.task_id} className={`rounded-xl border p-3 transition-colors ${editPresetId === item.task_id ? "border-amber-400/40 bg-amber-400/5" : "border-slate-800 bg-[#070c18] hover:border-slate-700"}`}>
                    {editPresetId === item.task_id ? editMode(item) : viewMode(item)}
                  </div>
                )) : (
                  <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-slate-700/70 px-5 text-center">
                    <Layers className="mb-3 h-7 w-7 text-slate-600" />
                    <p className="text-sm font-medium text-slate-300">Build your preset library</p>
                    <p className="mt-1 max-w-52 text-xs leading-relaxed text-slate-500">Create a requirement once, then reuse it when assigning tasks.</p>
                  </div>
                )}
              </div>
            </section>

            <section aria-labelledby="new-preset-title" className="min-w-0 border-t border-slate-800 bg-[#070c18]/50 p-5 sm:p-6 md:border-t-0 md:border-l">
              <h3 id="new-preset-title" className="text-sm font-semibold text-slate-200">Create a preset</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">Keep common requirements ready to assign.</p>
              <form className="mt-5 space-y-4" onSubmit={(event) => { event.preventDefault(); submitTaskPreset(); }}>
                <div className="space-y-2">
                  <label htmlFor="new-preset-title-input" className="text-xs font-medium text-slate-400">Task title</label>
                  <Input id="new-preset-title-input" required value={addTaskTitle} onChange={(e) => setAddTaskTitle(e.target.value)} placeholder="e.g. Submit library form" className="h-10 border-slate-700 bg-[#070c18] text-sm text-slate-100 placeholder:text-slate-600 focus-visible:ring-amber-400/40" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="new-preset-description" className="text-xs font-medium text-slate-400">Instructions</label>
                  <Textarea id="new-preset-description" required value={addTaskDescription} onChange={(e) => setAddTaskDescription(e.target.value)} placeholder="Describe what the client needs to complete…" className="min-h-32 resize-y border-slate-700 bg-[#070c18] text-sm leading-relaxed text-slate-100 placeholder:text-slate-600 focus-visible:ring-amber-400/40" />
                </div>
                <Button type="submit" disabled={!addTaskTitle.trim() || !addTaskDescription.trim()} className="h-10 w-full rounded-lg bg-amber-400 font-semibold text-slate-950 hover:bg-amber-300">
                  <Plus className="h-4 w-4" /> Add preset
                </Button>
              </form>
            </section>
          </div>

          <div className="flex shrink-0 items-center justify-end border-t border-slate-800 bg-[#070c18] px-5 py-3 sm:px-6">
            <DialogClose asChild>
              <Button variant="ghost" className="h-9 rounded-lg px-5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white">Done</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

