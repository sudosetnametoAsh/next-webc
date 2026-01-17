export type Courses = {
    course_id: number;
    course_name: string;
    course_sections: Sections[];
}

type Sections = {
    section_number: number;
    year: number;
    semester: number;
    section_id: number;
};
