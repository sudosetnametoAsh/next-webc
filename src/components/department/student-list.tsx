import { useFethStudents } from "@/hooks/department/fetch-students";
import { useFetchPreset } from "@/hooks/department/fetch-presets";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@radix-ui/react-accordion";
import { StudentTaskList } from "./student-task";
import "@/styles/accordion.css";
import { Checkbox } from "../ui/checkbox";
import { useState } from "react";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@radix-ui/react-popover";
import { Input } from "../ui/input";
import { useAddStudentTasks } from "@/hooks/department/add-student-tasks";
import SelectAll from "./button/select-all";
import AddPreset from "./button/add-preset";

type Props = {
  courseId: string
}

type CheckedState = boolean | "indeterminate";

export default function StudentList({ courseId }: Props) {
  const { data: students = [], isLoading } = useFethStudents(courseId);
  const { data: preset } = useFetchPreset(); // 2. Fetch preset data here
  
  const [clearanceId, setClearanceId] = useState<string[]>([]);
  const [taskId, setTaskId] = useState<string[]>([]); 
  const [description, setDescription] = useState<string>("");
  const { mutate } = useAddStudentTasks("243")

  if (!preset) return null


  const handleStudentChange = (studentId: string, checked: CheckedState) => {
    setClearanceId((prev) => checked === true
      ? [...prev, studentId]
      : prev.filter((id) => id !== studentId)
    );
  };

  const addTask = () => {
    if (clearanceId.length === 0) {
      alert("Select at least one student");
      return
    }

    // Determine if we are using presets or custom task
    const targetTaskIds = (taskId && taskId.length > 0) ? taskId : [null];

    const payload = clearanceId.flatMap((student) =>
      targetTaskIds.map((tId) => {
        // 3. Logic to find the correct description
        let finalDescription = description;

        if (tId) {
          // If tId is not null, find the matching preset description
          const taskItem = preset.data.find(item => item.task_id === tId);
          finalDescription = taskItem ? taskItem.description : description;
        }
        
        return {
          clearance_id: student,
          task_id: tId, 
          description: finalDescription,
          staff_id: preset.id
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
        <SelectAll students={students} selectedClearanceId={clearanceId} setSelectedClearanceId={setClearanceId} />

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
          <AccordionItem key={student.student_id} value={student.student_id} className="AccordionItem">
            <Checkbox
              className="cursor-pointer"
              checked={clearanceId.includes(student.student_clearances?.[0].clearance_id)}
              onCheckedChange={(checked) => handleStudentChange(student.student_clearances?.[0].clearance_id, checked)}
            />
            <AccordionTrigger className="AccordionTrigger">
              {student.student_name} ({student.student_id})
            </AccordionTrigger>
            <AccordionContent className="AccordionContent">
              <StudentTaskList clearanceId={student.student_clearances?.[0].clearance_id} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}