import { useSignStudent } from "@/hooks/department/sign-student"
import { Button } from "../ui/button"
import "@/styles/sign-button.css"

type Props = {
    clearanceId: string[]
    currentStatus: string // "Pending", "Signed", etc.
}

export default function SignToggleButton({ clearanceId, currentStatus }: Props) {
    const { mutate, isPending } = useSignStudent()

    const isSigned = currentStatus === "Signed"
    const targetStatus = isSigned ? "Pending" : "Signed"
    
    const btnText = isPending 
        ? (isSigned ? "Reverting..." : "Signing...") 
        : (isSigned ? "Undo" : "Sign")

    const btnStyle = isSigned 
        ? "bg-yellow-600 hover:bg-yellow-700 text-white" 
        : "bg-blue-600 hover:bg-blue-700 text-white"

    const handleToggle = () => {
        mutate({ ids: clearanceId, status: targetStatus })
    }

    return (
        <Button
            onClick={handleToggle}
            disabled={isPending || clearanceId.length === 0}
            className={`sign-btn px-4 py-2 rounded disabled:opacity-50 ${btnStyle}`}
        >
            {btnText}
        </Button>
    )
}