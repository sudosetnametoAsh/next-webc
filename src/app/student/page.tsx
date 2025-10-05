import SignOutButton from "@/components/sign-out-button";
import StudentTable from "@/components/student/student-table";
import "@/styles/temp.css";

export default function Students() {
  return (
    <>
      <StudentTable />

      <SignOutButton />
    </>
  );
}
