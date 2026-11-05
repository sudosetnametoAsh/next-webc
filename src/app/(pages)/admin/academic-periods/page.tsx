import { redirect } from "next/navigation";

export default function AcademicPeriodsPage() {
  redirect("/admin/clients?manageTerm=1");
}
