"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTimers } from "@/context/TimerContext";
import { formatTime } from "@/lib/utils";
import type { Task, TimerMode } from "@/types";
import { DEFAULT_POMODORO_SETTINGS } from "@/types";
import { Play, Pause, RotateCcw, Timer, Hourglass, BrainCircuit } from "lucide-react";
import { useState } from "react";
import { Progress } from "@/components/ui/progress";

type TimerControlsProps = {
  task: Task;
};

const pomodoroStateText: Record<'work' | 'shortBreak' | 'longBreak', string> = {
    work: "Work",
    shortBreak: "Short Break",
    longBreak: "Long Break",
};

export function TimerControls({ task }: TimerControlsProps) {
  const { startTimer, pauseTimer, resetTimer, getTimerState } = useTimers();
  const [localMode, setLocalMode] = useState<TimerMode>("stopwatch");
  
  const timerState = getTimerState(task.id);

  const time = timerState?.time ?? task.timeSpent;
  const isRunning = timerState?.isRunning ?? false;
  const currentMode = timerState?.mode ?? localMode;
  const pomodoroState = timerState?.pomodoroState;
  const pomodoroSettings = timerState?.pomodoroSettings ?? task.pomodoroSettings ?? DEFAULT_POMODORO_SETTINGS;
  const currentCycle = timerState?.currentCycle;
  const initialDuration = timerState?.initialDuration ?? 0;

  const handleModeChange = (newMode: TimerMode) => {
    if (isRunning) pauseTimer(task.id);
    setLocalMode(newMode);
  };
  
  const handleStart = () => {
    startTimer(task, localMode, 25); // Default 25 min timer for "timer" mode
  };
  
  let progress = 0;
  if (timerState && (currentMode === 'timer' || currentMode === 'pomodoro') && initialDuration > 0) {
    progress = 100 - (time / initialDuration) * 100;
  }

  return (
    <div className="p-4 bg-muted/50 rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
            <Select value={currentMode} onValueChange={handleModeChange} disabled={isRunning}>
              <SelectTrigger className="w-[150px] bg-background">
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stopwatch"><div className="flex items-center gap-2"><Hourglass className="h-4 w-4" />Stopwatch</div></SelectItem>
                <SelectItem value="timer"><div className="flex items-center gap-2"><Timer className="h-4 w-4" />Timer</div></SelectItem>
                <SelectItem value="pomodoro"><div className="flex items-center gap-2"><BrainCircuit className="h-4 w-4" />Pomodoro</div></SelectItem>
              </SelectContent>
            </Select>
        </div>
        <div className="text-3xl font-mono font-semibold text-foreground">
          {formatTime(Math.round(time))}
        </div>
      </div>

      {(currentMode === 'timer' || currentMode === 'pomodoro') && <Progress value={progress} className="h-2" />}

      {currentMode === 'pomodoro' && pomodoroState && (
        <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>{pomodoroStateText[pomodoroState]}</span>
            {pomodoroState === 'work' && <span>Cycle {currentCycle} / {pomodoroSettings.cycles}</span>}
        </div>
      )}


      <div className="flex items-center justify-center gap-2">
        {isRunning ? (
          <Button size="icon" variant="secondary" onClick={() => pauseTimer(task.id)}>
            <Pause className="h-5 w-5" />
          </Button>
        ) : (
          <Button size="icon" variant="secondary" onClick={handleStart}>
            <Play className="h-5 w-5" />
          </Button>
        )}
        <Button size="icon" variant="ghost" onClick={() => resetTimer(task.id)}>
          <RotateCcw className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
