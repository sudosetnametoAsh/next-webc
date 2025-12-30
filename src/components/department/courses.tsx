import { useFetchCourses } from "@/hooks/department/fetch-courses";
import StudentList from "./student-list";
import { useState } from "react";
import { useFetchPreset } from "@/hooks/department/fetch-presets";
import CourseList from "./course-list";
import SectionList from "./section-list";

export default function Courses() {
    const { data: preset } = useFetchPreset(); // Fetch preset
    const { data: courses, isPending, error } = useFetchCourses(); // Fetch course
    const [courseId, setCourseId] = useState<string | null>(null);
    const [openPresetModal, setOpenPresetModal] = useState(false);
    const [sectionId, setSectionId] = useState<string | null>(null)
    console.log(courses)

    if (!preset) return null

    if (isPending) {
        // Styled loading state
        return (
            <div className="status-container">
                <div className="spinner"></div>
                <p>Loading courses...</p>
            </div>
        );
    }

    if (error) {
        // Styled error state
        return (
            <div className="status-container">
                <p>Error: {error.message}</p>
            </div>
        );
    }

    const activeCourseId = courseId ?? String(courses[0]?.course_id);
    const selectedCourse = courses.find((course) => String(course.course_id) === activeCourseId) ?? courses[0];
    const activeSectionId = sectionId ?? String(selectedCourse.course_sections[0].section_id);

    return (
        <div className="courses-page-layout">

            {/* Sidebar for Navigation */}
            <aside className="sidebar">
                <h2>Courses</h2>

                <CourseList courses={courses} activeCourseId={activeCourseId} onSelect={(id) => { setCourseId(id); setSectionId(null) }} />

                {/* Sections for the selected course */}
                {selectedCourse && <SectionList sections={selectedCourse.course_sections} setSectionId={setSectionId} activeSectionId={activeSectionId}/>}

                {/* Button to open the modal */}
                <button className="preset-button" onClick={() => setOpenPresetModal(true)}>
                    View Clearance Presets
                </button>
            </aside>


            {/* Main content area */}
            <main className="main-content">
                {activeSectionId && <StudentList key={activeSectionId} courseId={activeSectionId} />}
            </main>

            {/* Modal for Presets */}
            {openPresetModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Clearance Presets</h3>
                            <button className="close-button" onClick={() => setOpenPresetModal(false)}>X</button>
                        </div>
                        <div className="modal-body">
                            {preset.data.map((item) => (
                                <p key={item.task_id}>{item.description}</p>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                /* --- Page Layout --- */
                .courses-page-layout {
                    display: flex;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                    color: #333;
                    height: 100vh;
                    background-color: #f4f6f8;
                }

                /* --- Sidebar --- */
                .sidebar {
                    width: 300px;
                    background-color: #ffffff;
                    border-right: 1px solid #e0e0e0;
                    padding: 1.5rem;
                    display: flex;
                    flex-direction: column;
                    overflow-y: auto;
                }

                .sidebar h2 {
                    margin-top: 0;
                    margin-bottom: 1rem;
                    font-size: 1.5rem;
                    color: #1a1a1a;
                    border-bottom: 2px solid #e0e0e0;
                    padding-bottom: 0.5rem;
                }

                .sidebar h3 {
                    font-size: 1rem;
                    color: #555;
                    margin-top: 1.5rem;
                    margin-bottom: 0.75rem;
                }

                .course-list {
                    margin-bottom: 1rem;
                }
                
                /* --- Buttons --- */
                .sidebar-button {
                    display: block;
                    width: 100%;
                    padding: 0.75rem 1rem;
                    margin-bottom: 0.5rem;
                    text-align: left;
                    background-color: transparent;
                    border: 1px solid #e0e0e0;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: background-color 0.2s, border-color 0.2s, box-shadow 0.2s;
                    font-size: 1rem;
                }

                .sidebar-button:hover {
                    background-color: #f0f0f0;
                    border-color: #ccc;
                }

                .sidebar-button.active {
                    background-color: #007bff;
                    color: white;
                    border-color: #007bff;
                    box-shadow: 0 2px 4px rgba(0, 123, 255, 0.3);
                }
                
                .section-button {
                    font-size: 0.9rem;
                    background-color: #f9f9f9;
                    margin-left: 1rem; /* Indent sections */
                }

                .preset-button {
                    margin-top: auto; /* Pushes the button to the bottom */
                    padding: 0.8rem 1rem;
                    background-color: #28a745;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 1rem;
                    font-weight: bold;
                    cursor: pointer;
                    transition: background-color 0.2s;
                }

                .preset-button:hover {
                    background-color: #218838;
                }

                /* --- Main Content --- */
                .main-content {
                    flex-grow: 1;
                    padding: 2rem;
                    overflow-y: auto;
                }

                /* --- Modal --- */
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.6);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 1000;
                }

                .modal {
                    background: white;
                    border-radius: 8px;
                    width: 90%;
                    max-width: 500px;
                    max-height: 80vh;
                    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
                    display: flex;
                    flex-direction: column;
                }

                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem 1.5rem;
                    border-bottom: 1px solid #e0e0e0;
                }

                .modal-header h3 {
                    margin: 0;
                }

                .close-button {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    color: #aaa;
                }
                
                .close-button:hover {
                    color: #333;
                }

                .modal-body {
                    padding: 1.5rem;
                    overflow-y: auto;
                }
                
                .modal-body p {
                    border-bottom: 1px solid #eee;
                    padding-bottom: 0.75rem;
                    margin-bottom: 0.75rem;
                }

                /* --- Status (Loading/Error) --- */
                .status-container {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    font-size: 1.2rem;
                    color: #555;
                }
                
                .spinner {
                    border: 4px solid rgba(0, 0, 0, 0.1);
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    border-left-color: #09f;
                    animation: spin 1s ease infinite;
                    margin-bottom: 1rem;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

            `}</style>
        </div>
    );
}