import type { Timestamp } from 'firebase/firestore';

export type TaskType = 'task' | 'habit';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskPeriod = 'Morning' | 'Afternoon' | 'Evening' | 'Anytime';
export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'abandoned';
export type TimerMode = 'stopwatch' | 'timer' | 'pomodoro';

export interface Task {
  id: string;
  name: string;
  type: TaskType;
  priority: TaskPriority;
  period: TaskPeriod;
  tags: string[];
  status: TaskStatus;
  timeSpent: number; // in seconds
  createdAt: Timestamp;
  // userId: string; // Add this when auth is implemented
}

export interface Tag {
    id: string;
    name: string;
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
