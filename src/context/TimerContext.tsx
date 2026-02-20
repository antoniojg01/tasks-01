"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { formatTime } from '@/lib/utils';
import type { Task, TimerMode, PomodoroSettings } from '@/types';
import { DEFAULT_POMODORO_SETTINGS } from '@/types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface TimerState {
  time: number;
  isRunning: boolean;
  mode: TimerMode;
  pomodoroState: 'work' | 'shortBreak' | 'longBreak';
  currentCycle: number;
  pomodoroSettings: PomodoroSettings;
  startTime: number | null;
}

interface TimerContextType {
  timers: Map<string, TimerState>;
  startTimer: (task: Task, mode: TimerMode, duration?: number) => void;
  pauseTimer: (taskId: string) => void;
  resetTimer: (taskId: string) => void;
  getTimerState: (taskId: string) => TimerState | undefined;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export const TimerProvider = ({ children }: { children: ReactNode }) => {
  const [timers, setTimers] = useState<Map<string, TimerState>>(new Map());
  const [activeTimerInTitle, setActiveTimerInTitle] = useState<string | null>(null);
  const { toast } = useToast();

  const updateTimeSpentInDb = useCallback((taskId: string, timeToAdd: number) => {
    const taskRef = doc(db, 'tasks', taskId);
    const currentTimer = timers.get(taskId);
    if (!currentTimer) return;
    
    const newTimeSpent = Math.max(0, (timers.get(taskId)?.time || 0) + timeToAdd);

    const updates = { timeSpent: newTimeSpent };
    updateDoc(taskRef, updates)
      .catch((error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: taskRef.path,
            operation: 'update',
            requestResourceData: updates,
        }));
      });
  }, [timers]);

  const pauseTimer = useCallback((taskId: string) => {
    const timer = timers.get(taskId);
    if (timer && timer.isRunning) {
      const elapsed = timer.startTime ? Math.floor((Date.now() - timer.startTime) / 1000) : 0;
      const newTime = timer.mode === 'timer' ? timer.time - elapsed : timer.time + elapsed;

      setTimers(prev => {
        const newTimers = new Map(prev);
        newTimers.set(taskId, { ...timer, time: Math.max(0, newTime), isRunning: false, startTime: null });
        return newTimers;
      });

      if (activeTimerInTitle === taskId) {
        document.title = 'TaskFlow';
        setActiveTimerInTitle(null);
      }
      
      const taskRef = doc(db, 'tasks', taskId);
      const updates = { status: 'pending' as const };
      updateDoc(taskRef, updates).catch(error => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: taskRef.path,
            operation: 'update',
            requestResourceData: updates
        }));
      });
    }
  }, [timers, activeTimerInTitle]);

  const handlePomodoroTransition = useCallback((taskId: string) => {
    setTimers(prev => {
        const newTimers = new Map(prev);
        const timer = newTimers.get(taskId);
        if (!timer || timer.mode !== 'pomodoro') return prev;

        let nextState: 'work' | 'shortBreak' | 'longBreak' = timer.pomodoroState;
        let nextTime = timer.time;
        let nextCycle = timer.currentCycle;
        let notificationTitle = '';
        let notificationMessage = '';

        if (timer.pomodoroState === 'work') {
            if (timer.currentCycle % timer.pomodoroSettings.cycles === 0) {
                nextState = 'longBreak';
                nextTime = timer.pomodoroSettings.longBreakDuration * 60;
                notificationTitle = "Long Break Time!";
                notificationMessage = `Time for a ${timer.pomodoroSettings.longBreakDuration}-minute break.`;
            } else {
                nextState = 'shortBreak';
                nextTime = timer.pomodoroSettings.shortBreakDuration * 60;
                notificationTitle = "Short Break Time!";
                notificationMessage = `Time for a ${timer.pomodoroSettings.shortBreakDuration}-minute break.`;
            }
        } else { // shortBreak or longBreak
            nextState = 'work';
            nextTime = timer.pomodoroSettings.workDuration * 60;
            nextCycle = timer.pomodoroState === 'work' ? timer.currentCycle + 1 : timer.currentCycle;
             if(timer.pomodoroState !== 'work') nextCycle++;
            notificationTitle = "Back to Work!";
            notificationMessage = `Starting a new ${timer.pomodoroSettings.workDuration}-minute work session.`;
        }

        toast({ title: notificationTitle, description: notificationMessage });
        newTimers.set(taskId, {
            ...timer,
            pomodoroState: nextState,
            time: nextTime,
            currentCycle: nextCycle,
            startTime: Date.now(),
        });
        return newTimers;
    });
  }, [toast]);


  useEffect(() => {
    const interval = setInterval(() => {
      let titleSet = false;
      setTimers(prev => {
        const newTimers = new Map(prev);
        let activeTimerId: string | null = null;
        
        newTimers.forEach((timer, taskId) => {
          if (timer.isRunning) {
            activeTimerId = taskId;
            const elapsed = timer.startTime ? Math.floor((Date.now() - timer.startTime) / 1000) : 0;
            
            if (timer.mode === 'timer') {
              const newTime = timer.time - elapsed;
              if (newTime <= 0) {
                if (timer.mode === 'pomodoro') {
                    handlePomodoroTransition(taskId);
                } else {
                    newTimers.set(taskId, { ...timer, time: 0, isRunning: false, startTime: null });
                    toast({ title: "Timer Finished!", description: `The timer for your task has ended.` });
                    if (activeTimerInTitle === taskId) {
                      document.title = 'TaskFlow';
                    }
                }
              } else {
                 newTimers.set(taskId, { ...timer, time: newTime });
              }
            } else { // stopwatch
              const newTime = timer.time + elapsed;
              newTimers.set(taskId, { ...timer, time: newTime });
            }

            if(activeTimerInTitle === taskId) {
              const currentTimer = newTimers.get(activeTimerInTitle);
              if (currentTimer) {
                document.title = `${formatTime(Math.round(currentTimer.time))} - TaskFlow`;
                titleSet = true;
              }
            }
          }
        });

        return newTimers;
      });
      if (!titleSet && document.title !== 'TaskFlow') {
        document.title = 'TaskFlow';
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimerInTitle, toast, handlePomodoroTransition]);


  const startTimer = (task: Task, mode: TimerMode, duration: number = 0) => {
    pauseTimer(activeTimerInTitle || "");
    
    setTimers(prev => {
      const newTimers = new Map(prev);
      const existingTimer = prev.get(task.id);

      let time = existingTimer?.time ?? 0;
      if (mode === 'timer' && time === 0) time = duration * 60;
      if (mode === 'pomodoro' && time === 0) time = DEFAULT_POMODORO_SETTINGS.workDuration * 60;
      if (mode === 'stopwatch' && existingTimer?.mode !== 'stopwatch') time = task.timeSpent;

      newTimers.set(task.id, {
        time,
        isRunning: true,
        mode,
        pomodoroState: 'work',
        currentCycle: 1,
        pomodoroSettings: DEFAULT_POMODORO_SETTINGS,
        startTime: Date.now(),
      });
      return newTimers;
    });
    
    setActiveTimerInTitle(task.id);
    const taskRef = doc(db, 'tasks', task.id);
    const updates = { status: 'in-progress' as const };
    updateDoc(taskRef, updates).catch(error => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: taskRef.path,
        operation: 'update',
        requestResourceData: updates
      }));
    });
  };

  const resetTimer = async (taskId: string) => {
    const timer = timers.get(taskId);
    if (!timer) return;

    if (timer.mode === 'stopwatch') {
      updateTimeSpentInDb(taskId, timer.time - (timers.get(taskId)?.time || 0));
    }
    
    setTimers(prev => {
      const newTimers = new Map(prev);
      const existing = newTimers.get(taskId);
      if(existing) {
        newTimers.set(taskId, { ...existing, time: 0, isRunning: false, startTime: null });
      }
      return newTimers;
    });

    if (activeTimerInTitle === taskId) {
      document.title = 'TaskFlow';
      setActiveTimerInTitle(null);
    }
  };

  const getTimerState = (taskId: string) => {
    return timers.get(taskId);
  };

  return (
    <TimerContext.Provider value={{ timers, startTimer, pauseTimer, resetTimer, getTimerState }}>
      {children}
    </TimerContext.Provider>
  );
};

export const useTimers = (): TimerContextType => {
  const context = useContext(TimerContext);
  if (context === undefined) {
    throw new Error('useTimers must be used within a TimerProvider');
  }
  return context;
};
