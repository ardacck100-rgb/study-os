import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useStore } from "./store";
import { uid, ymd } from "./utils";

type Phase = "calisma" | "mola";

interface FocusTimer {
  phase: Phase;
  running: boolean;
  remaining: number; // saniye
  workMin: number;
  breakMin: number;
  subjectId?: string;
  completedToday: number;
  setWorkMin: (n: number) => void;
  setBreakMin: (n: number) => void;
  setSubjectId: (id?: string) => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
}

const Ctx = createContext<FocusTimer | null>(null);

function beep() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    [0, 0.25, 0.5].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.15, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.2);
    });
  } catch {
    /* ses desteklenmiyor */
  }
}

export function FocusProvider({ children }: { children: ReactNode }) {
  const { state, mutate } = useStore();
  const [workMin, setWorkMinState] = useState(25);
  const [breakMin, setBreakMinState] = useState(5);
  const [phase, setPhase] = useState<Phase>("calisma");
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(25 * 60);
  const [subjectId, setSubjectId] = useState<string | undefined>();
  const endAt = useRef<number | null>(null);

  const finishPhase = useCallback(() => {
    beep();
    if (phase === "calisma") {
      mutate((s) => {
        s.focus.push({ id: uid(), date: ymd(), minutes: workMin, subjectId, at: Date.now() });
      });
      setPhase("mola");
      setRemaining(breakMin * 60);
    } else {
      setPhase("calisma");
      setRemaining(workMin * 60);
    }
    setRunning(false);
    endAt.current = null;
  }, [phase, workMin, breakMin, subjectId, mutate]);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      if (endAt.current == null) return;
      const left = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) finishPhase();
    };
    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [running, finishPhase]);

  useEffect(() => {
    const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
    const ss = String(remaining % 60).padStart(2, "0");
    document.title = running ? `${mm}:${ss} · ${phase === "calisma" ? "Odak" : "Mola"} — Study-OS` : "Study-OS";
  }, [remaining, running, phase]);

  const value: FocusTimer = {
    phase,
    running,
    remaining,
    workMin,
    breakMin,
    subjectId,
    completedToday: state.focus.filter((f) => f.date === ymd()).length,
    setWorkMin: (n) => {
      setWorkMinState(n);
      if (!running && phase === "calisma") setRemaining(n * 60);
    },
    setBreakMin: (n) => {
      setBreakMinState(n);
      if (!running && phase === "mola") setRemaining(n * 60);
    },
    setSubjectId,
    start: () => {
      endAt.current = Date.now() + remaining * 1000;
      setRunning(true);
    },
    pause: () => {
      setRunning(false);
      endAt.current = null;
    },
    reset: () => {
      setRunning(false);
      endAt.current = null;
      setPhase("calisma");
      setRemaining(workMin * 60);
    },
    skip: () => {
      setRunning(false);
      endAt.current = null;
      if (phase === "calisma") {
        setPhase("mola");
        setRemaining(breakMin * 60);
      } else {
        setPhase("calisma");
        setRemaining(workMin * 60);
      }
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFocus(): FocusTimer {
  const c = useContext(Ctx);
  if (!c) throw new Error("FocusProvider eksik");
  return c;
}
