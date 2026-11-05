import { getSession } from "@/lib/auth/get-session";
import { fetchDepartmentSchedule } from "@/lib/services/department-cache";
import DepartmentCalendarClient from "@/components/department/calendar/department-calendar-client";

export const dynamic = "force-dynamic";

export default async function DepartmentCalendarPage() {
  const { user_id, user_name, department } = await getSession();
  const scheduleData = await fetchDepartmentSchedule(user_id, department);

  return (
    <DepartmentCalendarClient
      userId={user_id}
      userName={user_name}
      departmentName={scheduleData.deptName}
      iconName={scheduleData.iconName}
      floor={scheduleData.floor}
      room={scheduleData.room}
      initialWeeklySchedule={scheduleData.weeklySchedule}
      initialEarlyOutDate={scheduleData.earlyOutDate}
    />
  );
}
