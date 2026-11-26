export const uid = () =>
  Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

/** Yerel saate göre YYYY-MM-DD */
export function ymd(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function parseYmd(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: string, n: number): string {
  const d = parseYmd(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseYmd(b).getTime() - parseYmd(a).getTime()) / 86_400_000);
}

export const DAY_NAMES = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
export const DAY_SHORT = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

export function dayLabel(s: string): string {
  const today = ymd();
  if (s === today) return "Bugün";
  if (s === addDays(today, 1)) return "Yarın";
  const d = parseYmd(s);
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()}.${d.getMonth() + 1}`;
}

export function addMinutes(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const t = h * 60 + m + mins;
  const hh = Math.floor(t / 60) % 24;
  return `${String(hh).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

export function fmtMinutes(min: number): string {
  if (min < 60) return `${min} dk`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} sa ${m} dk` : `${h} sa`;
}

/** Bu haftanın Pazartesi'si */
export function weekStart(s: string = ymd()): string {
  const d = parseYmd(s);
  const diff = (d.getDay() + 6) % 7;
  return addDays(s, -diff);
}

export const SUBJECT_COLORS = [
  "#4f46e5", "#0891b2", "#059669", "#d97706", "#dc2626",
  "#7c3aed", "#db2777", "#2563eb", "#65a30d", "#ea580c",
];
