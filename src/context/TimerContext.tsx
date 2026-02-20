"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { formatTime } from '@/lib/utils';
import type { Task, TimerMode, PomodoroSettings } from '@/types';
import { DEFAULT_POMODORO_SETTINGS } from '@/types';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
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
  const db = useFirestore();
  const { user } = useUser();

  const updateTimeSpentInDb = useCallback((taskId: string, timeToAdd: number) => {
    if (!user) return;
    const taskRef = doc(db, 'users', user.uid, 'tasks', taskId);
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
  }, [db, user, timers]);

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
      
      if (user) {
        const taskRef = doc(db, 'users', user.uid, 'tasks', taskId);
        const updates = { status: 'pending' as const };
        updateDoc(taskRef, updates).catch(error => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: taskRef.path,
              operation: 'update',
              requestResourceData: updates
          }));
        });
      }
    }
  }, [db, user, timers, activeTimerInTitle]);

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
            nextCycle = timer.currentCycle + 1;
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
        
        newTimers.forEach((timer, taskId) => {
          if (timer.isRunning) {
            const elapsed = timer.startTime ? Math.floor((Date.now() - timer.startTime) / 1000) : 0;
            let newTime: number;

            if (timer.mode === 'timer' || timer.mode === 'pomodoro') {
              newTime = (timer.time || 0) - elapsed;
              if(newTime <= 0) {
                 if (timer.mode === 'pomodoro') {
                    handlePomodoroTransition(taskId);
                } else {
                    newTimers.set(taskId, { ...timer, time: 0, isRunning: false, startTime: null });
                    toast({ title: "Timer Finished!", description: `The timer for your task has ended.` });
                    if (activeTimerInTitle === taskId) {
                      document.title = 'TaskFlow';
                      setActiveTimerInTitle(null);
                    }
                }
              } else {
                // No state update needed here, time is only for display
              }
            } else { // stopwatch
              newTime = (timer.time || 0) + elapsed;
            }

            const displayTime = timer.startTime ? (timer.mode === 'timer' || timer.mode === 'pomodoro' ? timer.time - Math.floor((Date.now() - timer.startTime) / 1000) : timer.time + Math.floor((Date.now() - timer.startTime) / 1000)) : timer.time;


            if (activeTimerInTitle === taskId) {
              document.title = `${formatTime(Math.round(Math.max(0, displayTime)))} - TaskFlow`;
              titleSet = true;
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
    if (!user) return;
    
    // Pause any other running timer
    timers.forEach((timer, timerId) => {
        if (timer.isRunning && timerId !== task.id) {
            pauseTimer(timerId);
        }
    });
    
    setTimers(prev => {
      const newTimers = new Map(prev);
      const existingTimer = prev.get(task.id);

      let time = existingTimer?.time ?? task.timeSpent;
      let pomodoroState: 'work' | 'shortBreak' | 'longBreak' = 'work';
      let currentCycle = 1;

      if (mode !== existingTimer?.mode) {
          if(mode === 'timer') time = duration * 60;
          if(mode === 'pomodoro') time = (task.pomodoroSettings?.workDuration || DEFAULT_POMODORO_SETTINGS.workDuration) * 60;
          if(mode === 'stopwatch') time = task.timeSpent;
      } else if (existingTimer) {
          pomodoroState = existingTimer.pomodoroState;
          currentCycle = existingTimer.currentCycle;
      }

      newTimers.set(task.id, {
        time: time,
        isRunning: true,
        mode,
        pomodoroState,
        currentCycle,
        pomodoroSettings: task.pomodoroSettings || DEFAULT_POMODORO_SETTINGS,
        startTime: Date.now(),
      });
      return newTimers;
    });
    
    setActiveTimerInTitle(task.id);
    const taskRef = doc(db, 'users', user.uid, 'tasks', task.id);
    const updates = { status: 'in-progress' as const };
    updateDoc(taskRef, updates).catch(error => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: taskRef.path,
        operation: 'update',
        requestResourceData: updates
      }));
    });
  };
  
  const getTimerState = (taskId: string) => {
    const timer = timers.get(taskId);
    if (!timer) return undefined;

    if (timer.isRunning && timer.startTime) {
        const elapsed = Math.floor((Date.now() - timer.startTime) / 1000);
        const displayTime = (timer.mode === 'timer' || timer.mode === 'pomodoro')
            ? Math.max(0, timer.time - elapsed)
            : timer.time + elapsed;
        return { ...timer, time: displayTime };
    }
    return timer;
  };

  const resetTimer = async (taskId: string) => {
    if (!user) return;
    const timer = timers.get(taskId);
    if (!timer) return;

    let timeToSet = 0;
    if(timer.mode === 'stopwatch' && timer.isRunning){
        const elapsed = timer.startTime ? Math.floor((Date.now() - timer.startTime) / 1000) : 0;
        updateTimeSpentInDb(taskId, elapsed);
    } else if (timer.mode === 'stopwatch' && !timer.isRunning) {
        updateTimeSpentInDb(taskId, -timer.time);
    }
    
    setTimers(prev => {
      const newTimers = new Map(prev);
      const existing = newTimers.get(taskId);
      if(existing) {
        newTimers.set(taskId, { ...existing, time: timeToSet, isRunning: false, startTime: null });
      }
      return newTimers;
    });

    if (activeTimerInTitle === taskId) {
      document.title = 'TaskFlow';
      setActiveTimerInTitle(null);
    }
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
