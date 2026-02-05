import React from 'react';

interface CourseTemplate {
  code: string;
  name: string;
  completionRate: number;
  studentsEnrolled: number;
  assignedDepartments: string[];
  updatedAt: string;
}

// Mock data
const courseTemplates: CourseTemplate[] = [
  {
    code: 'BSCS',
    name: 'Bachelor of Science in Computer Science',
    completionRate: 72,
    studentsEnrolled: 31,
    assignedDepartments: ['Cashier', 'Clinic', 'Computer Laboratory', 'Guidance', 'Academic Head', 'Registrar'],
    updatedAt: 'Updated a few hours ago',
  },
  {
    code: 'BSIT',
    name: 'Bachelor of Science in Information Technology',
    completionRate: 13,
    studentsEnrolled: 127,
    assignedDepartments: ['Cashier', 'Clinic', 'Computer Laboratory', 'Guidance', 'Academic Head', 'Registrar'],
    updatedAt: 'Updated a few hours ago',
  },
  {
    code: 'BSTM',
    name: 'Bachelor of Science in Tourism Management',
    completionRate: 43,
    studentsEnrolled: 89,
    assignedDepartments: ['Cashier', 'Clinic', 'Computer Laboratory', 'Guidance', 'Academic Head', 'Registrar'],
    updatedAt: 'Updated a few hours ago',
  },
];

// Reusable card component for a single course template
const CourseTemplateCard: React.FC<{ template: CourseTemplate }> = ({ template }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col space-y-4">
      <div>
        <h3 className="text-lg font-bold text-gray-900">{template.code}</h3>
        <p className="text-sm text-gray-500">{template.name}</p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-500">
          <span>Completion Rate</span>
          <span className="font-medium text-gray-900">{template.completionRate}%</span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-black rounded-full"
            style={{ width: `${template.completionRate}%` }}
          ></div>
        </div>
      </div>

      <div className="flex justify-between text-sm font-medium text-gray-900">
        <span>Students Enrolled</span>
        <span>{template.studentsEnrolled}</span>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-2">Assigned Departments</h4>
        <div className="flex flex-wrap gap-2">
          {template.assignedDepartments.map((dept, index) => (
            <span key={index} className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-md">
              {dept}
            </span>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4 flex justify-between items-center text-sm">
        <span className="text-gray-500">{template.updatedAt}</span>
        <a href="#" className="text-black font-medium hover:underline flex items-center gap-1">
          Manage <span>&rarr;</span>
        </a>
      </div>
    </div>
  );
};

// Main section component
const CourseTemplatesSection: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Course Templates</h2>
        <p className="text-sm text-gray-500">Manage templates for each course</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {courseTemplates.map((template, index) => (
          <CourseTemplateCard key={index} template={template} />
        ))}
      </div>
    </div>
  );
};

export default CourseTemplatesSection;