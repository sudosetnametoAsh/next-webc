import { NotFoundError } from "../error";
import { ScheduleRepository } from "../repository/schedule-repository";

export class GetSchedule {
  constructor(private repository: ScheduleRepository) {}

  async execute(id: string) {
    const schedule = await this.repository.getSchedule(id)

    if(!schedule.weekly_schedule || Object.keys(schedule.weekly_schedule).length === 0) throw new NotFoundError("Schedule not found");

    return schedule
  }
}
