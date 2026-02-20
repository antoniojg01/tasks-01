'use client';

import { useEffect, useState } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export function FirebaseErrorListener() {
  const [error, setError] = useState<FirestorePermissionError | null>(null);

  useEffect(() => {
    const handler = (e: FirestorePermissionError) => {
      setError(e);
    };
    errorEmitter.on('permission-error', handler);

    return () => {
      errorEmitter.off('permission-error', handler);
    }
  }, []);

  if (error) {
    // In development, this will be caught by the Next.js error overlay.
    // In production, this will be caught by the nearest Error Boundary.
    throw error;
  }

  return null;
}
