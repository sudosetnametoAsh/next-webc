import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import DepartmentCalendarClient, { type WeeklySchedule } from '../../src/components/department/calendar/department-calendar-client';

const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
function Fixture() {
  const [schedule, setSchedule] = useState<WeeklySchedule | null>(null);
  useEffect(() => { void fetch('/fixture/schedule').then((res) => res.json()).then(setSchedule); }, []);
  if (!schedule) return <p>Loading schedule</p>;
  return <QueryClientProvider client={client}>
    <DepartmentCalendarClient userId="test-officer" userName="Test Officer" departmentName="Clinic"
      iconName="Building2" floor="1" room="101" initialWeeklySchedule={schedule} />
    <Toaster />
  </QueryClientProvider>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
