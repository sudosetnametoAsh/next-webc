import { NotFoundError } from "../error";
import { ScheduleRepository } from "../repository/schedule-repository";

export class GetSchedule {
  constructor(private repository: ScheduleRepository) {}

  async execute(id: string) {
    const schedule = await this.repository.getSchedule(id)

    if(schedule.time_in === null && schedule.time_out === null ) throw new NotFoundError("Schedule not found");

    return schedule
  }
}
