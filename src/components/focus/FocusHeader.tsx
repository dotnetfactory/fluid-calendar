"use client";

import { useFocusModeStore } from "@/store/focusMode";
import { FocusStatus } from "@/types/focus";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { differenceInMinutes, format } from "@/lib/date-utils";

export function FocusHeader() {
  const router = useRouter();
  const {
    getStatus,
    sessionStats,
    sessionStartTime,
    pauseFocusMode,
    resumeFocusMode,
    endFocusMode,
  } = useFocusModeStore();
  const status = getStatus();

  // Calculate session duration
  const sessionDuration = sessionStartTime
    ? differenceInMinutes(new Date(), sessionStartTime)
    : sessionStats.timeSpent;

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
      <div className="flex items-center space-x-4">
        <h1 className="text-2xl font-bold">Focus Mode</h1>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">
            {status === FocusStatus.ACTIVE && "Active"}
            {status === FocusStatus.PAUSED && "Paused"}
            {status === FocusStatus.COMPLETED && "Completed"}
          </span>
          <span className="text-sm text-muted-foreground">
            • {sessionDuration} minutes
          </span>
          <span className="text-sm text-muted-foreground">
            • {sessionStats.tasksCompleted} tasks completed
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {status === FocusStatus.ACTIVE ? (
          <Button variant="outline" size="sm" onClick={() => pauseFocusMode()}>
            Pause
          </Button>
        ) : status === FocusStatus.PAUSED ? (
          <Button variant="outline" size="sm" onClick={() => resumeFocusMode()}>
            Resume
          </Button>
        ) : null}

        <Button
          variant="destructive"
          size="sm"
          onClick={() => {
            endFocusMode();
            router.push("/");
          }}
        >
          End Focus Mode
        </Button>
      </div>
    </header>
  );
}
