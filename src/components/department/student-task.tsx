"use client";
import { useFetchStudentTasks } from "@/hooks/department/fetch-student-tasks";
import { Button } from "../ui/button";
import { SearchAlert } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "../ui/dialog";
import { useState } from "react";
import Image from "next/image";

type Params = {
  clearanceId: string;
};

export function StudentTaskList({ clearanceId }: Params) {
  const {
    data: tasks = [],
    isLoading,
    error,
  } = useFetchStudentTasks(clearanceId);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (isLoading) return <p className="p-5">Loading tasks...</p>;
  if (error) return <p className="p-5 text-red-500">Could not load tasks.</p>;
  if (tasks.length === 0)
    return <p className="p-5 text-gray-500">No tasks found.</p>;

  return (
    <div className="px-5 pb-5">
      <ul className="m-0 list-none p-0">
        {tasks.map((task, index) => {
          const view =
            task.dropbox !== "pending" ? (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedImage(task.dropbox)}
              >
                <SearchAlert className="h-4 w-4" />
              </Button>
            ) : (
              "pending"
            );
          return (
            <li
              key={index}
              className="flex items-center justify-between border-b border-gray-200 py-3"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium">{task.description}</span>
                <span className="text-muted-foreground text-xs uppercase">
                  {task.status}
                </span>
              </div>

              {task.dropbox !== "NULL" && view}
            </li>
          );
        })}
      </ul>

      <Dialog
        open={!!selectedImage}
        onOpenChange={(open) => !open && setSelectedImage(null)}
      >
        <DialogContent className="max-w-3xl overflow-hidden">
          <DialogTitle>Submission Preview</DialogTitle>
          {selectedImage && (
            <div className="relative h-[70vh] w-full">
              <Image
                src={selectedImage}
                alt="Submitted Evidence"
                fill
                className="object-contain"
                priority
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
