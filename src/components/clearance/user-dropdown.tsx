"use client";

import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LogOut, FileDown, ShieldCheck } from "lucide-react";
import { exportClearancePDF } from "@/utils/export-clearance-pdf";
import { getClearanceRecordsPromise, getStudentProfilePromise, getSummaryPromise } from "@/modules/clearance/application/repository/dashboard-repository";

interface UserDropdownProps {
  user: {
    name: string;
    email: string;
    userId?: string;
  };
  profile: getStudentProfilePromise | null;
  records: getClearanceRecordsPromise;
  summary: getSummaryPromise;
}

export default function UserDropdown({ user, profile, records, summary }: UserDropdownProps) {
  const isCleared = summary.remaining_department === 0 && summary.department_count > 0;

  const handleLogout = () => {
    window.location.replace("/api/auth/clear-session");
  };

  const generatePDF = () => {
    exportClearancePDF({
      studentProfile: profile,
      user,
      records,
      summary,
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex h-9 w-9 items-center justify-center rounded-full border bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer outline-none">
          <User size={20} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 mt-1">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={generatePDF} 
          disabled={!isCleared}
          className="cursor-pointer flex items-center gap-2"
        >
          <FileDown size={16} />
          <span>Export Clearance (PDF)</span>
          {!isCleared && (
            <span className="ml-auto text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
              Pending
            </span>
          )}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handleLogout}
          className="cursor-pointer flex items-center gap-2 text-red-600 focus:text-red-600"
        >
          <LogOut size={16} />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
