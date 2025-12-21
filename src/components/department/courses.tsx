import { useFetchCourses } from "@/hooks/department/fetch-courses";
import StudentList from "./student-list";
import { useState } from "react";
import { useFetchPreset } from "@/hooks/department/fetch-preset";

export default function Courses() {
    const { data: preset } = useFetchPreset(); // Fetch preset
    const { data: courses = [], isPending, error } = useFetchCourses(preset?.staff_id); // Fetch course
    const [courseId, setCourseId] = useState<string | null>(null);
    const [openPresetModal, setOpenPresetModal] = useState(false);
    const [sectionId, setSectionId] = useState<string | null>(null)

    // console.log(courseId)

    if (isPending || !preset) {
        return <div> Loading... </div>;
    }

    if (error) {
        return <div> {error.message} </div>;
    }
    const activeCourseId = courseId ?? String(courses[0]?.course_id); // Keeps track of courses clicked
    const selectedCourse = courses.find((course) => String(course.course_id) === activeCourseId) ?? courses[0] // Holds the array value of selected course
    const activeSectionId = sectionId ?? String(selectedCourse.course_sections[0].section_id)

    console.log(sectionId)


    return (
        <>


            <div className="course-container">
                {courses.map((course) => (
                    <button
                        key={course.course_id}
                        onClick={() => {setCourseId(String(course.course_id)); setSectionId(null)}}
                    >
                        {course.course_name}
                    </button>
                ))}
            </div>

            {/* Sections */}
            <div>
                {selectedCourse.course_sections.map((section) => (
                    <button key={section.section_id} onClick={() => setSectionId(String(section.section_id))}>
                        {selectedCourse.course_name}{section.year}/{section.semester}{section.section_number}
                    </button>
                ))}
            </div>

            <button onClick={() => setOpenPresetModal(true)}>
                View Clearance Presets
            </button>

            {openPresetModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <button onClick={() => setOpenPresetModal(false)}>Close</button>

                        {preset.clearance_tasks_preset.map((item, index) => (
                            <p key={index}>{item.description}</p>
                        ))}
                    </div>
                </div>
            )}

            {activeSectionId && <StudentList courseId={activeSectionId} />}

            <style jsx>
                {`
                    .modal-overlay {
                        position: fixed;
                        inset: 0;
                        background: rgba(0, 0, 0, 0.5);
                        display: flex;
                        justify-content: center;
                        align-items: center;
                    }

                    .modal {
                        background: white;
                        padding: 1rem;
                        border-radius: 8px;
                        min-width: 300px;
                    }
                `}
            </style>
        </>
    );
}
