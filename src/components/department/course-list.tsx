type Props = {
    courses: Course[];
    activeCourseId: string;
    onSelect: (id: string) => void;
}

type Course = {
    course_id: number;
    course_name: string;
}

export default function CourseList({ courses, activeCourseId, onSelect }: Props) {

    return (
        <div className="course-list">
            {courses.map((course) => (
                <button
                    key={course.course_id}
                    onClick={() => onSelect(String(course.course_id))}
                    className={`sidebar-button ${String(course.course_id) === activeCourseId ? "active" : ""
                        }`}
                >
                    {course.course_name}
                </button>
            ))}

            
            <style jsx>{`
                .course-list {
                    margin-bottom: 1rem;
                }

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
            
            `}</style>

        </div>

    )
}