export type getStatCardValuePromise = {
  signed: number;
  incomplete: number;
  pending: number;
  total: number;
};

export type getRecentSubmissionsPromise = {
  assignedTaskId: number;
  clearanceId: number;
  studentId: string;
  studentName: string | null;
  course: string;
  section?: string;
  taskTitle: string | null;
  uploadedAt: string | null;
  status: string;
  dropbox: string | null;
  comments: string | null;
  aiAuditReport?: any;
};

export type ClientCoupledSubmissions = {
  studentId: string;
  clearanceId: number;
  studentName: string;
  course: string;
  section?: string;
  latestUploadedAt: string | null;
  totalDocuments: number;
  verifiedCount: number;
  flaggedCount: number;
  needsReviewCount: number;
  documents: getRecentSubmissionsPromise[];
};

export type ReadyToSignClient = {
  clearanceId: number;
  studentId: string;
  studentName: string | null;
  course: string;
  section: string;
  tier: number;
};

export type CourseVelocity = {
  courseId: number | null;
  courseName: string;
  total: number;
  signed: number;
  rate: number;
};

export type getRecentActivityPromise = {
  message: string;
  actions: string;
  created_at: string;
};

export type SectionAuditItem = {
  label: string;
  sectionNumber?: number;
  year?: number;
  semester?: number;
  total: number;
  signed: number;
  pending: number;
  incomplete: number;
  rate: number;
};

export type ProgramAuditItem = {
  courseId: number | null;
  programCode: string;
  programName: string;
  total: number;
  signed: number;
  pending: number;
  incomplete: number;
  rate: number;
  sections: SectionAuditItem[];
};

export type DailyThroughputItem = {
  date: string;
  day: string;
  cleared: number;
};

export type SubmissionQualityStats = {
  totalSubmissions: number;
  aiVerified: number;
  manuallyCleared: number;
  flagged: number;
  pendingReview: number;
  aiPassRate: number;
};

export type DepartmentReportMetrics = {
  totalClients: number;
  clearedCount: number;
  complianceRate: number;
  pendingCount: number;
  overdueCount: number;
  clearedToday: number;
  dailyAverage: number;
  aiPassRate: number;
};

export type DepartmentClientRecord = {
  clientId: string;
  clientName: string;
  program: string;
  section: string;
  status: string;
  signedAt: string | null;
  incompleteTasks: number;
};

export type DepartmentReportData = {
  departmentName: string;
  metrics: DepartmentReportMetrics;
  dailyThroughput: DailyThroughputItem[];
  submissionQuality: SubmissionQualityStats;
  programs: ProgramAuditItem[];
  records: DepartmentClientRecord[];
};

export interface DashboardRepository {
  getStatCardValue(staffId: string): Promise<getStatCardValuePromise>;
  getRecentSubmissions(staffId: string): Promise<getRecentSubmissionsPromise[]>;
  getReadyToSignClients(staffId: string): Promise<ReadyToSignClient[]>;
  getCourseVelocity(staffId: string): Promise<CourseVelocity[]>;
  getRecentActivity(staffId: string): Promise<getRecentActivityPromise[]>;
  getDepartmentReport(staffId: string, departmentName?: string): Promise<DepartmentReportData>;
}
