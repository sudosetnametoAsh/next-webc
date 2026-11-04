import { validateWeeklySchedule } from "@/lib/weekly-schedule";
import { ScheduleRepository, WeeklySchedule } from "../repository/schedule-repository";

export class SetSchedule {
  constructor(private repository: ScheduleRepository) {}

  async execute(
    id: string,
    name?: string,
    weekly_schedule?: WeeklySchedule | null,
    early_out_date?: string | null,
  ) {
    return await this.repository.setSchedule(
      id,
      name,
      validateWeeklySchedule(weekly_schedule),
      early_out_date,
    );
  }
}
