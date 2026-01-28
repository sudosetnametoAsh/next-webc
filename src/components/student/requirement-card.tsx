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

  // Dynamic Styles
  const containerStyle = isPending 
    ? "bg-yellow-50 border-yellow-200" 
    : "bg-green-50 border-green-200";

  const badgeStyle = isPending
    ? "bg-orange-500 text-white"
    : "bg-green-500 text-white";

  return (
    <div className={`w-full border rounded-xl shadow-sm transition-all overflow-hidden ${containerStyle}`}>
      
      
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-between p-4 cursor-pointer hover:bg-opacity-80 transition-colors gap-4"
      >
        {/* Left Side: Dept Name & Staff */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-800 wrap-break-word">{department}</span>
            
            {hasTasks && (
               <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full font-bold">
                 {tasks.length}
               </span>
            )}
          </div>
          <span className="text-sm text-gray-500 truncate">{staff}</span>
        </div>

        {/* Right Side: Status Badge & Arrow */}
        <div className="flex items-center gap-3 shrink-0">
          <div className={`px-3 py-1 text-xs font-bold rounded-full ${badgeStyle}`}>
            {status}
          </div>

          {/* Animated Arrow Icon */}
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

      {/* --- DROPDOWN CONTENT (Visible when Open) --- */}
      
      <div 
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="p-4 border-t border-gray-200/50 bg-white/40">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Requirements Checklist:
            </h4>
            
            {tasks.length > 0 ? (
                <ul className="space-y-2">
                    {tasks.map((task, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                            
                            <span className={`mt-0.5 w-4 h-4 flex items-center justify-center rounded border ${isPending ? 'border-orange-300 bg-orange-50' : 'border-green-300 bg-green-50'}`}>
                                {isPending ? (
                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>
                                ) : (
                                    <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M5 13l4 4L19 7" /></svg>
                                )}
                            </span>
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