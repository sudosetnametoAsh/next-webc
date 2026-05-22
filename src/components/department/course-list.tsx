import { Button } from "../ui/button";

type Props = {
    courses: Course[];
    activeCourseId: string | null;
    setCourseId: React.Dispatch<React.SetStateAction<string | null>>
    setSectionId: React.Dispatch<React.SetStateAction<string | null>>
}

type Course = {
    course_id: number;
    course_name: string;
}

export default function CourseList({ courses, activeCourseId, setCourseId, setSectionId }: Props) {

    return (
        <div className="course-list flex flex-row gap-2">
            {courses.map((course) => {
                const isActive = activeCourseId === String(course.course_id);

                return (
                    <Button
                        key={course.course_id}
                        onClick={() => {
                            setCourseId(String(course.course_id));
                            setSectionId(null);
                        }}
                        variant={isActive ? "default" : "outline"}
                        className="p-2.5!"
                    >
                        {course.course_name}
                    </Button>
                );
            })}
        </div>

    )
}
