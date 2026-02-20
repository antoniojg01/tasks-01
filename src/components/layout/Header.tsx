"use client";

import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { TaskForm } from "@/components/tasks/TaskForm";
import { useState } from "react";

export function Header() {
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <>
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-primary font-headline">TaskFlow</h1>
        <Button onClick={() => setIsFormOpen(true)}>
          <PlusCircle className="mr-2 h-5 w-5" />
          New Task
        </Button>
      </header>
      <TaskForm open={isFormOpen} onOpenChange={setIsFormOpen} />
    </>
  );
}
