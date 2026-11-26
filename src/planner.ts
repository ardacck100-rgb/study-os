import type { PlanBlock, PlanSettings, Subject } from "./types";
import { addDays, addMinutes, daysBetween, parseYmd, uid } from "./utils";

const REVIEW_MIN = 20;
const LONG_BREAK_EVERY = 3;
const LONG_BREAK_MIN = 20;

/** Dersin haftalık ağırlığı: öncelik + sınav yakınlığı + zorluk. */
export function subjectWeight(s: Subject, from: string): number {
  let w = s.priority * 2;
  if (s.difficulty === "agir") w += 1;
  if (s.examDate) {
    const d = daysBetween(from, s.examDate);
    if (d >= 0 && d <= 3) w += 6;
    else if (d >= 0 && d <= 7) w += 4;
    else if (d >= 0 && d <= 14) w += 2;
  }
  return w;
}

interface DaySlots {
  date: string;
  blocks: number;
  review: boolean;
}

function slotsForDay(date: string, settings: PlanSettings): DaySlots {
  const avail = settings.minutesByDay[parseYmd(date).getDay()] ?? 0;
  const review = avail >= 60;
  let left = avail - (review ? REVIEW_MIN : 0);
  let blocks = 0;
  while (left >= settings.blockMin) {
    blocks++;
    left -= settings.blockMin + settings.breakMin;
  }
  return { date, blocks, review };
}

/**
 * Haftalık plan üretir:
 * - Blokları ders ağırlıklarına göre paylaştırır.
 * - Aynı gün içinde ağır/hafif dersleri sırayla dağıtır, aynı dersi arka arkaya koymaz.
 * - Bir derse günde en fazla 2 blok verir.
 * - Her 3 blokta bir uzun mola, gün sonunda tekrar bloğu ekler.
 * - Sınav tarihi geçmiş dersleri dışarıda bırakır.
 */
export function generatePlan(subjects: Subject[], settings: PlanSettings, from: string, days = 7): PlanBlock[] {
  const active = subjects.filter((s) => !s.examDate || daysBetween(from, s.examDate) >= 0);
  if (active.length === 0) return [];

  const daySlots = Array.from({ length: days }, (_, i) => slotsForDay(addDays(from, i), settings));
  const totalBlocks = daySlots.reduce((a, d) => a + d.blocks, 0);

  // Ağırlığa göre kota (en büyük kalan yöntemi)
  const weights = active.map((s) => subjectWeight(s, from));
  const wSum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (w / wSum) * totalBlocks);
  const quota = raw.map(Math.floor);
  let rest = totalBlocks - quota.reduce((a, b) => a + b, 0);
  raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac)
    .forEach(({ i }) => {
      if (rest > 0) {
        quota[i]++;
        rest--;
      }
    });

  const out: PlanBlock[] = [];
  for (const day of daySlots) {
    if (day.blocks === 0) continue;
    let t = settings.startTime;
    let prev: Subject | null = null;
    const usedToday = new Map<string, number>();

    // Sınavı bu günden önce bitmiş dersler o gün planlanmaz
    const valid = active.map((s, i) => ({ s, i })).filter(({ s }) => !s.examDate || s.examDate >= day.date);
    if (!valid.length) continue;

    for (let b = 0; b < day.blocks; b++) {
      const fresh = (x: { s: Subject }) => (usedToday.get(x.s.id) ?? 0) < 2 && x.s.id !== prev?.id;
      // Önce kotası olanlar; yoksa (ör. sınavı geçen dersin kotası boşa kaldıysa) geçerli herhangi bir ders
      const pool = [
        valid.filter((x) => quota[x.i] > 0 && fresh(x)),
        valid.filter(fresh),
        valid.filter((x) => quota[x.i] > 0),
        valid,
      ].find((l) => l.length)!;

      pool.sort((a, b) => {
        const altA = prev && a.s.difficulty !== prev.difficulty ? 1 : 0;
        const altB = prev && b.s.difficulty !== prev.difficulty ? 1 : 0;
        if (altA !== altB) return altB - altA; // ağır/hafif dönüşümlü
        if (quota[b.i] !== quota[a.i]) return quota[b.i] - quota[a.i];
        return weights[b.i] - weights[a.i];
      });
      // Günün ilk bloğu: zihin taze, ağır dersle başla
      const pick = b === 0 ? (pool.find((p) => p.s.difficulty === "agir") ?? pool[0]) : pool[0];

      if (quota[pick.i] > 0) quota[pick.i]--;
      usedToday.set(pick.s.id, (usedToday.get(pick.s.id) ?? 0) + 1);
      out.push({
        id: uid(),
        date: day.date,
        start: t,
        minutes: settings.blockMin,
        kind: "calisma",
        subjectId: pick.s.id,
        done: false,
      });
      const longBreak = (b + 1) % LONG_BREAK_EVERY === 0;
      t = addMinutes(t, settings.blockMin + (longBreak ? Math.max(LONG_BREAK_MIN, settings.breakMin) : settings.breakMin));
      prev = pick.s;
    }

    if (day.review) {
      out.push({
        id: uid(),
        date: day.date,
        start: t,
        minutes: REVIEW_MIN,
        kind: "tekrar",
        subjectId: null,
        done: false,
      });
    }
  }
  return out;
}
