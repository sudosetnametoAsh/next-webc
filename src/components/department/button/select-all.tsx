import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useMemo, useState } from "react";
import { DialogDescription } from "@radix-ui/react-dialog";
import "@/styles/select-all.css"

type CheckedState = boolean | "indeterminate";

type Params = {
    students: Student[];
    clearanceId: string[];
    setClearanceId: React.Dispatch<React.SetStateAction<string[]>>;
    effectiveStatus: string;
}

type Student = {
    student_clearances: Clearance[]
}

type Clearance = {
    clearance_id: string
    status: string
}

export default function SelectAll({ students, clearanceId, setClearanceId, effectiveStatus }: Params) {
    const [open, setOpen] = useState(false);

    const studentClearances = useMemo(() =>
        students.map((student) => student.student_clearances[0]),
        [students]
    );

    const selectedIds = useMemo(() => new Set(clearanceId), [clearanceId])

    const targetStudentIds = useMemo(() =>
        studentClearances
            .filter((student) => student.status === effectiveStatus)
            .map((student) => student.clearance_id),
        [studentClearances, effectiveStatus]
    )

    const hasMixedStatuses = studentClearances.length > 0 && !studentClearances.every(
        (student) => student.status === studentClearances[0].status
    );

    const selectByStatus = (status: string) => {
        const filteredIds = studentClearances
            .filter(student => student.status === status)
            .map(student => student.clearance_id);
        setClearanceId(filteredIds);
        setOpen(false);
    };

    const allAreSelected = targetStudentIds.length > 0 && targetStudentIds.every((id) => selectedIds.has(id))
    const isIndeterminate = targetStudentIds.some((id) => selectedIds.has(id)) && !allAreSelected
    const selectState = isIndeterminate ? "indeterminate" : allAreSelected

    const handleSelectAll = (checked: CheckedState) => {
        if (isIndeterminate) {
            const remainingIds = targetStudentIds.filter((id) => !selectedIds.has(id))
            return setClearanceId(prev => [...prev, ...remainingIds]);
        }
        else if (checked && hasMixedStatuses) {
            setOpen(true);
            return;
        } else if (checked) {
            return setClearanceId(studentClearances.map((id) => id.clearance_id))
        }
        else {
            return setClearanceId([])
        }
    };

    return (
        <div className="flex items-center gap-2">
            <Checkbox
                id="all"
                checked={selectState}
                onCheckedChange={handleSelectAll}
                className="cursor-pointer"
            />

            <Label
                className="text-base cursor-pointer"
                htmlFor="all"
            >
                {isIndeterminate || !allAreSelected ? "Select All" : "Clear All"}
            </Label>

            <Dialog
                open={open}
                onOpenChange={setOpen}
            >
                <DialogContent className="h-50 flex-col justify-center">

                    <DialogHeader className="header">
                        <DialogTitle>Select states to filter</DialogTitle>
                    </DialogHeader>

                    <DialogDescription>
                        There appears to be multiple states in this section, please select one
                    </DialogDescription>

                    <DialogFooter className="footer">

                        <Button
                            size="sm"
                            onClick={() => selectByStatus("Signed")}>
                            Signed
                        </Button>

                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => selectByStatus("Pending")}
                        >
                            Pending
                        </Button>

                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}