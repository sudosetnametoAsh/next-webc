"use client";

import React, { useState } from 'react';
import { ChevronDown, CheckCircle2 } from "lucide-react"; // Or use SVG if preferred

interface RequirementCardProps {
  department: string;
  staff: string;
  status: string;
  tasks: string[];
}

export const RequirementCard = ({ department, staff, status, tasks }: RequirementCardProps) => {
  // 1. LOCAL STATE: Each card controls its own dropdown
  const [isOpen, setIsOpen] = useState(false);
  
  const isPending = status === 'Pending';
  const hasTasks = tasks.length > 0;

  // Dynamic Styles based on status
  const containerStyle = isPending 
    ? "bg-yellow-50 border-yellow-200" 
    : "bg-green-50 border-green-200";

  const badgeStyle = isPending
    ? "bg-orange-500 text-white"
    : "bg-green-500 text-white";

  // Toggle Function
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation(); // Stops click from affecting parent containers
    setIsOpen(!isOpen);
  };

  return (
    <div className={`w-full border rounded-xl shadow-sm transition-all overflow-hidden ${containerStyle}`}>
      
      {/* HEADER ROW (Clickable) */}
      <div 
        onClick={handleToggle} 
        className="relative flex items-center justify-between p-4 cursor-pointer hover:bg-white/50 transition-colors gap-4 select-none"
      >
        {/* Left: Department Info */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-800 truncate">{department}</span>
            {hasTasks && (
               <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full font-bold">
                 {tasks.length}
               </span>
            )}
          </div>
          <span className="text-sm text-gray-500 truncate">{staff}</span>
        </div>

        {/* Right: Status Badge & Icon */}
        <div className="flex items-center gap-3 shrink-0">
          <div className={`px-3 py-1 text-xs font-bold rounded-full ${badgeStyle}`}>
            {status}
          </div>
          <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* DROPDOWN CONTENT */}
      {/* Uses CSS max-height for smooth slide animation */}
      <div 
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="p-4 border-t border-gray-200/50 bg-white/60">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Requirements Checklist:
            </h4>
            
            {tasks.length > 0 ? (
                <ul className="space-y-2">
                    {tasks.map((task, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                            {/* Simple Bullet Point */}
                            <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${isPending ? 'bg-orange-400' : 'bg-green-500'}`} />
                            <span className={isPending ? "" : "line-through text-gray-400"}>
                                {task}
                            </span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-gray-400 italic flex items-center gap-2">
                   <CheckCircle2 className="w-4 h-4" />
                   No specific requirements listed.
                </p>
            )}
        </div>
      </div>
    </div>
  );
};