"use client";
import { useFecthRecords } from "@/hooks/student/fetch-student-data";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { CirclePlus } from "lucide-react";

const DropBoxform = ({
  taskId,
  task,
  studentId,
  department,
}: {
  task: string;
  taskId: string;
  studentId: string;
  department: string;
}) => {
  console.log("task is: ", task);
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.file as HTMLInputElement;

    if (!fileInput.files?.[0]) return;

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);
    formData.append("task", task);
    formData.append("taskId", taskId);
    formData.append("studentId", studentId);
    formData.append("department", department);

    const json = await fetch("/api/student/submissions", {
      method: "POST",
      body: formData,
    });

    const data = await json.json();
    alert(JSON.stringify(data));
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Label htmlFor="file-upload" className="flex cursor-pointer flex-row">
        <Input
          id="file-upload"
          type="file"
          name="file"
          className="hidden"
          accept="image/*"
          required
          onChange={(e) => {
            if (e.target.files?.[0]) {
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />

        <div className="flex items-center justify-center rounded-full p-2 transition-colors hover:bg-gray-100">
          <CirclePlus size={24} />
        </div>
      </Label>
    </form>
  );
};

export default function StudentTable() {
  const { data, isLoading } = useFecthRecords();

  if (!data) return;

  if (isLoading) return <p>One more sec...</p>;

  if (data?.students?.length === 0) {
    return (
      <div>
        <div>
          Student: <strong>{data?.name}</strong>
        </div>
        <p>No clearance records</p>
      </div>
    );
  }

  return (
    <main className="flex h-auto w-[75vw] flex-col gap-5">
      {data.students.map((item, index) => (
        <div key={index} className="flex flex-col gap-2 border-2 p-2!">
          <h1>{item.clearance_templates.departments.dept_name}</h1>
          <h2>{item.clearance_templates.staffs.staff_name}</h2>

          <div className="flex flex-col gap-2 border p-2!">
            {item.assigned_tasks.map((task, tIndex) => {
              const taskDescription = task.clearance_tasks_preset?.description;
              const needsDropbox =
                task.dropbox !== "NULL" && !!task.clearance_tasks_preset;

              return (
                <div key={tIndex} className="flex flex-row gap-2 border p-2!">
                  <p> - {taskDescription}</p>

                  {needsDropbox && (
                    <DropBoxform
                      key={tIndex}
                      task={taskDescription}
                      taskId={task.assigned_task_id}
                      studentId={item.student_id}
                      department={
                        item.clearance_templates.departments.dept_name
                      }
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </main>
  );
}
