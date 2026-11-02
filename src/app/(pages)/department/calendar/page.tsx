import { getSession } from "@/lib/auth/get-session";
import { getCachedDepartmentSchedule } from "@/lib/services/department-cache";
import DepartmentCalendarClient from "@/components/department/calendar/department-calendar-client";

export const unstable_dynamicStaleTime = 180;

export default async function DepartmentCalendarPage() {
  const { user_id, user_name, department } = await getSession();
  const scheduleData = await getCachedDepartmentSchedule(user_id, department);

  return (
    <DepartmentCalendarClient
      userId={user_id}
      userName={user_name}
      departmentName={scheduleData.deptName}
      iconName={scheduleData.iconName}
      floor={scheduleData.floor}
      room={scheduleData.room}
      initialTimeIn={scheduleData.timeIn}
      initialTimeOut={scheduleData.timeOut}
      initialWeeklySchedule={scheduleData.weeklySchedule}
      initialEarlyOutDate={scheduleData.earlyOutDate}
    />
  );
}
