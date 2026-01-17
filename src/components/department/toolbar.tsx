// import { Students } from "@/types/students";
import AddPreset from './button/add-preset';
import AddTask from './button/add-task';
import SelectAll from './button/select-all';
import CourseList from './course-list';
import SectionList from './section-list';
import SignButton from './sign-button';
import { useFetchPreset } from '@/hooks/department/fetch-presets';
import { useDepartmentContext } from '@/context/deparment';
import { useState } from 'react';
import FilterButton from './button/filter-button';

export default function Toolbar() {
   const {
      courses,
      activeCourseId,
      setCourseId,
      setSectionId,
      selectedCourse,
      activeSectionId,
      students,
      clearanceId,
      setClearanceId,
      effectiveStatus,
   } = useDepartmentContext();

   const { data: preset } = useFetchPreset();

   const [taskId, setTaskId] = useState<string[]>([]);
   const [description, setDescription] = useState<string>('');

   if (!preset) return null;

   return (
      <section className=" flex flex-col gap-2 w-250 border-2 p-2.5!">
         <CourseList
            courses={courses}
            activeCourseId={activeCourseId}
            setCourseId={setCourseId}
            setSectionId={setSectionId}
         />

         <SectionList
            sections={selectedCourse.course_sections}
            setSectionId={setSectionId}
            activeSectionId={activeSectionId}
         />
         <div className="flex flex-row gap-2">
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

            <FilterButton />
         </div>
      </section>
   );
}
