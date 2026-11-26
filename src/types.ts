export type Level = "ilkokul" | "ortaokul" | "lise" | "universite" | "sinav";
export type Difficulty = "agir" | "hafif";
export type Priority = "yuksek" | "orta" | "dusuk";

export interface Profile {
  name: string;
  level: Level;
  goal: string;
}

export interface Subject {
  id: string;
  name: string;
  color: string;
  difficulty: Difficulty;
  /** 1 = düşük, 3 = yüksek */
  priority: 1 | 2 | 3;
  examDate?: string; // YYYY-MM-DD
}

export interface PlanSettings {
  /** Haftanın her günü için dakika (0 = Pazar ... 6 = Cumartesi) */
  minutesByDay: number[];
  startTime: string; // "HH:MM"
  blockMin: number;
  breakMin: number;
}

export interface PlanBlock {
  id: string;
  date: string; // YYYY-MM-DD
  start: string; // HH:MM
  minutes: number;
  kind: "calisma" | "tekrar";
  subjectId: string | null;
  done: boolean;
  hard?: boolean; // "zorlandım" işareti
}

export interface Task {
  id: string;
  title: string;
  subjectId?: string;
  priority: Priority;
  due?: string;
  done: boolean;
  createdAt: number;
  doneAt?: number;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  subjectId?: string;
  updatedAt: number;
}

export interface Card {
  id: string;
  q: string;
  a: string;
  subjectId?: string;
  box: number; // Leitner kutusu 0..5
  due: string; // YYYY-MM-DD
  right: number;
  wrong: number;
}

export interface FocusSession {
  id: string;
  date: string;
  minutes: number;
  subjectId?: string;
  at: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AppState {
  version: 1;
  profile: Profile;
  subjects: Subject[];
  planSettings: PlanSettings;
  plan: PlanBlock[];
  tasks: Task[];
  notes: Note[];
  cards: Card[];
  focus: FocusSession[];
  chat: ChatMessage[];
}
