// import { Students } from "@/types/students";
import AddPreset from "./button/add-preset";
import AddTask from "./button/add-task";
import SelectAll from "./button/select-all";
import CourseList from "./course-list";
import SectionList from "./section-list";
import SignButton from "./sign-button";
import { useFetchPreset } from "@/hooks/department/fetch-presets";
import { useDepartmentContext } from "@/context/deparment";
import { useState } from "react";
import FilterButton from "./button/filter-button";
import ManagePresetButton from "./button/manage-preset-button";

export default function Toolbar() {
  const {
    courses,
    activeCourseId,
    setCourseId,
    setSectionId,
    selectedCourse,
    activeSectionId,
    filteredStudents,
    clearanceId,
    setClearanceId,
    effectiveStatus,
  } = useDepartmentContext();

  const { data: preset } = useFetchPreset();

  const [taskId, setTaskId] = useState<string[]>([]);
  const [description, setDescription] = useState<string>("");
  const [title, setTitle] = useState<string>("")

  if (!preset) return null;

  return (
    <section className="flex w-255 flex-col gap-2 rounded-md border-2 p-4">
      <div className="flex items-center">
        <div className="flex flex-col">
          <span className="text-[25px] font-semibold">Manage Students</span>
          <span className="text-[14px]">
            View and manage clearance status by section
          </span>
        </div>

        <div className="ml-auto">
          <ManagePresetButton preset={preset} />
        </div>
      </div>
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
          students={filteredStudents}
          clearanceId={clearanceId}
          setClearanceId={setClearanceId}
          effectiveStatus={effectiveStatus}
        />

        <div className="ml-auto flex gap-2">
          <SignButton
            clearanceId={clearanceId}
            currentStatus={effectiveStatus}
          />

          <AddTask
            preset={preset}
            clearanceId={clearanceId}
            taskId={taskId}
            description={description}
            setDescription={setDescription}
            title={title}
            setTitle={setTitle}
          />

          <AddPreset
            preset={preset}
            taskId={taskId}
            setTaskId={setTaskId}
            clearanceId={clearanceId}
            description={description}
          />

          <FilterButton />
        </div>
      </div>
    </section>
  );
}
