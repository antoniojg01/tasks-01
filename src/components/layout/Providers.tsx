"use client";

import { TimerProvider } from "@/context/TimerContext";
import type { ReactNode } from "react";
import { FirebaseErrorListener } from "@/components/FirebaseErrorListener";
import { EnsureAuthenticated } from "@/components/auth/EnsureAuthenticated";
import { FirebaseClientProvider } from "@/firebase/client-provider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <FirebaseClientProvider>
      <TimerProvider>
        <EnsureAuthenticated>
          {children}
          <FirebaseErrorListener />
        </EnsureAuthenticated>
      </TimerProvider>
    </FirebaseClientProvider>
  );
}
