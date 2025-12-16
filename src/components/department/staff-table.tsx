import { useFetchStaffData } from "@/hooks/fetch-staff-data"

export default function StaffTable() {
    const { data } = useFetchStaffData();
    console.log(data)

    return (
        <>
            
        </>


    )
}