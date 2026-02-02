"use client";
import React from "react";

interface HeroSectionProps {
  name: string;
  id: string;
  isComplete: boolean;
}

export function HeroSection({ name, id, isComplete }: HeroSectionProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full">
      
      {/* Student Details */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">{name}</h1>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-gray-500 font-medium text-sm">ID: {id}</span>
          <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
            Student Account
          </span>
        </div>
      </div>

      {/* Status Badge (Green/Orange) */}
      <div
        className={`px-5 py-2.5 rounded-lg font-bold text-white text-sm shadow-sm flex items-center justify-center gap-2 transition-colors w-full md:w-auto ${
          isComplete ? "bg-emerald-500" : "bg-orange-500"
        }`}
      >
        {isComplete ? "✓ Clearance Complete" : "⚠ Clearance Incomplete"}
      </div>
    </div>
  );
}