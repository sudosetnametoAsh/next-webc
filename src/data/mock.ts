import { CourseTemplate } from "@/types/mock";

// ============================================
// Mock Course Templates
// ============================================

export const mockCourseTemplates: CourseTemplate[] = [
  {
    id: "1",
    code: "BSCS",
    name: "Bachelor of Science in Computer Science",
    completionRate: 72,
    studentsEnrolled: 31,
    assignedDepartments: [
      "Cashier",
      "Clinic",
      "Computer Laboratory",
      "Guidance",
      "Academic Head",
      "Registrar",
    ],
    updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
  },
  {
    id: "2",
    code: "BSIT",
    name: "Bachelor of Science in Information Technology",
    completionRate: 13,
    studentsEnrolled: 127,
    assignedDepartments: [
      "Cashier",
      "Clinic",
      "Computer Laboratory",
      "Guidance",
      "Academic Head",
      "Registrar",
    ],
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
  },
  {
    id: "3",
    code: "BSTM",
    name: "Bachelor of Science in Tourism Management",
    completionRate: 43,
    studentsEnrolled: 89,
    assignedDepartments: [
      "Cashier",
      "Clinic",
      "Computer Laboratory",
      "Guidance",
      "Academic Head",
      "Registrar",
    ],
    updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
  },
]