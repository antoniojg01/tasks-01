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
import { Play, Pause, RotateCcw, Timer, Hourglass, BrainCircuit } from "lucide-react";
import { useEffect, useState } from "react";

type TimerControlsProps = {
  task: Task;
};

export function TimerControls({ task }: TimerControlsProps) {
  const { startTimer, pauseTimer, resetTimer, getTimerState } = useTimers();
  const [localMode, setLocalMode] = useState<TimerMode>("stopwatch");
  
  const timerState = getTimerState(task.id);

  const time = timerState?.time ?? task.timeSpent;
  const isRunning = timerState?.isRunning ?? false;
  const currentMode = timerState?.mode ?? localMode;

  const handleModeChange = (newMode: TimerMode) => {
    if (isRunning) pauseTimer(task.id);
    setLocalMode(newMode);
  };
  
  const handleStart = () => {
    startTimer(task, localMode, 25); // Default 25 min timer
  };

  return (
    <div className="p-4 bg-muted/50 rounded-lg space-y-3">
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
        <div className="text-2xl font-mono font-semibold text-foreground">
          {formatTime(Math.round(time))}
        </div>
      </div>
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
