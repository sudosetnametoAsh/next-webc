"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ListFilter } from "lucide-react";
import { useMemo, useState } from "react";

type CheckedState = boolean | "indeterminate";

type Params = {
  students: Student[];
  clearanceId: string[];
  setClearanceId: React.Dispatch<React.SetStateAction<string[]>>;
  effectiveStatus: string;
};

type Student = {
  student_clearances: Clearance[];
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

  const studentClearances = useMemo(
    () => students.map((student) => student.student_clearances[0]),
    [students],
  );

  const selectedIds = useMemo(() => new Set(clearanceId), [clearanceId]);

  // Group strictly by "Signed" vs "Actionable" (Pending, Incomplete, Awaiting)
  const signedIds = useMemo(
    () => studentClearances.filter((s) => s.status === "Signed").map((s) => s.clearance_id),
    [studentClearances]
  );

  const actionableIds = useMemo(
    () => studentClearances.filter((s) => s.status !== "Signed").map((s) => s.clearance_id),
    [studentClearances]
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
        checked={selectState}
        onCheckedChange={handleSelectAll}
        className="cursor-pointer border-slate-300 data-[state=checked]:bg-[#0b3b75] data-[state=checked]:border-[#0b3b75]"
      />
      <Label className="cursor-pointer text-base" htmlFor="all" />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden border-none p-0 shadow-2xl sm:max-w-md">
          <DialogHeader className="bg-[#0b3b75] px-6 py-5 text-white">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold tracking-wide">
              <ListFilter className="h-5 w-5" />
              Filter Selection
            </DialogTitle>
            <p className="text-sm font-medium text-blue-200">
              Multiple student statuses detected
            </p>
          </DialogHeader>

          <div className="flex flex-col gap-5 bg-slate-50/50 p-6">
            <p className="text-sm font-medium leading-relaxed text-slate-600">
              Please select which group of students you want to target:
            </p>

            <div className="flex flex-col gap-2.5">
              <Button
                variant="outline"
                className="flex w-full items-center justify-start gap-3 border-slate-200 bg-white py-6 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-700"
                onClick={() => selectGroup("Actionable")}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-400 shadow-sm shadow-amber-200" />
                Select Actionable Students (Pending & Incomplete)
              </Button>

              <Button
                variant="outline"
                className="flex w-full items-center justify-start gap-3 border-slate-200 bg-white py-6 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-700"
                onClick={() => selectGroup("Signed")}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200" />
                Select Signed Students
              </Button>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end border-t border-slate-200 bg-white px-6 py-4">
            <Button
              variant="ghost"
              className="font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
