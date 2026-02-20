"use client";

import { TimerProvider } from "@/context/TimerContext";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return <TimerProvider>{children}</TimerProvider>;
}
