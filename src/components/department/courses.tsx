import { useFetchCourses } from "@/hooks/department/fetch-courses";
import StudentList from "./student-list";
import { useState } from "react";
import { useFetchPreset } from "@/hooks/department/fetch-preset";

export default function Courses() {
    const { data: preset } = useFetchPreset(); // Fetch preset
    const { data: courses = [], isPending, error } = useFetchCourses(preset?.staff_id); // Fetch course
    const [courseId, setCourseId] = useState<string | null>(null);
    const [openPresetModal, setOpenPresetModal] = useState(false);

    if (isPending || !preset) {
        return <div> Loading... </div>;
    }

    if (error) {
        return <div> {error.message} </div>;
    }

    const activeCourseId = courseId ?? String(courses[0]?.course_id);

    console.log(preset);

    return (
        <>


            <div className="course-container">
                {courses.map((course) => (
                    <button
                        key={course.course_id}
                        onClick={() => setCourseId(String(course.course_id))}
                    >
                        {course.course_name}
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

            {activeCourseId && <StudentList courseId={activeCourseId}/>}

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
