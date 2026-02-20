"use client";

import { Button } from "@/components/ui/button";
import { PlusCircle, Save, LogOut } from "lucide-react";
import { TaskForm } from "@/components/tasks/TaskForm";
import { useState } from "react";
import { useTimers } from "@/context/TimerContext";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useUser } from "@/firebase";
import { signOut } from "firebase/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


export function Header() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { timers, pauseTimer } = useTimers();
  const { toast } = useToast();
  const auth = useAuth();
  const { user } = useUser();

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

  const handleSignOut = () => {
    signOut(auth);
    toast({
      title: "Signed Out",
      description: "You have been successfully signed out.",
    });
  }

  const getInitials = (email: string | null | undefined) => {
    if (!email) return 'U';
    return email.substring(0, 2).toUpperCase();
  }


  return (
    <>
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-primary font-headline">TaskFlow</h1>
        <div className="flex items-center gap-4">
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
          <DropdownMenu>
            <DropdownMenuTrigger>
               <Avatar>
                <AvatarImage src={user?.photoURL || undefined} />
                <AvatarFallback>{getInitials(user?.email)}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <p className="font-medium">My Account</p>
                <p className="text-xs text-muted-foreground font-normal">{user?.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <TaskForm open={isFormOpen} onOpenChange={setIsFormOpen} />
    </>
  );
}
