/* ============================================================
   ことばノート — achievements (port of js/achievements.js)
   ============================================================ */
import type { Word, ReviewRecord, StudyDay, Settings } from './types';
import { currentStreak, longestStreak } from './stats';

export interface AchvDef {
  id: string;
  icon: string;
  name: string;
  desc: string;
  check: (c: AchvCtx) => boolean;
}

export interface AchvCtx {
  words: Word[];
  reviews: ReviewRecord[];
  studyDays: StudyDay[];
  settings: Settings;
  bestStreak: number;
  flags: Flags;
  unlockedIds: string[];
}

export interface Flags { morning: boolean; night: boolean; revival: boolean; goalHit: boolean; }

export const DEFS: AchvDef[] = [
  { id: 'first-word', icon: '🌱', name: '初めの一歩', desc: '最初の単語を記録', check: c => c.words.length >= 1 },
  { id: 'words-10', icon: '📗', name: '10語', desc: '累計10語を記録', check: c => c.words.length >= 10 },
  { id: 'words-50', icon: '📘', name: '50語', desc: '累計50語を記録', check: c => c.words.length >= 50 },
  { id: 'words-100', icon: '📙', name: '100語', desc: '累計100語を記録', check: c => c.words.length >= 100 },
  { id: 'words-500', icon: '📕', name: '500語', desc: '累計500語を記録', check: c => c.words.length >= 500 },
  { id: 'words-1000', icon: '📚', name: '1000語', desc: '累計1000語を記録', check: c => c.words.length >= 1000 },
  { id: 'streak-3', icon: '🔥', name: '3日連続', desc: '3日連続で学習', check: c => c.bestStreak >= 3 },
  { id: 'streak-7', icon: '🔥', name: '7日連続', desc: '7日連続で学習', check: c => c.bestStreak >= 7 },
  { id: 'streak-14', icon: '⚡', name: '14日連続', desc: '14日連続で学習', check: c => c.bestStreak >= 14 },
  { id: 'streak-30', icon: '🌙', name: '30日連続', desc: '30日連続で学習', check: c => c.bestStreak >= 30 },
  { id: 'streak-100', icon: '🌕', name: '100日連続', desc: '100日連続で学習', check: c => c.bestStreak >= 100 },
  { id: 'review-1', icon: '✍️', name: '初回復習', desc: 'はじめての復習', check: c => c.reviews.length >= 1 },
  { id: 'review-100', icon: '💪', name: '100回復習', desc: '累計100回の復習', check: c => c.reviews.length >= 100 },
  { id: 'review-500', icon: '🏋️', name: '500回復習', desc: '累計500回の復習', check: c => c.reviews.length >= 500 },
  { id: 'early-bird', icon: '🌅', name: '早起き', desc: '朝（5時–11時）に学習', check: c => c.flags.morning },
  { id: 'night-owl', icon: '🦉', name: '夜の学習', desc: '夜（22時–5時）に学習', check: c => c.flags.night },
  { id: 'revival', icon: '🌿', name: '忘却から復活', desc: '何度も忘れた単語を覚えた', check: c => c.flags.revival },
  { id: 'goal-hit', icon: '🎯', name: '目標達成', desc: '1日で目標に到達', check: c => c.flags.goalHit },
];

export const defs = () => DEFS;
export const def = (id: string) => DEFS.find(d => d.id === id);

export function evaluate(ctx: AchvCtx): { id: string; unlockedAt: string }[] {
  const unlocked = new Set(ctx.unlockedIds || []);
  return DEFS.filter(d => !unlocked.has(d.id) && d.check(ctx))
    .map(d => ({ id: d.id, unlockedAt: new Date().toISOString() }));
}
