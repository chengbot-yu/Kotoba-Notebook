/* ============================================================
   ことばノート — statistics (port of js/stats.js)
   ============================================================ */
import { addDays, todayKey, weekStartKey } from './util';
import { SRS } from './srs';
import type { StudyDay, Word } from './types';

export const dayTotal = (d: StudyDay) => (d.newWords || 0) + (d.reviewCount || 0);
export const isStudyDay = (d: StudyDay) => dayTotal(d) > 0;

export function dayMap(studyDays: StudyDay[]): Map<string, StudyDay> {
  return new Map((studyDays || []).map(d => [d.date, d]));
}

export function streakEndingAt(studyDays: StudyDay[], endKey: string): number {
  const map = dayMap(studyDays);
  let cursor = endKey;
  if (!map.has(cursor)) cursor = addDays(cursor, -1);
  let n = 0;
  while (map.has(cursor) && isStudyDay(map.get(cursor)!)) {
    n++;
    cursor = addDays(cursor, -1);
  }
  return n;
}

export function currentStreak(studyDays: StudyDay[], today?: string): number {
  return streakEndingAt(studyDays, today || todayKey());
}

export function longestStreak(studyDays: StudyDay[]): number {
  const map = dayMap(studyDays);
  const days = Array.from(map.keys()).filter(k => isStudyDay(map.get(k)!)).sort();
  let best = 0, run = 0, prev: string | null = null;
  for (const k of days) {
    if (prev && addDays(prev, 1) === k) run++;
    else run = 1;
    if (run > best) best = run;
    prev = k;
  }
  return best;
}

export function totalsBetween(studyDays: StudyDay[], fromKey: string, toKey: string) {
  let newWords = 0, reviewCount = 0;
  (studyDays || []).forEach(d => {
    if (d.date >= fromKey && d.date <= toKey) {
      newWords += d.newWords || 0;
      reviewCount += d.reviewCount || 0;
    }
  });
  return { newWords, reviewCount };
}

export function weekTotals(studyDays: StudyDay[], today?: string) {
  const ws = weekStartKey(today || todayKey());
  return { ...totalsBetween(studyDays, ws, addDays(ws, 6)), weekStart: ws };
}

export function monthTotals(studyDays: StudyDay[], today?: string) {
  const t = today || todayKey();
  const from = t.slice(0, 8) + '01';
  const lastDay = new Date(+t.slice(0, 4), +t.slice(5, 7), 0).getDate();
  const to = `${t.slice(0, 8)}${String(lastDay).padStart(2, '0')}`;
  return totalsBetween(studyDays, from, to);
}

export function levelOf(day: StudyDay): number {
  const t = dayTotal(day);
  if (t <= 0) return 0;
  if (t <= 5) return 1;
  if (t <= 10) return 2;
  if (t <= 20) return 3;
  return 4;
}

export interface CalCell { key: string | null; day?: number; level: number; newWords?: number; reviewCount?: number; }

export function calendarMonth(studyDays: StudyDay[], year: number, month: number): CalCell[] {
  const first = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const map = dayMap(studyDays);
  const cells: CalCell[] = [];
  for (let i = 0; i < lead; i++) cells.push({ key: null, level: 0 });
  for (let d = 1; d <= daysInMonth; d++) {
    const k = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const rec = map.get(k);
    cells.push({ key: k, day: d, level: rec ? levelOf(rec) : 0, newWords: rec?.newWords || 0, reviewCount: rec?.reviewCount || 0 });
  }
  return cells;
}

export function dueWords(words: Word[], today?: string): Word[] {
  const t = today || todayKey();
  return (words || []).filter(w => SRS.isDue(w, t));
}

export function wordStats(words: Word[]) {
  const total = words.length;
  const byStatus: Record<string, number> = { new: 0, learning: 0, shaky: 0, familiar: 0, mastered: 0 };
  words.forEach(w => { byStatus[w.mastery || 'new'] = (byStatus[w.mastery || 'new'] || 0) + 1; });
  const important = words.filter(w => w.important).length;
  const hard = words.filter(w => w.hard).length;
  return { total, byStatus, important, hard };
}
