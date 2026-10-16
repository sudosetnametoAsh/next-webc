"use client";

import React from "react";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import HierarchyManager from "./hierarchy-manager";
import { GitFork, X } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ManageHierarchyModal({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-3xl max-h-[90dvh] flex flex-col gap-0 overflow-hidden p-0 bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100">
        <DialogHeader className="shrink-0 border-b border-slate-200 p-4 pr-16 text-left sm:p-6 sm:pr-16 dark:border-slate-800">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-slate-100">
            <GitFork className="h-5 w-5 shrink-0 text-amber-500" />
            Clearance Signing Hierarchy & Workflow
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            Configure prerequisite signing sequence tiers for clearance departments.
          </DialogDescription>
        </DialogHeader>
        <DialogClose asChild>
          <Button type="button" variant="ghost" size="icon" aria-label="Close" className="absolute top-2 right-2 h-11 w-11 rounded-lg">
            <X aria-hidden="true" />
          </Button>
        </DialogClose>

        <div className="min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6">
          <HierarchyManager />
        </div>
      </DialogContent>
    </Dialog>
  );
}
