"use client";
import React from "react";
// 1. IMPORT ICONS (Much cleaner than text characters)
import { AlertCircle, CheckCircle2 } from "lucide-react"; 

interface HeroSectionProps {
  name: string;
  id: string;
  isComplete: boolean;
}

export function HeroSection({ name, id, isComplete }: HeroSectionProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full">
      
      {/* LEFT SIDE: Student Details 
         - flex-1: Takes up all available empty space
         - min-w-0: CRITICAL. Allows the text to truncate (...) instead of pushing the badge off-screen
      */}
      <div className="flex-1 min-w-0 w-full">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800 truncate">
          {name}
        </h1>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-gray-500 font-medium text-sm">ID: {id}</span>
          <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
            Student Account
          </span>
        </div>
      </div>

      {/* RIGHT SIDE: Status Badge 
         - shrink-0: CRITICAL. Prevents the badge from being squished by long names.
         - whitespace-nowrap: Keeps text on one line.
      */}
      <div
        className={`
          flex items-center justify-center gap-2 
          px-5 py-2.5 rounded-lg shadow-sm 
          text-white text-sm font-bold 
          transition-colors whitespace-nowrap shrink-0
          w-full md:w-auto
          ${isComplete ? "bg-emerald-500" : "bg-orange-500"}
        `}
      >
        {isComplete ? (
          <>
            <CheckCircle2 className="w-5 h-5" />
            <span>Clearance Complete</span>
          </>
        ) : (
          <>
            <AlertCircle className="w-5 h-5" />
            <span>Clearance Incomplete</span>
          </>
        )}
      </div>
    </div>
  );
}