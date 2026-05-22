import { ScheduleRepository } from "../repository/schedule-repository";

export class SetSchedule {
  constructor(private repository: ScheduleRepository) {}

  async execute(id: string, time_in: string, time_out: string) {
    return await this.repository.setSchedule(id, time_in, time_out);
  }
}
