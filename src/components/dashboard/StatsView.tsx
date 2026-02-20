"use client";

import { useMemo } from 'react';
import type { Task } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Clock, Star } from 'lucide-react';
import { formatTime } from '@/lib/utils';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

type StatsViewProps = {
  allTasks: Task[];
};

export function StatsView({ allTasks }: StatsViewProps) {
  const stats = useMemo(() => {
    const completed = allTasks.filter(t => t.status === 'completed').length;
    const abandoned = allTasks.filter(t => t.status === 'abandoned').length;
    const totalTime = allTasks.reduce((acc, task) => acc + task.timeSpent, 0);

    const tasksByFreq = allTasks
        .filter(t => t.status === 'completed')
        .reduce((acc, task) => {
            acc[task.name] = (acc[task.name] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

    const mostFrequentTasks = Object.entries(tasksByFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

    return { completed, abandoned, totalTime, mostFrequentTasks };
  }, [allTasks]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abandoned Tasks</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.abandoned}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Time Tracked</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(stats.totalTime)}</div>
            <p className="text-xs text-muted-foreground">in hours: {(stats.totalTime / 3600).toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

       <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500"/>
             Most Frequently Completed Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.mostFrequentTasks.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.mostFrequentTasks} layout="vertical">
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={150}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                />
                <Tooltip
                    cursor={{fill: 'hsl(var(--muted))'}}
                    contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        borderColor: 'hsl(var(--border))'
                    }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-center">No completed tasks yet.</p>
          )}
        </CardContent>
       </Card>
    </div>
  );
}
