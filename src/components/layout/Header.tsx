"use client";

import { Button } from "@/components/ui/button";
import { PlusCircle, Save } from "lucide-react";
import { TaskForm } from "@/components/tasks/TaskForm";
import { useState } from "react";
import { useTimers } from "@/context/TimerContext";
import { useToast } from "@/hooks/use-toast";

export function Header() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { timers, pauseTimer } = useTimers();
  const { toast } = useToast();

  const handleSaveAll = () => {
    let timersPaused = 0;
    timers.forEach((timer, taskId) => {
      if (timer.isRunning) {
        pauseTimer(taskId);
        timersPaused++;
      }
    });

    if (timersPaused > 0) {
      toast({
        title: "Progress Saved",
        description: `Your active timer progress has been saved to Firebase.`,
      });
    } else {
      toast({
        title: "Already Synced",
        description: "All your data is already saved in Firebase.",
      });
    }
  };


  return (
    <>
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-primary font-headline">TaskFlow</h1>
        <div className="flex items-center gap-2">
          <Button onClick={handleSaveAll} variant="outline">
            <Save className="mr-2 h-5 w-5" />
            Save Progress
          </Button>
          <Button onClick={() => setIsFormOpen(true)}>
            <PlusCircle className="mr-2 h-5 w-5" />
            New Task
          </Button>
        </div>
      </header>
      <TaskForm open={isFormOpen} onOpenChange={setIsFormOpen} />
    </>
  );
}
