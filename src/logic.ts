import type { AppState, Card, Priority, Subject } from "./types";
import { addDays, daysBetween, weekStart, ymd } from "./utils";

// ---------- Tekrar (Leitner) ----------
export const BOX_INTERVALS = [1, 2, 4, 7, 15, 30];
export const MASTERED_BOX = 4;

export function reviewCard(card: Card, knew: boolean, today = ymd()): Card {
  if (knew) {
    const box = Math.min(card.box + 1, BOX_INTERVALS.length - 1);
    return { ...card, box, right: card.right + 1, due: addDays(today, BOX_INTERVALS[box]) };
  }
  return { ...card, box: 0, wrong: card.wrong + 1, due: today };
}

export const dueCards = (cards: Card[], today = ymd()) => cards.filter((c) => c.due <= today);

/** "S: ... / C: ..." biçimindeki metni kartlara çevirir. */
export function parseCards(text: string): { q: string; a: string }[] {
  const out: { q: string; a: string }[] = [];
  let q: string | null = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/^[\s>*\-\d.)]+/, "").replace(/\*\*/g, "").trim();
    const qm = line.match(/^(S|Soru|Q)\s*[:：]\s*(.+)$/i);
    const am = line.match(/^(C|Cevap|A)\s*[:：]\s*(.+)$/i);
    if (qm) q = qm[2].trim();
    else if (am && q) {
      out.push({ q, a: am[2].trim() });
      q = null;
    }
  }
  return out;
}

// ---------- Öncelik ----------
export const PRIORITY_ORDER: Record<Priority, number> = { yuksek: 0, orta: 1, dusuk: 2 };
export const PRIORITY_LABEL: Record<Priority, string> = { yuksek: "Yüksek", orta: "Orta", dusuk: "Düşük" };

// ---------- İstatistik ----------
export function weekStats(s: AppState, today = ymd()) {
  const ws = weekStart(today);
  const we = addDays(ws, 6);
  const inWeek = (d: string) => d >= ws && d <= we;
  const weekBlocks = s.plan.filter((b) => inWeek(b.date));
  const focusByDay = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(ws, i);
    return { date: d, minutes: s.focus.filter((f) => f.date === d).reduce((a, f) => a + f.minutes, 0) };
  });
  const studiedFromPlan = weekBlocks.filter((b) => b.done).reduce((a, b) => a + b.minutes, 0);
  return {
    weekStart: ws,
    blocksTotal: weekBlocks.length,
    blocksDone: weekBlocks.filter((b) => b.done).length,
    focusByDay,
    focusMinutes: focusByDay.reduce((a, d) => a + d.minutes, 0),
    studiedFromPlan,
    tasksDone: s.tasks.filter((t) => t.done && t.doneAt && inWeek(ymd(new Date(t.doneAt)))).length,
    mastered: s.cards.filter((c) => c.box >= MASTERED_BOX).length,
  };
}

