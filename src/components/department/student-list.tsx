import {
   Accordion,
   AccordionContent,
   AccordionItem,
   AccordionTrigger,
} from '@radix-ui/react-accordion';
import { StudentTaskList } from './student-task';
import { Checkbox } from '../ui/checkbox';
import { useDepartmentContext } from '@/context/deparment';

type CheckedState = boolean | 'indeterminate';

export default function StudentList() {
   const {
      fetchingStudents,
      setClearanceId,
      students,
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

   if (fetchingStudents) return <div> Loading Students... </div>;
   if (students.length === 0)
      return <div> No students found for this section </div>;

   return (
      <div className="flex justify-center w-250 m-2.5! p-2.5!">
         <Accordion type="multiple" className="w-full">
            {students.map((student) => {
               const isDisabled =
                  student.student_clearances[0].status !== effectiveStatus &&
                  selectedStudents.length !== 0;

               return (
                  <AccordionItem
                     key={student.student_id}
                     value={student.student_id}
                     className={`border-2 p-2.5! m-2! data-[state=closed]:h-20 data-[state=closed]:overflow-hidden data-[state=open]:h-auto rounded-sm ${isDisabled ? 'opacity-50 grayscale' : ''}`}
                  >
                     {/* Checkbox */}
                     <Checkbox
                        className={
                           isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'
                        }
                        disabled={isDisabled}
                        checked={clearanceId.includes(
                           student.student_clearances?.[0].clearance_id,
                        )}
                        onCheckedChange={(checked) =>
                           handleStudentChange(
                              student.student_clearances?.[0].clearance_id,
                              checked,
                           )
                        }
                     />

                     {/* Trigger */}
                     <AccordionTrigger className="cursor-pointer">
                        {student.student_name} ({student.student_id}){' '}
                        <strong>
                           {' '}
                           {student.student_clearances[0].status}{' '}
                        </strong>
                     </AccordionTrigger>

                     {/* Content */}
                     <AccordionContent className="">
                        <StudentTaskList
                           clearanceId={
                              student.student_clearances?.[0].clearance_id
                           }
                        />
                     </AccordionContent>
                  </AccordionItem>
               );
            })}
         </Accordion>
      </div>
   );
}
