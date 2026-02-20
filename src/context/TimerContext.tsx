"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { formatTime } from '@/lib/utils';
import type { Task, TimerMode, PomodoroSettings } from '@/types';
import { DEFAULT_POMODORO_SETTINGS } from '@/types';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
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
  initialTimeSpent: number;
  initialDuration: number;
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
  
  const timersRef = useRef(timers);
  useEffect(() => {
    timersRef.current = timers;
  }, [timers]);

  const pauseTimer = useCallback((taskId: string, isUnloading = false) => {
    if (!user) return;
    const timer = timersRef.current.get(taskId);
    if (timer && timer.isRunning) {
      const elapsed = timer.startTime ? Math.floor((Date.now() - timer.startTime) / 1000) : 0;
      
      let newTimeForDisplay: number;
      let newTotalTimeSpent: number | null = null;

      if (timer.mode === 'stopwatch') {
          newTotalTimeSpent = timer.initialTimeSpent + elapsed;
          newTimeForDisplay = newTotalTimeSpent;
      } else if (timer.mode === 'pomodoro' && timer.pomodoroState === 'work') {
          newTotalTimeSpent = timer.initialTimeSpent + elapsed;
          newTimeForDisplay = timer.time - elapsed;
      } else {
          newTimeForDisplay = timer.time - elapsed;
      }

      setTimers(prev => {
        const newTimers = new Map(prev);
        const timerToUpdate = newTimers.get(taskId);
        if (timerToUpdate) {
            newTimers.set(taskId, { ...timerToUpdate, time: Math.max(0, newTimeForDisplay), isRunning: false, startTime: null });
        }
        return newTimers;
      });

      if (activeTimerInTitle === taskId) {
        document.title = 'TaskFlow';
        setActiveTimerInTitle(null);
      }
      
      const taskRef = doc(db, 'users', user.uid, 'tasks', taskId);
      const updates: Partial<Task> = { status: 'pending', updatedAt: serverTimestamp() };
      if (newTotalTimeSpent !== null) {
          updates.timeSpent = newTotalTimeSpent;
      }

      const updatePromise = updateDoc(taskRef, updates);

      if (!isUnloading) {
        updatePromise.catch(error => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: taskRef.path,
              operation: 'update',
              requestResourceData: updates
          }));
        });
      }
    }
  }, [db, user, activeTimerInTitle]);

  const handlePomodoroTransition = useCallback((taskId: string) => {
    if (!user) return;
    setTimers(prev => {
        const newTimers = new Map(prev);
        const timer = newTimers.get(taskId);
        if (!timer || timer.mode !== 'pomodoro') return prev;

        let newTotalTimeSpent = timer.initialTimeSpent;
        if (timer.pomodoroState === 'work') {
            const workDurationInSeconds = timer.pomodoroSettings.workDuration * 60;
            newTotalTimeSpent = timer.initialTimeSpent + workDurationInSeconds;

            const taskRef = doc(db, 'users', user.uid, 'tasks', taskId);
            const updates = { timeSpent: newTotalTimeSpent, updatedAt: serverTimestamp() };
            updateDoc(taskRef, updates).catch(error => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: taskRef.path,
                    operation: 'update',
                    requestResourceData: updates,
                }));
            });
        }

        let nextState: 'work' | 'shortBreak' | 'longBreak' = timer.pomodoroState;
        let nextTime = timer.time;
        let nextCycle = timer.currentCycle;
        let initialDuration = timer.initialDuration;
        let notificationTitle = '';
        let notificationMessage = '';

        if (timer.pomodoroState === 'work') {
            nextCycle = timer.currentCycle + 1;
            if ((timer.currentCycle > 0) && (timer.currentCycle % timer.pomodoroSettings.cycles) === 0) {
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
        } else {
            nextState = 'work';
            nextTime = timer.pomodoroSettings.workDuration * 60;
            notificationTitle = "Back to Work!";
            notificationMessage = `Starting a new ${timer.pomodoroSettings.workDuration}-minute work session.`;
        }
        initialDuration = nextTime;

        toast({ title: notificationTitle, description: notificationMessage });
        newTimers.set(taskId, {
            ...timer,
            pomodoroState: nextState,
            time: nextTime,
            initialDuration: initialDuration,
            currentCycle: nextCycle,
            startTime: Date.now(),
            initialTimeSpent: newTotalTimeSpent,
        });
        return newTimers;
    });
  }, [toast, db, user]);


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
              }
            }

            const displayTime = timer.startTime ? (timer.mode === 'timer' || timer.mode === 'pomodoro' ? timer.time - Math.floor((Date.now() - timer.startTime) / 1000) : timer.initialTimeSpent + Math.floor((Date.now() - timer.startTime) / 1000)) : timer.time;


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

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        timersRef.current.forEach((timer, taskId) => {
          if (timer.isRunning) {
            pauseTimer(taskId, true);
          }
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pauseTimer]);


  const startTimer = (task: Task, mode: TimerMode, duration: number = 0) => {
    if (!user) return;
    
    timersRef.current.forEach((timer, timerId) => {
        if (timer.isRunning && timerId !== task.id) {
            pauseTimer(timerId);
        }
    });
    
    setTimers(prev => {
      const newTimers = new Map(prev);
      const existingTimer = prev.get(task.id);

      const baseTime = existingTimer?.time ?? task.timeSpent;
      const initialTimeSpent = existingTimer?.initialTimeSpent ?? task.timeSpent;
      const pomodoroState = existingTimer?.pomodoroState ?? 'work';
      const currentCycle = existingTimer?.currentCycle ?? 1;

      let time = baseTime;
      let initialDuration = existingTimer?.initialDuration || 0;

      if (mode !== existingTimer?.mode) {
          if(mode === 'timer') {
              time = duration * 60;
              initialDuration = duration * 60;
          }
          if(mode === 'pomodoro') {
              time = (task.pomodoroSettings?.workDuration || DEFAULT_POMODORO_SETTINGS.workDuration) * 60;
              initialDuration = time;
          }
          if(mode === 'stopwatch') {
              time = task.timeSpent;
              initialDuration = 0;
          }
      }
      
      newTimers.set(task.id, {
        time,
        isRunning: true,
        mode,
        pomodoroState,
        currentCycle,
        pomodoroSettings: task.pomodoroSettings || DEFAULT_POMODORO_SETTINGS,
        startTime: Date.now(),
        initialTimeSpent,
        initialDuration
      });
      return newTimers;
    });
    
    setActiveTimerInTitle(task.id);
    const taskRef = doc(db, 'users', user.uid, 'tasks', task.id);
    const updates = { status: 'in-progress' as const, updatedAt: serverTimestamp() };
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
            : timer.initialTimeSpent + elapsed;
        return { ...timer, time: displayTime };
    }
    return timer;
  };

  const resetTimer = (taskId: string) => {
    if (!user) return;
    const timer = timers.get(taskId);
    if (!timer) return;

    let timeToSetForDisplay = 0;
    let initialTimeSpentToSet = timer.initialTimeSpent;
    let initialDurationToSet = 0;
    
    if (timer.mode === 'stopwatch') {
      const taskRef = doc(db, 'users', user.uid, 'tasks', taskId);
      updateDoc(taskRef, { timeSpent: 0, updatedAt: serverTimestamp() }).catch(error => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: taskRef.path,
          operation: 'update',
          requestResourceData: { timeSpent: 0, updatedAt: 'ServerValue.TIMESTAMP' }
        }));
      });
      timeToSetForDisplay = 0;
      initialTimeSpentToSet = 0;
    } else if (timer.mode === 'pomodoro') {
       timeToSetForDisplay = timer.pomodoroSettings.workDuration * 60;
       initialDurationToSet = timeToSetForDisplay;
    } else if (timer.mode === 'timer') {
        timeToSetForDisplay = timer.initialDuration;
    }
    
    setTimers(prev => {
      const newTimers = new Map(prev);
      const existing = newTimers.get(taskId);
      if(existing) {
        newTimers.set(taskId, { 
            ...existing, 
            time: timeToSetForDisplay, 
            isRunning: false, 
            startTime: null,
            pomodoroState: 'work',
            currentCycle: 1,
            initialTimeSpent: initialTimeSpentToSet,
            initialDuration: initialDurationToSet,
        });
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
