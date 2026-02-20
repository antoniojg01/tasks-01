"use client";

import { useTasks } from "@/hooks/use-tasks";
import { Header } from "@/components/layout/Header";
import { TaskCard } from "@/components/tasks/TaskCard";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Task } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatsView } from "./StatsView";
import { Activity, Tag as TagIcon, GripVertical } from "lucide-react";
import { useMemo } from "react";

export function Dashboard() {
  const { tasks, tags, periods, loading } = useTasks();

  const activeTasks = useMemo(() => tasks.filter(t => t.status !== 'completed' && t.status !== 'abandoned'), [tasks]);
  const completedTasks = useMemo(() => tasks.filter(t => t.status === 'completed' || t.status === 'abandoned'), [tasks]);

  const habits = useMemo(() => activeTasks.filter((task) => task.type === "habit"), [activeTasks]);
  const regularTasks = useMemo(() => activeTasks.filter((task) => task.type === "task"), [activeTasks]);

  const tasksByTag = useMemo(() => {
    const grouped: { [tagName: string]: Task[] } = {};
    const untagged: Task[] = [];

    regularTasks.forEach((task) => {
      if (task.tags.length === 0) {
        untagged.push(task);
      } else {
        task.tags.forEach((tagId) => {
          const tagName = tags.find(t => t.id === tagId)?.name || tagId;
          if (!grouped[tagName]) {
            grouped[tagName] = [];
          }
          grouped[tagName].push(task);
        });
      }
    });

    return { grouped, untagged };
  }, [regularTasks, tags]);
  
  const allTagNames = useMemo(() => {
    const tagNames = new Set(Object.keys(tasksByTag.grouped));
    tags.forEach(t => tagNames.add(t.name));
    return Array.from(tagNames).sort();
  }, [tasksByTag.grouped, tags]);


  const renderTaskList = (taskList: Task[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {taskList.map((task) => (
        <TaskCard key={task.id} task={task} allTags={tags} allPeriods={periods} />
      ))}
    </div>
  );

  const renderSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => (
        <Skeleton key={i} className="h-48 rounded-lg" />
      ))}
    </div>
  );

  return (
    <>
      <Header />
      <Tabs defaultValue="active">
        <TabsList className="mb-4">
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>
        <TabsContent value="active">
          {loading ? (
            <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                {renderSkeleton()}
            </div>
          ) : (
            <Accordion type="multiple" defaultValue={['habits']} className="w-full space-y-1">
              <AccordionItem value="habits">
                <AccordionTrigger className="text-base font-semibold">
                  <div className="flex items-center gap-3">
                    <Activity className="w-5 h-5 text-primary" />
                    Habits
                    <Badge variant="secondary">{habits.length}</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4">
                  {habits.length > 0 ? renderTaskList(habits) : <p className="text-muted-foreground text-center p-4">No active habits.</p>}
                </AccordionContent>
              </AccordionItem>

              {allTagNames.map((tagName) => (
                <AccordionItem key={tagName} value={tagName}>
                   <AccordionTrigger className="text-base font-semibold">
                    <div className="flex items-center gap-3">
                      <TagIcon className="w-5 h-5 text-primary"/>
                       {tagName}
                       <Badge variant="secondary">{(tasksByTag.grouped[tagName] || []).length}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                    {renderTaskList(tasksByTag.grouped[tagName] || [])}
                  </AccordionContent>
                </AccordionItem>
              ))}
              
              {tasksByTag.untagged.length > 0 && (
                <AccordionItem value="untagged">
                  <AccordionTrigger className="text-base font-semibold">
                    <div className="flex items-center gap-3">
                    <GripVertical className="w-5 h-5 text-primary"/>
                    Untagged Tasks
                    <Badge variant="secondary">{tasksByTag.untagged.length}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                    {renderTaskList(tasksByTag.untagged)}
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          )}
        </TabsContent>
        <TabsContent value="stats">
            <StatsView allTasks={tasks} />
        </TabsContent>
      </Tabs>
    </>
  );
}
