"use client";

import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Task, Tag } from '@/types';
import { useToast } from './use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

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
    }, async (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'tasks',
        operation: 'list',
      }));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);
  
  useEffect(() => {
    const q = query(collection(db, 'tags'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tagsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tag));
      setTags(tagsData);
    }, async (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'tags',
        operation: 'list',
      }));
    });
    return () => unsubscribe();
  }, []);


  const addTask = (task: Omit<Task, 'id' | 'createdAt' | 'timeSpent' | 'status'>) => {
    const taskData = {
      ...task,
      status: 'pending' as const,
      timeSpent: 0,
      createdAt: serverTimestamp(),
    };
    addDoc(collection(db, 'tasks'), taskData)
      .then(() => {
        toast({ title: "Success", description: "Task created successfully." });
      })
      .catch(error => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: 'tasks',
              operation: 'create',
              requestResourceData: taskData
          }));
      });
  };

  const updateTask = (taskId: string, updates: Partial<Task>) => {
    const taskRef = doc(db, 'tasks', taskId);
    updateDoc(taskRef, updates)
      .then(() => {
          toast({ title: "Success", description: "Task updated." });
      })
      .catch(error => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: taskRef.path,
              operation: 'update',
              requestResourceData: updates
          }));
      });
  };

  const deleteTask = (taskId: string) => {
    const taskRef = doc(db, 'tasks', taskId);
    deleteDoc(taskRef)
      .then(() => {
          toast({ title: "Success", description: "Task deleted." });
      })
      .catch(error => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: taskRef.path,
              operation: 'delete'
          }));
      });
  };
  
  const addTag = (tagName: string) => {
    if (tags.some(tag => tag.name.toLowerCase() === tagName.toLowerCase())) {
        toast({ title: "Info", description: "Tag already exists." });
        return;
    }
    const tagData = { name: tagName };
    addDoc(collection(db, 'tags'), tagData)
      .then(() => {
          toast({ title: "Success", description: `Tag "${tagName}" created.` });
      })
      .catch(error => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: 'tags',
              operation: 'create',
              requestResourceData: tagData
          }));
      });
  };

  return { tasks, tags, loading, addTask, updateTask, deleteTask, addTag };
}
