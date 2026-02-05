"use client";

import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import CreateTemplateModal from './create-template-modal';
import ManageStudentsModal from './manage-students-modal'; 

// --- Types ---
interface CourseTemplate {
  id: string;
  code: string;
  name: string;
  completionRate: number;
  studentsEnrolled: number;
  assignedDepartments: string[];
  updatedAt: string;
}

// --- Sub-Component: The Card ---
const CourseTemplateCard = ({ template, onManage }: { template: CourseTemplate, onManage: (t: CourseTemplate) => void }) => (
  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col space-y-4">
    {/* Header: Code & Name */}
    <div>
      <h3 className="text-lg font-bold text-gray-900">{template.code}</h3>
      <p className="text-sm text-gray-500">{template.name}</p>
    </div>

    {/* Progress Bar */}
    <div className="space-y-2">
      <div className="flex justify-between text-sm text-gray-500">
        <span>Completion Rate</span>
        <span className="font-medium text-gray-900">{template.completionRate}%</span>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-slate-900 rounded-full" style={{ width: `${template.completionRate}%` }} />
      </div>
    </div>

    {/* Stats: Enrollment */}
    <div className="flex justify-between text-sm font-medium text-gray-900">
      <span>Students Enrolled</span>
      <span>{template.studentsEnrolled}</span>
    </div>

    {/* Tags: Departments */}
    <div>
      <h4 className="text-sm font-semibold text-gray-900 mb-2">Assigned Departments</h4>
      <div className="flex flex-wrap gap-2">
        {template.assignedDepartments.length > 0 ? (
          template.assignedDepartments.map((dept, i) => (
            <span key={i} className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-md">
              {dept}
            </span>
          ))
        ) : (
          <span className="text-xs text-gray-400 italic">No departments assigned</span>
        )}
      </div>
    </div>

    {/* Footer: Action Button */}
    <div className="border-t border-gray-100 pt-4 flex justify-between items-center text-sm">
      <span className="text-gray-500">{template.updatedAt}</span>
      <button 
        onClick={() => onManage(template)}
        className="text-slate-900 font-medium hover:underline flex items-center gap-1"
      >
        Manage <span>&rarr;</span>
      </button>
    </div>
  </div>
);

// --- Main Component ---
export default function CourseTemplatesSection() {
  const [templates, setTemplates] = useState<CourseTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal States
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [manageState, setManageState] = useState<{ open: boolean, template: CourseTemplate | null }>({
    open: false, 
    template: null
  });

  // 1. Fetch & Filter Logic
  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/courses');
      const json = await res.json();
      
      if (json.data) {
        // Filter: Only show courses that have active templates (departments assigned)
        const activeOnly = json.data.filter((c: CourseTemplate) => 
          c.assignedDepartments?.length > 0
        );
        setTemplates(activeOnly);
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchTemplates() }, []);

  // 2. Handlers
  const openManageModal = (template: CourseTemplate) => setManageState({ open: true, template });
  const closeManageModal = () => setManageState({ open: false, template: null });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Course Templates</h2>
          <p className="text-sm text-gray-500">Manage templates for each course</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
        >
          <Plus className="w-4 h-4" /> Create Template
        </button>
      </div>
      
      {/* Content Grid */}
      {isLoading ? (
        <div className="p-10 text-center text-sm text-gray-500">Loading templates...</div>
      ) : templates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {templates.map((t) => (
            <CourseTemplateCard key={t.id} template={t} onManage={openManageModal} />
          ))}
        </div>
      ) : (
        // Empty State
        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
          <div className="bg-gray-100 p-3 rounded-full mb-3"><Plus className="w-6 h-6 text-gray-400" /></div>
          <p className="text-gray-900 font-medium">No templates created yet</p>
        </div>
      )}

      {/* Modals */}
      <CreateTemplateModal 
        open={isCreateOpen} 
        onOpenChange={setCreateOpen} 
        onSuccess={fetchTemplates} 
      />
      
      <ManageStudentsModal 
        isOpen={manageState.open}
        onClose={closeManageModal}
        template={manageState.template}
      />
    </div>
  );
};