/* ============================================================
   ことばノート — shared utilities (port of js/util.js)
   Weekday display is ALWAYS: 月 火 水 木 金 土 日
   ============================================================ */

export const WEEK = ['日', '月', '火', '水', '木', '金', '土']; // index = getDay()
export const WEEK_MON = ['月', '火', '水', '木', '金', '土', '日']; // Monday-first

const pad = (n: number) => String(n).padStart(2, '0');

export type DateKey = string; // YYYY-MM-DD

export function key(d: Date = new Date()): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export const todayKey = (): DateKey => key();
export function parseKey(k: DateKey): Date {
  const [y, m, d] = String(k).split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(k: DateKey, n: number): DateKey {
  const d = parseKey(k);
  d.setDate(d.getDate() + n);
  return key(d);
}
export const weekdayKanji = (k: DateKey) => WEEK[parseKey(k).getDay()];
export const weekdayKanjiOf = (d: Date) => WEEK[d.getDay()];
export const weekdayKanjiFromIndex = (i: number) => WEEK[i];

export function weekStartKey(k: DateKey): DateKey {
  const d = parseKey(k);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return key(d);
}
export function dateInWeek(k: DateKey, weekStartK: DateKey): boolean {
  return k >= weekStartK && k <= addDays(weekStartK, 6);
}

export function formatDateJP(k: DateKey): string {
  const d = parseKey(k);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}
export function formatDateShort(k: DateKey): string {
  const d = parseKey(k);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function timeLabel(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
}

export const fmt = (n: number) => Number(n || 0).toLocaleString('en-US');

export function periodOf(date: Date = new Date()): 'morning' | 'night' | 'day' {
  const h = date.getHours();
  if (h >= 5 && h < 11) return 'morning';
  if (h >= 22 || h < 5) return 'night';
  return 'day';
}
