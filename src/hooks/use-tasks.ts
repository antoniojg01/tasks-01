"use client";

import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy, setDoc } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { Task, Tag, Period } from '@/types';
import { useToast } from './use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setTasks([]);
      setTags([]);
      setPeriods([]);
      return;
    };

    setLoading(true);
    const q = query(collection(db, 'users', user.uid, 'tasks'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Task));
      setTasks(tasksData);
      setLoading(false);
    }, (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: `users/${user.uid}/tasks`,
        operation: 'list',
      }));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [db, user]);

  useEffect(() => {
    if (!user) {
        setTags([]);
        return;
    }
    const q = query(collection(db, 'users', user.uid, 'tags'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tagsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Tag));
      setTags(tagsData);
    }, (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: `users/${user.uid}/tags`,
        operation: 'list',
      }));
    });
    return () => unsubscribe();
  }, [db, user]);

  useEffect(() => {
    if (!user) {
        setPeriods([]);
        return;
    }
    const q = query(collection(db, 'users', user.uid, 'periods'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const periodsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Period));
      if (snapshot.empty) {
        const newId = doc(collection(db, 'users', user.uid, 'periods')).id;
        const defaultPeriod = { id: newId, name: 'Anytime', userId: user.uid, createdAt: serverTimestamp() };
        const periodRef = doc(db, 'users', user.uid, 'periods', newId);
        setDoc(periodRef, defaultPeriod).catch(error => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: periodRef.path,
            operation: 'create',
            requestResourceData: defaultPeriod
          }));
        });
      }
      setPeriods(periodsData);
    }, (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: `users/${user.uid}/periods`,
        operation: 'list',
      }));
    });
    return () => unsubscribe();
  }, [db, user]);


  const addTask = useCallback((task: Omit<Task, 'id' | 'createdAt' | 'timeSpent' | 'status' | 'userId' | 'pomodoroSettings'>) => {
    if (!user) {
        toast({ variant: 'destructive', title: "Error", description: "You must be logged in to add a task." });
        return;
    }
    const newId = doc(collection(db, 'users', user.uid, 'tasks')).id;
    const taskData = {
      ...task,
      id: newId,
      userId: user.uid,
      status: 'pending' as const,
      timeSpent: 0,
      createdAt: serverTimestamp(),
    };
    const taskRef = doc(db, 'users', user.uid, 'tasks', newId);

    setDoc(taskRef, taskData)
      .then(() => {
        toast({ title: "Success", description: "Task created successfully." });
      })
      .catch(error => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: taskRef.path,
              operation: 'create',
              requestResourceData: taskData
          }));
      });
  }, [db, user, toast]);

  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    if (!user) return;
    const taskRef = doc(db, 'users', user.uid, 'tasks', taskId);
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
  }, [db, user, toast]);

  const deleteTask = useCallback((taskId: string) => {
    if (!user) return;
    const taskRef = doc(db, 'users', user.uid, 'tasks', taskId);
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
  }, [db, user, toast]);

  const addTag = useCallback((tagName: string) => {
    if (!user) {
        toast({ variant: 'destructive', title: "Error", description: "You must be logged in to add a tag." });
        return;
    }
    if (tags.some(tag => tag.name.toLowerCase() === tagName.toLowerCase())) {
        toast({ title: "Info", description: "Tag already exists." });
        return;
    }
    const newId = doc(collection(db, 'users', user.uid, 'tags')).id;
    const tagData = { id: newId, name: tagName, userId: user.uid, createdAt: serverTimestamp() };
    const tagRef = doc(db, 'users', user.uid, 'tags', newId);

    setDoc(tagRef, tagData)
      .then(() => {
          toast({ title: "Success", description: `Tag "${tagName}" created.` });
      })
      .catch(error => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: tagRef.path,
              operation: 'create',
              requestResourceData: tagData
          }));
      });
  }, [db, user, tags, toast]);

  const addPeriod = useCallback((periodName: string) => {
    if (!user) {
        toast({ variant: 'destructive', title: "Error", description: "You must be logged in to add a period." });
        return;
    }
    if (periods.some(p => p.name.toLowerCase() === periodName.toLowerCase())) {
        toast({ title: "Info", description: "Period already exists." });
        return;
    }
    const newId = doc(collection(db, 'users', user.uid, 'periods')).id;
    const periodData = { id: newId, name: periodName, userId: user.uid, createdAt: serverTimestamp() };
    const periodRef = doc(db, 'users', user.uid, 'periods', newId);

    setDoc(periodRef, periodData)
      .then(() => {
          toast({ title: "Success", description: `Period "${periodName}" created.` });
      })
      .catch(error => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: periodRef.path,
              operation: 'create',
              requestResourceData: periodData
          }));
      });
  }, [db, user, periods, toast]);

  return { tasks, tags, periods, loading, addTask, updateTask, deleteTask, addTag, addPeriod };
}
