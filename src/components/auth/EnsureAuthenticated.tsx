'use client';

import { useUser } from '@/firebase';
import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Header } from '../layout/Header';
import { AuthForm } from './AuthForm';

export function EnsureAuthenticated({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();

  if (isUserLoading) {
    return (
        <div className="container mx-auto p-4 md:p-8 space-y-8">
            <div className="flex items-center justify-between mb-8">
              <Skeleton className="h-10 w-48" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-36" />
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
            <div className='space-y-4'>
                <Skeleton className="h-12 w-full rounded-lg" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-48 rounded-lg" />
                    ))}
                </div>
            </div>
        </div>
    );
  }

  if (!user) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
          <AuthForm />
        </div>
    );
  }

  return <>{children}</>;
}
