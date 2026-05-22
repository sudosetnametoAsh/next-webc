export type getStatCardValuePromise = {
    signed: number;
    incomplete: number
    pending: number;
    total: number;
}

export type getRecentSubmissionsPromise = {
  assignedTaskId: number;
  studentId: string;
  studentName: string | null;
  course: string;
  taskTitle: string | null;
  uploadedAt: string | null;
};

export type getRecentActivityPromise = {
    message: string;
    actions: string;
    created_at: Date;
}

export interface DashboardRepository {
    getStatCardValue(staffId: string) : Promise<getStatCardValuePromise>;
    getRecentSubmissions(staffId: string) : Promise<getRecentSubmissionsPromise[]>;
    getRecentActivity(staffId:string) :Promise<getRecentActivityPromise[]>
}
