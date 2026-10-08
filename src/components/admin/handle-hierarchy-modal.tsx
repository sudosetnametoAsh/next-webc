"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import HierarchyManager from "./hierarchy-manager";
import { GitFork } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ManageHierarchyModal({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6 bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100">
        <DialogHeader className="border-b border-slate-200 pb-4 dark:border-slate-800">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-slate-100">
            <GitFork className="h-5 w-5 text-amber-500" />
            Clearance Signing Hierarchy & Workflow
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            Configure prerequisite signing sequence tiers for clearance departments.
          </DialogDescription>
        </DialogHeader>

        <div className="pt-2">
          <HierarchyManager />
        </div>
      </DialogContent>
    </Dialog>
  );
}
