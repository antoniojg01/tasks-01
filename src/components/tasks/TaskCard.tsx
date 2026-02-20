"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Trash2, Edit, CheckCircle, XCircle } from "lucide-react";
import type { Task, Tag } from "@/types";
import { useTasks } from "@/hooks/use-tasks";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { TaskForm } from "./TaskForm";
import { TimerControls } from "./TimerControls";

type TaskCardProps = {
  task: Task;
  allTags: Tag[];
};

const priorityStyles = {
  high: "bg-red-500 text-white",
  medium: "bg-yellow-500 text-white",
  low: "bg-blue-500 text-white",
};

export function TaskCard({ task, allTags }: TaskCardProps) {
  const { updateTask, deleteTask } = useTasks();
  const [isEditing, setIsEditing] = useState(false);

  const handleStatusChange = (status: "completed" | "abandoned") => {
    updateTask(task.id, { status });
  };
  
  const taskTags = allTags.filter(t => task.tags.includes(t.id));

  return (
    <>
      <Card
        className={cn(
          "flex flex-col justify-between transition-all duration-300",
          task.status === "completed" && "bg-accent/30 border-accent",
          task.status === "in-progress" && "shadow-lg shadow-primary/20 border-primary"
        )}
      >
        <CardHeader className="flex-row items-start justify-between pb-2">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold">{task.name}</CardTitle>
            <CardDescription className="flex items-center gap-2 text-xs">
              <Badge variant="outline" className={cn(priorityStyles[task.priority])}>{task.priority}</Badge>
              <Badge variant="secondary">{task.period}</Badge>
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" />
                <span>Edit</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => deleteTask(task.id)} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="py-2">
          <TimerControls task={task} />
           <div className="flex flex-wrap gap-1 mt-3">
              {taskTags.map(tag => (
                  <Badge key={tag.id} variant="outline" className="text-xs">{tag.name}</Badge>
              ))}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2 pt-4">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleStatusChange("abandoned")}
            className="text-destructive hover:bg-destructive/10"
          >
            <XCircle className="mr-2 h-4 w-4" /> Abandon
          </Button>
          <Button
            size="sm"
            onClick={() => handleStatusChange("completed")}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <CheckCircle className="mr-2 h-4 w-4" /> Complete
          </Button>
        </CardFooter>
      </Card>
      {isEditing && (
        <TaskForm
          open={isEditing}
          onOpenChange={setIsEditing}
          task={task}
        />
      )}
    </>
  );
}
