"use client";

import { TimerProvider } from "@/context/TimerContext";
import type { ReactNode } from "react";
import { FirebaseErrorListener } from "@/components/FirebaseErrorListener";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <TimerProvider>
      {children}
      <FirebaseErrorListener />
    </TimerProvider>
  );
}
