"use client";

import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Task, Tag } from '@/types';
import { useToast } from './use-toast';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
      setTasks(tasksData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching tasks:", error);
      toast({ title: "Error", description: "Could not fetch tasks from the cloud.", variant: "destructive" });
      setLoading(false);
    });
    return () => unsubscribe();
  }, [toast]);
  
  useEffect(() => {
    const q = query(collection(db, 'tags'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tagsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tag));
      setTags(tagsData);
    }, (error) => {
      console.error("Error fetching tags:", error);
      toast({ title: "Error", description: "Could not fetch tags from the cloud.", variant: "destructive" });
    });
    return () => unsubscribe();
  }, [toast]);


  const addTask = async (task: Omit<Task, 'id' | 'createdAt' | 'timeSpent' | 'status'>) => {
    try {
      await addDoc(collection(db, 'tasks'), {
        ...task,
        status: 'pending',
        timeSpent: 0,
        createdAt: serverTimestamp(),
      });
      toast({ title: "Success", description: "Task created successfully." });
    } catch (error) {
      console.error("Error adding task:", error);
      toast({ title: "Error", description: "Could not create the task.", variant: "destructive" });
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      await updateDoc(doc(db, 'tasks', taskId), updates);
      toast({ title: "Success", description: "Task updated." });
    } catch (error) {
      console.error("Error updating task:", error);
      toast({ title: "Error", description: "Could not update the task.", variant: "destructive" });
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
      toast({ title: "Success", description: "Task deleted." });
    } catch (error) {
      console.error("Error deleting task:", error);
      toast({ title: "Error", description: "Could not delete the task.", variant: "destructive" });
    }
  };
  
  const addTag = async (tagName: string) => {
    if (tags.some(tag => tag.name.toLowerCase() === tagName.toLowerCase())) {
        toast({ title: "Info", description: "Tag already exists." });
        return;
    }
    try {
      await addDoc(collection(db, 'tags'), { name: tagName });
      toast({ title: "Success", description: `Tag "${tagName}" created.` });
    } catch (error) {
      console.error("Error adding tag:", error);
      toast({ title: "Error", description: "Could not create the tag.", variant: "destructive" });
    }
  };

  return { tasks, tags, loading, addTask, updateTask, deleteTask, addTag };
}
