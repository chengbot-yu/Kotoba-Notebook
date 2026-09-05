/* ============================================================
   ことばノート — SRS scheduling (port of js/srs.js)
   ============================================================ */
import { key, addDays } from './util';
import type { Word, ReviewResult, MasteryKey } from './types';

export const INTERVALS = [1, 3, 7, 14, 30, 60, 120];

export const MASTERY: Record<MasteryKey, { label: string; en: string }> = {
  new: { label: '未复习', en: 'new' },
  learning: { label: '学习中', en: 'learning' },
  shaky: { label: '容易忘记', en: 'shaky' },
  familiar: { label: '熟悉', en: 'familiar' },
  mastered: { label: '已掌握', en: 'mastered' },
};
export const MASTERY_ORDER: MasteryKey[] = ['new', 'learning', 'shaky', 'familiar', 'mastered'];

export function isDue(word: Word, today: string): boolean {
  return !word.nextReviewAt || word.nextReviewAt <= today;
}

export function priority(word: Word, today: string): number {
  let p = 0;
  if (word.important) p += 4;
  if (word.hard) p += 4;
  const last = word.lastReviewedAt ? key(new Date(word.lastReviewedAt)) : null;
  if (word.forgotCount > 0 && last && addDays(last, 3) >= today) p += 6;
  else if (word.forgotCount > 0) p += 3;
  if (!word.nextReviewAt) p += 2;
  return p;
}

export function masteryOf(w: Word): MasteryKey {
  if (!w.reviewCount) return 'new';
  if (w.forgotCount >= 3 && w.streak < 3) return 'shaky';
  if (w.streak >= 5) return 'mastered';
  if (w.streak >= 3 || w.reviewCount >= 6) return 'familiar';
  if (w.streak === 0) return 'shaky';
  return 'learning';
}

export function applyResult(word: Word, result: ReviewResult, when: Date = new Date()): Word {
  const today = key(when);
  const w: Word = {
    ...word,
    reviewCount: (word.reviewCount || 0) + 1,
    updatedAt: when.toISOString(),
    lastReviewedAt: when.toISOString(),
  };
  if (result === 'remembered') {
    w.streak = (word.streak || 0) + 1;
    w.rememberedCount = (word.rememberedCount || 0) + 1;
    const idx = Math.min(w.streak - 1, INTERVALS.length - 1);
    w.nextReviewAt = addDays(today, INTERVALS[idx]);
  } else {
    w.forgotCount = (word.forgotCount || 0) + 1;
    w.streak = 0;
    w.nextReviewAt = today;
  }
  w.mastery = masteryOf(w);
  return w;
}

export function requeueInSession(queue: string[], currentIdx: number, maxRepeats = 2): void {
  const seen: Record<string, number> = {};
  for (const id of queue) seen[id] = (seen[id] || 0) + 1;
  const id = queue[currentIdx];
  if ((seen[id] || 0) > maxRepeats) return;
  const insertAt = Math.min(currentIdx + 2 + Math.floor(Math.random() * 2), queue.length);
  queue.splice(insertAt, 0, id);
}

/* namespace aggregate so call sites can use SRS.isDue etc. */
import * as SRSNS from './srs';
export const SRS = SRSNS;
