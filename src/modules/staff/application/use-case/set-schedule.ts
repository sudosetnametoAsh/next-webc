import { ScheduleRepository } from "../repository/schedule-repository";

export class SetSchedule {
  constructor(private repository: ScheduleRepository) {}

  async execute(id: string, time_in: string, time_out: string, name?: string) {
    if (time_out <= time_in) {
      throw new Error("End time must be after start time");
    }
    return await this.repository.setSchedule(id, time_in, time_out, name);
  }
}
