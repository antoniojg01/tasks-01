import type { Timestamp } from 'firebase/firestore';

export type TaskType = 'task' | 'habit';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'abandoned';
export type TimerMode = 'stopwatch' | 'timer' | 'pomodoro';

export interface Task {
  id: string;
  name: string;
  type: TaskType;
  priority: TaskPriority;
  periodId: string;
  tags: string[];
  status: TaskStatus;
  timeSpent: number; // in seconds
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  userId: string;
  pomodoroSettings?: PomodoroSettings;
}

export interface Tag {
    id: string;
    name: string;
    userId: string;
    createdAt: Timestamp;
}

export interface Period {
    id: string;
    name: string;
    userId: string;
    createdAt: Timestamp;
}

export interface PomodoroSettings {
  workDuration: number; // minutes
  shortBreakDuration: number; // minutes
  longBreakDuration: number; // minutes
  cycles: number;
}

export const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  cycles: 4,
};
