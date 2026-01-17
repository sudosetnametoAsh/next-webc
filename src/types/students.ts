export type Students = {
    student_id: string;
    student_name: string
    student_clearances: Clearance[]
}

type Clearance = {
    clearance_id: string;
    status: string;
};
