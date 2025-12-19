import { useFetchStaffData } from "@/hooks/department/fetch-courses"

export default function StaffTable() {
    const { data } = useFetchStaffData();
    console.log(data)

    return (
        <>
            
        </>


    )
}