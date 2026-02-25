import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

type TimerSnapshot = {
  status: "idle" | "running" | "paused";
  issueId: string | null;
  startedAt: number | null; // only set while running
  elapsedMs: number;
};

type StopResult = {
  issueId: string;
  elapsedMs: number;
} | null;

type LiveTimerContextType = {
  state: TimerSnapshot;
  start: (issueId: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => StopResult;
  getElapsedMs: () => number;
  clear: () => void;
};

const STORAGE_KEY = "jira_live_timer_state";

const defaultState: TimerSnapshot = {
  status: "idle",
  issueId: null,
  startedAt: null,
  elapsedMs: 0,
};

const LiveTimerContext = createContext<LiveTimerContextType | null>(null);

export function useLiveTimer() {
  const ctx = useContext(LiveTimerContext);
  if (!ctx) throw new Error("useLiveTimer must be used within LiveTimerProvider");
  return ctx;
}

export function LiveTimerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TimerSnapshot>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    try {
      const parsed = JSON.parse(raw) as TimerSnapshot;
      return {
        status:
          parsed.status === "running" || parsed.status === "paused"
            ? parsed.status
            : "idle",
        issueId: parsed.issueId || null,
        startedAt: parsed.startedAt || null,
        elapsedMs: Number(parsed.elapsedMs || 0),
      };
    } catch {
      return defaultState;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const getElapsedMs = () => {
    if (state.status !== "running" || !state.startedAt) return state.elapsedMs;
    return state.elapsedMs + Math.max(0, Date.now() - state.startedAt);
  };

  const start = (issueId: string) => {
    setState({
      status: "running",
      issueId,
      startedAt: Date.now(),
      elapsedMs: 0,
    });
  };

  const pause = () => {
    if (state.status !== "running") return;
    setState((prev) => ({
      ...prev,
      status: "paused",
      startedAt: null,
      elapsedMs: getElapsedMs(),
    }));
  };

  const resume = () => {
    if (state.status !== "paused" || !state.issueId) return;
    setState((prev) => ({
      ...prev,
      status: "running",
      startedAt: Date.now(),
    }));
  };

  const stop = (): StopResult => {
    if (state.status === "idle" || !state.issueId) return null;
    const elapsed = getElapsedMs();
    const issueId = state.issueId;
    setState(defaultState);
    return { issueId, elapsedMs: elapsed };
  };

  const clear = () => setState(defaultState);

  const value = useMemo(
    () => ({
      state,
      start,
      pause,
      resume,
      stop,
      getElapsedMs,
      clear,
    }),
    [state],
  );

  return <LiveTimerContext.Provider value={value}>{children}</LiveTimerContext.Provider>;
}
