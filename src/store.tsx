import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { AppState } from "./types";

const KEY = "study-os:v1";

export const initialState = (): AppState => ({
  version: 1,
  profile: { name: "", level: "lise", goal: "" },
  subjects: [],
  planSettings: {
    minutesByDay: [120, 120, 120, 120, 120, 90, 150],
    startTime: "17:00",
    blockMin: 40,
    breakMin: 10,
  },
  plan: [],
  tasks: [],
  notes: [],
  cards: [],
  focus: [],
  chat: [],
});

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return { ...initialState(), ...parsed, version: 1 };
  } catch {
    return initialState();
  }
}

type Mutator = (draft: AppState) => void;

interface Store {
  state: AppState;
  /** Durumun kopyası üzerinde değişiklik yap; otomatik kaydedilir. */
  mutate: (fn: Mutator) => void;
  replace: (s: AppState) => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(load);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* depolama kapalıysa uygulama yine çalışır */
    }
  }, [state]);

  const mutate = useCallback((fn: Mutator) => {
    setState((prev) => {
      const draft = structuredClone(prev);
      fn(draft);
      return draft;
    });
  }, []);

  const replace = useCallback((s: AppState) => setState(s), []);

  return <Ctx.Provider value={{ state, mutate, replace }}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("StoreProvider eksik");
  return s;
}
