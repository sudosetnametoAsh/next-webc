
export type DayScheduleConfig = {
  active: boolean;
  time_in: string;
  time_out: string;

};

export type WeeklySchedule = Record<string, DayScheduleConfig>;

export type getSchedulePromise = {

  weekly_schedule?: WeeklySchedule | null;
  early_out_date?: string | null;
};

export interface ScheduleRepository {
  getSchedule(id: string): Promise<getSchedulePromise>;
  setSchedule(
    id: string, 
    name?: string,
    weekly_schedule?: WeeklySchedule | null,
    early_out_date?: string | null,
  ): Promise<void>;
}
