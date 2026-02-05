"use client";

import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import CreateTemplateModal from './create-template-modal'; // Import your Modal

// Updated Interface to include ID
interface CourseTemplate {
  id: string;
  code: string;
  name: string;
  completionRate: number;
  studentsEnrolled: number;
  assignedDepartments: string[];
  updatedAt: string;
}

// Reusable card component (Unchanged)
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
            className="h-full bg-slate-900 rounded-full"
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
          {template.assignedDepartments.length > 0 ? (
            template.assignedDepartments.map((dept, index) => (
              <span key={index} className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-md">
                {dept}
              </span>
            ))
          ) : (
            <span className="text-xs text-gray-400 italic">No departments assigned</span>
          )}
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4 flex justify-between items-center text-sm">
        <span className="text-gray-500">{template.updatedAt}</span>
        <button className="text-slate-900 font-medium hover:underline flex items-center gap-1">
          Manage <span>&rarr;</span>
        </button>
      </div>
    </div>
  );
};

// Main section component
const CourseTemplatesSection: React.FC = () => {
  const [templates, setTemplates] = useState<CourseTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false); // Modal State

  // Fetch function (moved outside useEffect so the Modal can call it on success)
  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/courses');
      const json = await res.json();
      
      if (json.data) {
        // --- NEW FILTER LOGIC ---
        // Only keep courses that have at least 1 department assigned.
        // If a course has 0 departments, it means no template has been created for it yet.
        const createdTemplates = json.data.filter((course: CourseTemplate) => 
          course.assignedDepartments && course.assignedDepartments.length > 0
        );
        
        setTemplates(createdTemplates);
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial Fetch
  useEffect(() => {
    fetchTemplates();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header + Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Course Templates</h2>
          <p className="text-sm text-gray-500">Manage templates for each course</p>
        </div>
        
        {/* Standard HTML Button (Styled with Tailwind) */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
        >
          <Plus className="w-4 h-4" />
          Create Template
        </button>
      </div>
      
      {/* Content Area */}
      {isLoading ? (
        <div className="p-10 text-center text-sm text-gray-500">Loading templates...</div>
      ) : templates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {templates.map((template) => (
            <CourseTemplateCard key={template.id} template={template} />
          ))}
        </div>
      ) : (
        // Empty State (Shown when list is empty)
        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
          <div className="bg-gray-100 p-3 rounded-full mb-3">
            <Plus className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-900 font-medium">No templates created yet</p>
          <p className="text-gray-500 text-sm mt-1 max-w-sm text-center">
            Click "Create Template" to assign departments and staff to a course section.
          </p>
        </div>
      )}

      {/* The Modal */}
      <CreateTemplateModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen}
        onSuccess={fetchTemplates} // Pass the fetch function to refresh list after saving
      />
    </div>
  );
};

export default CourseTemplatesSection;