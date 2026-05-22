"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
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

export default function ManagePresetButton({ preset }: { preset: Data }) {
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
            placeholder="Task Title"
            value={editingTitle}
            onChange={(e) => setEditingTitle(e.target.value)}
            className="h-8 border-blue-300 focus-visible:ring-blue-600 text-sm font-semibold"
          />
          <Textarea
            placeholder="Task Description"
            value={editingDescription}
            onChange={(e) => setEditingDescription(e.target.value)}
            className="min-h-16 resize-none border-blue-300 focus-visible:ring-blue-600 text-sm"
          />
        </div>
        <div className="flex shrink-0 justify-end gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-slate-500 hover:bg-slate-100"
            onClick={cancelEditMode}
          >
            <X className="mr-1 h-3 w-3" /> Cancel
          </Button>
          <Button
            size="sm"
            className="h-7 bg-emerald-600 hover:bg-emerald-700 text-white"
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
        <div className="flex flex-col gap-1 pr-4">
          <span className="text-sm font-bold text-slate-800">
            {item.title}
          </span>
          <span className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
            {item.description}
          </span>
        </div>
        <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
            onClick={() => triggerEditMode(item)}
          >
            <SquarePen className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-slate-400 hover:bg-red-50 hover:text-red-600"
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
          <button className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 ">
            <Settings className="h-4 w-4" /> Config
          </button>
        </DialogTrigger>

        <DialogContent className="p-0 overflow-hidden sm:max-w-137.5 border-none shadow-2xl">
          {/* Deep Blue Header */}
          <DialogHeader className="bg-[#0b3b75] px-6 py-5 text-white">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold tracking-wide">
              <Layers className="h-5 w-5" />
              Task Preset Manager
            </DialogTitle>
            <p className="text-sm text-blue-200 font-medium">
              Create and manage reusable tasks for quick assignment
            </p>
          </DialogHeader>

          <div className="flex flex-col p-6 gap-6 bg-slate-50/30">
            {/* Existing Presets List */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-700">Existing Presets</h4>

              <div className="flex h-56 flex-col gap-2 overflow-y-auto pr-2 rounded-xl border border-slate-200 bg-slate-100/50 p-2">
                {preset.data.length !== 0 ? (
                  preset.data.map((item) => (
                    <div
                      key={item.task_id}
                      className={`group flex items-start rounded-lg border bg-white px-3 py-2 transition-all shadow-sm ${
                        editPresetId === item.task_id
                          ? "border-blue-300 ring-1 ring-blue-100"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {editPresetId === item.task_id ? editMode(item) : viewMode(item)}
                    </div>
                  ))
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
                    <Layers className="h-8 w-8 opacity-20" />
                    <p className="text-sm font-medium">No presets configured yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Create New Preset Form */}
            <div className="space-y-3 border-t border-slate-200 pt-5">
              <h4 className="text-sm font-bold text-slate-700">Create New Preset</h4>
              <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <Input
                  value={addTaskTitle}
                  onChange={(e) => setAddTaskTitle(e.target.value)}
                  placeholder="Task Title (e.g., Submit Library Form)"
                  className="focus-visible:ring-blue-600 font-medium"
                />
                <Textarea
                  value={addTaskDescription}
                  onChange={(e) => setAddTaskDescription(e.target.value)}
                  placeholder="Detailed task description..."
                  className="min-h-16 resize-none focus-visible:ring-blue-600 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      submitTaskPreset();
                    }
                  }}
                />
                <div className="flex justify-end">
                  <Button
                    onClick={submitTaskPreset}
                    className="bg-[#0b3b75] font-semibold text-white hover:bg-[#082a54]"
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add Preset
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end border-t border-slate-200 bg-white px-6 py-4">
            <DialogClose asChild>
              <Button variant="outline" className="font-semibold text-slate-700 w-full sm:w-auto">
                Close Manager
              </Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
