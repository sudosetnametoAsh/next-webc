import { useFethStudents } from "@/hooks/department/fetch-students";
import { useFetchPreset } from "@/hooks/department/fetch-presets";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@radix-ui/react-accordion";
import { StudentTaskList } from "./student-task";
import "@/styles/accordion.css";
import { Checkbox } from "../ui/checkbox";
import { useState } from "react";
import SelectAll from "./button/select-all";
import AddPreset from "./button/add-preset";
import SignButton from "./sign-button";
import AddTask from "./button/add-task";

type Props = {
  courseId: string
}

type CheckedState = boolean | "indeterminate";

export default function StudentList({ courseId }: Props) {
  const { data: students = [], isLoading } = useFethStudents(courseId);
  const { data: preset } = useFetchPreset();

  const [clearanceId, setClearanceId] = useState<string[]>([]);
  const [taskId, setTaskId] = useState<string[]>([]);
  const [description, setDescription] = useState<string>("");

  if (!preset) return null

  const selectedStudents = students.filter((student) =>
    clearanceId.includes(student.student_clearances?.[0].clearance_id)
  );

  const effectiveStatus =
    selectedStudents.length === 0 
      ? ""
      : selectedStudents.every((s) => s.student_clearances?.[0].status === "Signed")
          ? "Signed"
          : "Pending" 

  const handleStudentChange = (clearanceId: string, checked: CheckedState) => {
    setClearanceId((prev) => checked === true
      ? [...prev, clearanceId]
      : prev.filter((id) => id !== clearanceId)
    );
  };

  if (isLoading) return <div> Loading Students... </div>
  if (students.length === 0) return <div> Clearance template not found for this section </div>

  return (
    <div className="container">
      <div className="flex items-center gap-4">

        <SelectAll
          students={students}
          clearanceId={clearanceId}
          setClearanceId={setClearanceId}
          effectiveStatus={effectiveStatus}
        />

        <AddTask
          preset={preset}
          clearanceId={clearanceId}
          taskId={taskId}
          description={description}
          setDescription={setDescription}
        />

        <AddPreset
          preset={preset}
          taskId={taskId}
          setTaskId={setTaskId}
          clearanceId={clearanceId}
          description={description}
        />

        <SignButton
          clearanceId={clearanceId}
          currentStatus={effectiveStatus}
        />

      </div>

      <Accordion type="multiple" className="AccordionRoot">
        {students.map((student) => {

          const isDisabled =
            (student.student_clearances[0].status !== effectiveStatus) &&
            (selectedStudents.length !== 0);

          return (
            <AccordionItem
              key={student.student_id}
              value={student.student_id}
              className={`AccordionItem ${isDisabled ? "opacity-50 grayscale" : ""}`}
            >

              {/* Checkbox */}
              <Checkbox
                className={isDisabled ? "cursor-not-allowed" : "cursor-pointer"}
                disabled={isDisabled}
                checked={clearanceId.includes(student.student_clearances?.[0].clearance_id)}
                onCheckedChange={(checked) => handleStudentChange(student.student_clearances?.[0].clearance_id, checked)}
              />
              {/* Trigger */}
              <AccordionTrigger className="AccordionTrigger">
                {student.student_name} ({student.student_id}) <strong> {student.student_clearances[0].status} </strong>
              </AccordionTrigger>
              {/* Content */}
              <AccordionContent className="AccordionContent">
                <StudentTaskList clearanceId={student.student_clearances?.[0].clearance_id} />
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}