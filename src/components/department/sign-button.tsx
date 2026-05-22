import { useSignStudent } from "@/hooks/department/sign-student"
import { Button } from "../ui/button"

type Props = {
    clearanceId: string[]
    currentStatus: string
}

export default function SignToggleButton({ clearanceId, currentStatus }: Props) {
    const { mutate, isPending } = useSignStudent()

    const isSigned = currentStatus === "Signed"
    const targetStatus = isSigned ? "Pending" : "Signed"

    const btnText = isPending
        ? (isSigned ? "Signing..." : "Signing...")
        : (isSigned ? "Undo" : "Sign")

    const btnStyle = isSigned
        ? "bg-yellow-600 hover:bg-yellow-700 text-white"
        : "bg-blue-600 hover:bg-blue-700 text-white"

    const handleToggle = () => {
        // Generate the current timestamp if signing, or null if reverting
        const dateNow = targetStatus === "Signed" ? new Date().toISOString() : null;

        mutate({
            ids: clearanceId,
            status: targetStatus,
            signed_at: dateNow
        })
    }

    return (
        <div>
            <Button
                onClick={handleToggle}
                disabled={isPending || clearanceId.length === 0}
                className={` p-2.5! sign-btn px-4 py-2 rounded-[10px] disabled:opacity-50 ${btnStyle}`}
            >
                {btnText}
            </Button>
        </div>

    )
}
