import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type CheckedState = boolean | "indeterminate";

type Params = {
    students: Student[];
    selectedClearanceId: string[];
    setSelectedClearanceId: React.Dispatch<React.SetStateAction<string[]>>;
}

type Student = {
    student_clearances: Clearance[]
}

type Clearance = {
    clearance_id: string
}

export default function SelectAll({ students, selectedClearanceId, setSelectedClearanceId }: Params) {
    const handleSelectAll = (checked: CheckedState) => {
        const newSelectedStudents = checked === true
            ? students.map(student => student.student_clearances?.[0].clearance_id)
            : []
        setSelectedClearanceId(newSelectedStudents)
    }

    const allSelected = students.length > 0 && selectedClearanceId.length === students.length;
    const isIndeterminate = selectedClearanceId.length > 0 && selectedClearanceId.length < students.length;
    const selectAllState = isIndeterminate ? "indeterminate" : allSelected;

    return (
        <div>
            {/* Select all */}
            <Checkbox
                id="all"
                checked={selectAllState}
                onCheckedChange={handleSelectAll}
                className="cursor-pointer"
            />
            <Label className="text-base" htmlFor="all"> {isIndeterminate || setSelectedClearanceId.length === 0 ? <p> Select All </p> : <p> Clear All </p>} </Label>
        </div>
    )
}