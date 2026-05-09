
export type getSchedulePromise = {
  time_in: string | null;
  time_out: string | null;
};

export interface ScheduleRepository {
  getSchedule(id: string): Promise<getSchedulePromise>;
  setSchedule(id: string, time_in: string, time_out: string): Promise<void>;
}
