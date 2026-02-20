"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTasks } from "@/hooks/use-tasks";
import type { Task } from "@/types";
import { DEFAULT_POMODORO_SETTINGS } from "@/types";
import { useEffect } from "react";
import { X, Tag as TagIcon, PlusCircle, BrainCircuit, ChevronDown } from "lucide-react";
import { Badge } from "../ui/badge";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  type: z.enum(["task", "habit"]),
  priority: z.enum(["low", "medium", "high"]),
  periodId: z.string().min(1, "Period is required."),
  tags: z.array(z.string()).optional(),
  pomodoroSettings: z.object({
    workDuration: z.coerce.number().min(1, "Must be at least 1 minute."),
    shortBreakDuration: z.coerce.number().min(1, "Must be at least 1 minute."),
    longBreakDuration: z.coerce.number().min(1, "Must be at least 1 minute."),
    cycles: z.coerce.number().min(1, "Must be at least 1 cycle."),
  }).optional(),
});

type TaskFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task;
};

export function TaskForm({ open, onOpenChange, task }: TaskFormProps) {
  const { addTask, updateTask, tags: allTags, addTag, periods: allPeriods, addPeriod } = useTasks();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "task",
      priority: "medium",
      periodId: "",
      tags: [],
      pomodoroSettings: DEFAULT_POMODORO_SETTINGS,
    },
  });

  useEffect(() => {
    if (task) {
      form.reset({
        name: task.name,
        type: task.type,
        priority: task.priority,
        periodId: task.periodId,
        tags: task.tags || [],
        pomodoroSettings: task.pomodoroSettings || DEFAULT_POMODORO_SETTINGS,
      });
    } else {
      const defaultPeriod = allPeriods.find(p => p.name === 'Anytime') || allPeriods[0];
      form.reset({
        name: "",
        type: "task",
        priority: "medium",
        periodId: defaultPeriod?.id || "",
        tags: [],
        pomodoroSettings: DEFAULT_POMODORO_SETTINGS,
      });
    }
  }, [task, open, form, allPeriods]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (task) {
      updateTask(task.id, values);
    } else {
      addTask(values);
    }
    onOpenChange(false);
  };
  
  const handleAddTag = (tagId: string) => {
    const currentTags = form.getValues('tags') || [];
    if (!currentTags.includes(tagId)) {
        form.setValue('tags', [...currentTags, tagId]);
    }
  }
  
  const handleRemoveTag = (tagId: string) => {
    const currentTags = form.getValues('tags') || [];
    form.setValue('tags', currentTags.filter(t => t !== tagId));
  }
  
  const handleCreateTag = () => {
      const newTagName = prompt("Enter new tag name:");
      if(newTagName) {
          addTag(newTagName);
      }
  }

  const handleCreatePeriod = () => {
    const newPeriodName = prompt("Enter new period name:");
    if(newPeriodName) {
        addPeriod(newPeriodName);
    }
  }

  const selectedTags = form.watch('tags') || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{task ? "Edit Task" : "Create Task"}</DialogTitle>
          <DialogDescription>
            {task ? "Make changes to your task." : "Add a new task to your list."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Finish report" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex space-x-4"
                  >
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <RadioGroupItem value="task" id="task" />
                      </FormControl>
                      <FormLabel htmlFor="task">Task</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <RadioGroupItem value="habit" id="habit" />
                      </FormControl>
                      <FormLabel htmlFor="habit">Habit</FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="periodId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {allPeriods.map(period => (
                            <SelectItem key={period.id} value={period.id}>{period.name}</SelectItem>
                        ))}
                        <Button variant="ghost" className="w-full justify-start mt-1" type="button" onClick={handleCreatePeriod}>
                            <PlusCircle className="h-4 w-4 mr-2" />
                            Create new period
                        </Button>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="tags"
              render={() => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {selectedTags.map(tagId => {
                        const tag = allTags.find(t => t.id === tagId);
                        return tag ? (
                            <Badge key={tag.id} variant="secondary" className="flex items-center gap-1">
                                {tag.name}
                                <button type="button" onClick={() => handleRemoveTag(tag.id)} className="rounded-full hover:bg-muted-foreground/20">
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        ) : null;
                    })}
                  </div>
                  <Select onValueChange={handleAddTag}>
                    <SelectTrigger>
                        <SelectValue placeholder="Add tags..." />
                    </SelectTrigger>
                    <SelectContent>
                        {allTags.filter(t => !selectedTags.includes(t.id)).map(tag => (
                            <SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>
                        ))}
                        <Button variant="ghost" className="w-full justify-start mt-1" type="button" onClick={handleCreateTag}>
                            <TagIcon className="h-4 w-4 mr-2" />
                            Create new tag
                        </Button>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <Collapsible className="space-y-2 pt-2">
              <CollapsibleTrigger className="flex justify-between items-center w-full p-2 -mx-2 rounded-md hover:bg-accent">
                <div className="flex items-center gap-2">
                    <BrainCircuit className="h-5 w-5 text-primary" />
                    <FormLabel className="cursor-pointer">Pomodoro Settings</FormLabel>
                </div>
                <ChevronDown className="h-4 w-4 transition-transform [&[data-state=open]]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="pomodoroSettings.workDuration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Work (min)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pomodoroSettings.shortBreakDuration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Short Break (min)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="pomodoroSettings.longBreakDuration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Long Break (min)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pomodoroSettings.cycles"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cycles</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            <DialogFooter>
              <Button type="submit">{task ? "Save Changes" : "Create Task"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
