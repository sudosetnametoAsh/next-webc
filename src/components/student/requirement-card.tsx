"use client";

import React, { useState } from 'react';

interface RequirementCardProps {
  department: string;
  staff: string;
  status: string;
  tasks: string[];
}

export const RequirementCard = ({ department, staff, status, tasks }: RequirementCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const isPending = status === 'Pending';
  const hasTasks = tasks.length > 0;

  const containerStyle = isPending 
    ? "bg-yellow-50 border-yellow-200" 
    : "bg-green-50 border-green-200";

  const badgeStyle = isPending
    ? "bg-orange-500 text-white"
    : "bg-green-500 text-white";

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    setIsOpen(!isOpen);
  };

  return (
    <div className={`w-full border rounded-xl shadow-sm transition-all overflow-hidden ${containerStyle}`}>
      
      {/* HEADER ROW */}
      <div 
        onClick={handleToggle}
        className="relative flex items-center justify-between p-4 cursor-pointer hover:bg-white/50 transition-colors gap-4 select-none"
      >
        {/* Left Side */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-800 break-words line-clamp-1">{department}</span>
            {hasTasks && (
               <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full font-bold">
                 {tasks.length}
               </span>
            )}
          </div>
          <span className="text-sm text-gray-500 truncate">{staff}</span>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-3 shrink-0">
          
          {/* --- FIX IS HERE --- */}
          {/* 1. min-w-[85px]: Forces the badge to be wide enough no matter what */}
          {/* 2. justify-center: Centers the text inside that wide badge */}
          {/* 3. text-[11px]: Slightly smaller text to prevent edge touching */}
          <div className={`
            min-w-[85px] flex items-center justify-center 
            px-3 py-1.5 rounded-full shadow-sm 
            text-[11px] font-bold uppercase tracking-wide whitespace-nowrap
            ${badgeStyle}
          `}>
            {status}
          </div>

          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            strokeWidth={2} 
            stroke="currentColor" 
            className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </div>

      {/* DROPDOWN CONTENT */}
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
                            <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${isPending ? 'bg-orange-400' : 'bg-green-500'}`} />
                            <span className={isPending ? "" : "line-through text-gray-400"}>
                                {task}
                            </span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-gray-400 italic">No specific requirements listed.</p>
            )}
        </div>
      </div>
    </div>
  );
};