
export type DayScheduleConfig = {
  active: boolean;
  time_in: string;
  time_out: string;
};

export type WeeklySchedule = Record<string, DayScheduleConfig>;

export type getSchedulePromise = {
  time_in: string | null;
  time_out: string | null;
  weekly_schedule?: WeeklySchedule | null;
  early_out_date?: string | null;
};

export interface ScheduleRepository {
  getSchedule(id: string): Promise<getSchedulePromise>;
  setSchedule(
    id: string, 
    time_in: string, 
    time_out: string,
    name?: string,
    weekly_schedule?: WeeklySchedule | null,
    early_out_date?: string | null,
  ): Promise<void>;
}
