// student-list.tsx
import { useFethStudents } from "@/hooks/department/fetch-student-list";
import { useFetchPreset } from "@/hooks/department/fetch-preset"; // 1. Import hook
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@radix-ui/react-accordion";
import { StudentTaskList } from "./student-task";
import "@/styles/accordion.css";
import { Checkbox } from "../ui/checkbox";
import { useState } from "react";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@radix-ui/react-popover";
import { Input } from "../ui/input";
import { useAddStudentTasks } from "@/hooks/department/fetch-student-tasks";
import SelectAll from "./button/select-all";
import AddPreset from "./button/add-preset";

type Props = {
  courseId: string
}

type CheckedState = boolean | "indeterminate";

export default function StudentList({ courseId }: Props) {
  const { data: students = [], isLoading } = useFethStudents(courseId);
  const { data: preset } = useFetchPreset(); // 2. Fetch preset data here
  
  const [selectedStudents, setSelectedStudent] = useState<string[]>([]);
  const [taskId, setTaskId] = useState<string[]>([]); 
  const [description, setDescription] = useState<string>("");
  const { mutate } = useAddStudentTasks("02000000006", "02000183861")

  const handleStudentChange = (studentId: string, checked: CheckedState) => {
    setSelectedStudent((prev) => checked === true
      ? [...prev, studentId]
      : prev.filter((id) => id !== studentId)
    );
  };

  const addTask = () => {
    if (selectedStudents.length === 0) {
      alert("Select at least one student");
      return
    }

    // Determine if we are using presets or custom task
    const targetTaskIds = (taskId && taskId.length > 0) ? taskId : [null];

    const payload = selectedStudents.flatMap((student) =>
      targetTaskIds.map((tId) => {
        // 3. Logic to find the correct description
        let finalDescription = description;

        if (tId) {
          // If tId is not null, find the matching preset description
          const taskItem = preset?.clearance_tasks_preset.find(item => item.task_id === tId);
          finalDescription = taskItem ? taskItem.description : description;
        }

        return {
          clearance_id: student,
          task_id: tId, 
          description: finalDescription
        };
      })
    );

    mutate(payload);
    console.log("Submitted payload: ", payload)
  };

  if (isLoading) return <div> Loading Students... </div>
  if (students.length === 0) return <div> Clearance template not found for this section </div>

  return (
    <div className="container">
      <div className="flex items-center gap-4">
        <SelectAll students={students} selectedClearanceId={selectedStudents} setSelectedClearanceId={setSelectedStudent} />

        <Popover>
          <PopoverTrigger asChild>
            <Button>Add Task</Button>
          </PopoverTrigger>
          <PopoverContent>
            <Input
              className="col-span-2 h-8"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Submit paperworks"
            />
            <Button onClick={addTask}>Assign Task</Button>
          </PopoverContent>
        </Popover>

        {/* 4. Pass preset data and state setters to AddPreset */}
        <AddPreset 
          preset={preset} 
          taskId={taskId} 
          setTaskId={setTaskId} 
          addTask={addTask} 
        />
      </div>

      <Accordion type="multiple" className="AccordionRoot">
        {students.map((student) => (
          <AccordionItem key={student.students.student_id} value={student.students.student_id} className="AccordionItem">
            <Checkbox
              className="cursor-pointer"
              checked={selectedStudents.includes(student.clearance_id)}
              onCheckedChange={(checked) => handleStudentChange(student.clearance_id, checked)}
            />
            <AccordionTrigger className="AccordionTrigger">
              {student.students.student_name} ({student.students.student_id})
            </AccordionTrigger>
            <AccordionContent className="AccordionContent">
              <StudentTaskList studentId={student.students.student_id} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}