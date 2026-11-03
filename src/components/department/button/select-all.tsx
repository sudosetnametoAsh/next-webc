"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ListFilter, Clock, CheckCircle2, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

type CheckedState = boolean | "indeterminate";

type Params = {
  students: Student[];
  clearanceId: string[];
  setClearanceId: React.Dispatch<React.SetStateAction<string[]>>;
  effectiveStatus: string;
};

type Student = {
  clearance_records?: Clearance[];
  clearanceId?: string;
  status?: string;
};

type Clearance = {
  clearance_id: string;
  status: string;
};

export default function SelectAll({
  students,
  clearanceId,
  setClearanceId,
  effectiveStatus,
}: Params) {
  const [open, setOpen] = useState(false);

  const clearanceRecords = useMemo(
    () =>
      students.map((student) => {
        if (student.clearance_records && student.clearance_records[0]) {
          return student.clearance_records[0];
        }
        return {
          clearance_id: student.clearanceId || "",
          status: student.status || "Pending",
        };
      }),
    [students],
  );

  const selectedIds = useMemo(() => new Set(clearanceId), [clearanceId]);

  // Group strictly by "Signed" vs "Actionable" (Pending, Incomplete, Awaiting)
  const signedIds = useMemo(
    () => clearanceRecords.filter((s) => s.status === "Signed").map((s) => s.clearance_id),
    [clearanceRecords]
  );

  const actionableIds = useMemo(
    () => clearanceRecords.filter((s) => s.status !== "Signed").map((s) => s.clearance_id),
    [clearanceRecords]
  );

  const hasMixedStatuses = signedIds.length > 0 && actionableIds.length > 0;

  // Determine which group is currently targeted based on context
  const targetIds = effectiveStatus === "Signed" ? signedIds : actionableIds;

  const allAreSelected = targetIds.length > 0 && targetIds.every((id) => selectedIds.has(id));
  const isIndeterminate = targetIds.some((id) => selectedIds.has(id)) && !allAreSelected;
  const selectState = isIndeterminate ? "indeterminate" : allAreSelected;

  const handleSelectAll = (checked: CheckedState) => {
    if (isIndeterminate) {
      // Fill the rest of the target group
      const remainingIds = targetIds.filter((id) => !selectedIds.has(id));
      return setClearanceId((prev) => [...prev, ...remainingIds]);
    } else if (checked && hasMixedStatuses && selectedIds.size === 0) {
      // If nothing is selected and there's a mix, ask which group to target
      setOpen(true);
    } else if (checked) {
      // Select the active group (defaults to actionable if none)
      setClearanceId(targetIds.length > 0 ? targetIds : actionableIds);
    } else {
      setClearanceId([]);
    }
  };

  const selectGroup = (group: "Signed" | "Actionable") => {
    setClearanceId(group === "Signed" ? signedIds : actionableIds);
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id="all"
        aria-label="Select all clients"
        checked={selectState}
        onCheckedChange={handleSelectAll}
        className="relative after:absolute after:-inset-3.5 after:content-[''] cursor-pointer border-slate-700 bg-slate-900/80 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500 data-[state=checked]:text-slate-950"
      />
      <Label className="cursor-pointer text-base" htmlFor="all" />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden rounded-2xl border-slate-800 bg-[#0a101f] p-0 text-left text-slate-100 shadow-2xl sm:max-w-md [&>button]:text-slate-400">
          <DialogHeader className="shrink-0 border-b border-slate-800 px-5 py-5 pr-12 text-left sm:px-6">
            <DialogTitle className="flex items-center gap-3 text-lg font-semibold tracking-tight">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-amber-300">
                <ListFilter className="h-5 w-5" />
              </span>
              Filter selection
            </DialogTitle>
            <DialogDescription className="text-xs font-normal leading-relaxed tracking-normal text-slate-400 normal-case">
              These clients have different clearance statuses. Choose a group to select.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 space-y-3 overflow-y-auto p-5 sm:p-6">
            <p className="mb-4 text-xs font-medium tracking-normal text-slate-400 normal-case">
              Select clients by status
            </p>
            <Button
              variant="ghost"
              className="group flex h-auto w-full items-center justify-start gap-3 rounded-xl border border-slate-800 bg-[#070c18] p-4 text-left whitespace-normal hover:border-amber-400/40 hover:bg-amber-400/5 hover:text-slate-100 focus-visible:ring-amber-400/40"
              onClick={() => selectGroup("Actionable")}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300"><Clock className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1 space-y-1">
                <span className="block text-sm font-semibold text-slate-200">Actionable clients</span>
                <span className="block text-xs font-normal leading-relaxed text-slate-400">Pending or incomplete clearance</span>
              </span>
              <span className="rounded-md border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-xs tabular-nums text-amber-300">{actionableIds.length}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-600 group-hover:text-amber-300" />
            </Button>

            <Button
              variant="ghost"
              className="group flex h-auto w-full items-center justify-start gap-3 rounded-xl border border-slate-800 bg-[#070c18] p-4 text-left whitespace-normal hover:border-emerald-400/40 hover:bg-emerald-400/5 hover:text-slate-100 focus-visible:ring-emerald-400/40"
              onClick={() => selectGroup("Signed")}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300"><CheckCircle2 className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1 space-y-1">
                <span className="block text-sm font-semibold text-slate-200">Signed clients</span>
                <span className="block text-xs font-normal leading-relaxed text-slate-400">Clearance already signed off</span>
              </span>
              <span className="rounded-md border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-xs tabular-nums text-emerald-300">{signedIds.length}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-600 group-hover:text-emerald-300" />
            </Button>
          </div>

          <DialogFooter className="shrink-0 border-t border-slate-800 bg-[#070c18] px-5 py-3 sm:px-6">
            <Button variant="ghost" className="h-9 rounded-lg px-5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
