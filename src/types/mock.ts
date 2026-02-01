export interface CourseTemplate {
  id: string;
  code: string; // e.g., "BSCS"
  name: string; // e.g., "Bachelor of Science in Computer Science"
  completionRate: number; // 0-100
  studentsEnrolled: number;
  assignedDepartments: string[];
  updatedAt: Date;
}