export type Day = 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7';

export const DAYS: Day[] = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
export const HOURS = [6, 7, 8, 9, 10, 11, 14, 15, 16, 17, 18, 19];

export interface Trainer {
  id: string;
  name: string;
}

export interface Student {
  id: string;
  name: string;
  sessionsPerWeek: number;
  availableSlots: string[]; // Format: "T2-6", "T3-14"
}

export interface ScheduleEntry {
  studentId: string;
  trainerId: string;
}

export interface Schedule {
  [slotId: string]: ScheduleEntry[];
}

export interface Warning {
  studentId: string;
  scheduled: number;
  requested: number;
  suggestions: string[];
}

export interface SchedulerResult {
  schedule: Schedule;
  warnings: Warning[];
}