export function streak(s: AppState, today = ymd()): number {
  const active = new Set<string>([
    ...s.focus.map((f) => f.date),
    ...s.plan.filter((b) => b.done).map((b) => b.date),
  ]);
  let n = 0;
  let d = active.has(today) ? today : addDays(today, -1);
  while (active.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

/** Zorlanılan dersler: yanlış kart oranı + "zorlandım" işaretli bloklar. */
export function weakAreas(s: AppState): { subject: Subject; score: number; reason: string }[] {
  return s.subjects
    .map((subject) => {
      const cards = s.cards.filter((c) => c.subjectId === subject.id);
      const wrong = cards.reduce((a, c) => a + c.wrong, 0);
      const right = cards.reduce((a, c) => a + c.right, 0);
      const hard = s.plan.filter((b) => b.subjectId === subject.id && b.hard).length;
      const ratio = wrong + right > 0 ? wrong / (wrong + right) : 0;
      const score = ratio * 10 + hard * 2;
      const parts: string[] = [];
      if (wrong) parts.push(`${wrong} yanlış kart`);
      if (hard) parts.push(`${hard} zor blok`);
      return { subject, score, reason: parts.join(", ") };
    })
    .filter((w) => w.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

export interface NextStep {
  text: string;
  page: PageId;
}

export type PageId = "bugun" | "plan" | "gorevler" | "notlar" | "tekrar" | "odak" | "asistan" | "ayarlar";

export function nextStep(s: AppState, today = ymd()): NextStep {
  if (s.subjects.length === 0) return { text: "Derslerini ekle, sana haftalık plan çıkarayım.", page: "plan" };
  const due = dueCards(s.cards, today).length;
  const overdue = s.tasks.filter((t) => !t.done && t.due && t.due < today);
  if (overdue.length) return { text: `Gecikmiş görev: “${overdue[0].title}”. Önce bunu bitir.`, page: "gorevler" };
  const nextBlock = s.plan
    .filter((b) => b.date === today && !b.done)
    .sort((a, b) => a.start.localeCompare(b.start))[0];
  if (nextBlock) {
    const name =
      nextBlock.kind === "tekrar"
        ? "Tekrar bloğu"
        : (s.subjects.find((x) => x.id === nextBlock.subjectId)?.name ?? "Çalışma");
    return { text: `${nextBlock.start} — ${name} (${nextBlock.minutes} dk). Odak sayacını başlat.`, page: "odak" };
  }
  if (due) return { text: `${due} kartın tekrar zamanı geldi. 10 dakikada bitir.`, page: "tekrar" };
  const urgent = s.tasks
    .filter((t) => !t.done)
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])[0];
  if (urgent) return { text: `Sıradaki görev: “${urgent.title}”.`, page: "gorevler" };
  if (!s.plan.some((b) => b.date >= today)) return { text: "Bu hafta için planın yok. 1 dakikada oluştur.", page: "plan" };
  return { text: "Bugünkü işlerin bitti. Kısa bir not özeti çıkar ya da dinlen. 👏", page: "notlar" };
}

export function upcomingExams(s: AppState, today = ymd()) {
  return s.subjects
    .filter((x) => x.examDate && x.examDate >= today)
    .map((x) => ({ subject: x, days: daysBetween(today, x.examDate!) }))
    .sort((a, b) => a.days - b.days);
}

const LEVEL_LABEL = {
  ilkokul: "İlkokul",
  ortaokul: "Ortaokul",
  lise: "Lise",
  universite: "Üniversite",
  sinav: "Sınav hazırlığı (LGS/YKS vb.)",
} as const;
export { LEVEL_LABEL };

/** Asistana gönderilen kısa öğrenci bağlamı. */
export function buildContext(s: AppState, today = ymd()): string {
  const sub = (id: string | null | undefined) => s.subjects.find((x) => x.id === id)?.name ?? "Genel";
  const lines: string[] = [];
  lines.push(`Tarih: ${today}`);
  lines.push(`Seviye: ${LEVEL_LABEL[s.profile.level]}`);
  if (s.profile.name) lines.push(`Ad: ${s.profile.name}`);
  if (s.profile.goal) lines.push(`Hedef: ${s.profile.goal}`);
  if (s.subjects.length)
    lines.push(
      `Dersler: ${s.subjects
        .map((x) => `${x.name} (${x.difficulty === "agir" ? "ağır" : "hafif"}${x.examDate ? `, sınav ${x.examDate}` : ""})`)
        .join("; ")}`,
    );
  const todayBlocks = s.plan.filter((b) => b.date === today).sort((a, b) => a.start.localeCompare(b.start));
  if (todayBlocks.length)
    lines.push(
      `Bugünkü plan: ${todayBlocks
        .map((b) => `${b.start} ${b.kind === "tekrar" ? "Tekrar" : sub(b.subjectId)}${b.done ? " ✓" : ""}`)
        .join(", ")}`,
    );
  const open = s.tasks.filter((t) => !t.done).sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  if (open.length)
    lines.push(`Açık görevler: ${open.slice(0, 6).map((t) => `${t.title} [${PRIORITY_LABEL[t.priority]}${t.due ? `, ${t.due}` : ""}]`).join("; ")}`);
  const weak = weakAreas(s);
  if (weak.length) lines.push(`Zorlandığı alanlar: ${weak.map((w) => `${w.subject.name} (${w.reason})`).join("; ")}`);
  const st = weekStats(s, today);
  lines.push(`Bu hafta: ${st.blocksDone}/${st.blocksTotal} blok, ${st.focusMinutes} dk odak, ${st.tasksDone} görev bitti`);
  return lines.join("\n");
}
