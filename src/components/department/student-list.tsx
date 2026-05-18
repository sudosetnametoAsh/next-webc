import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@radix-ui/react-accordion";
import { StudentTaskList } from "./student-task";
import { Checkbox } from "../ui/checkbox";
import { useDepartmentContext } from "@/context/deparment";

type CheckedState = boolean | "indeterminate";

export default function StudentList() {
  const {
    fetchingStudents,
    setClearanceId,
    filteredStudents,
    effectiveStatus,
    selectedStudents,
    clearanceId,
  } = useDepartmentContext();

  const handleStudentChange = (clearanceId: string, checked: CheckedState) => {
    setClearanceId((prev) =>
      checked === true
        ? [...prev, clearanceId]
        : prev.filter((id) => id !== clearanceId),
    );
  };

  console.log(clearanceId);

  if (fetchingStudents) return <div> Loading Students... </div>;
  if (filteredStudents.length === 0)
    return <div> No students found for this section </div>;

  return (
    <Accordion type="multiple" className="w-246 flex flex-col justify-center">
      {filteredStudents.map((student) => {
        const isDisabled =
          student.clearance_records[0].status !== effectiveStatus &&
          selectedStudents.length !== 0;

        return (
          <AccordionItem
            key={student.student_id}
            value={student.student_id}
            className={`mb-2 flex flex-col gap-2 rounded-sm border-2 p-2.5! data-[state=closed]:h-20 data-[state=closed]:overflow-hidden data-[state=open]:h-auto ${isDisabled ? "opacity-50 grayscale" : ""}`}
          >
            {/* Checkbox */}
            <Checkbox
              className={`isDisabled ? "cursor-not-allowed" : "cursor-pointer" mr-2!`}
              disabled={isDisabled}
              checked={clearanceId.includes(
                student.clearance_records?.[0].clearance_id,
              )}
              onCheckedChange={(checked) =>
                handleStudentChange(
                  student.clearance_records?.[0].clearance_id,
                  checked,
                )
              }
            />

            {/* Trigger */}
            <AccordionTrigger className="flex cursor-pointer justify-start p-2.5!">
              {student.student_name} ({student.student_id})
              <strong className="justfify-end flex">
                {student.clearance_records[0].status}
              </strong>
            </AccordionTrigger>

            {/* Content */}
            <AccordionContent className="flex justify-start">
              <StudentTaskList
                clearanceId={student.clearance_records?.[0].clearance_id}
              />
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
