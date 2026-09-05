/* ============================================================
   ことばノート — central store (port of js/store.js, reactive)
   Same IndexedDB store names & record shapes as v1: old data
   survives the MUI rewrite untouched.
   ============================================================ */
import { DB } from './db';
import { SRS } from './srs';
import { Util } from './util-agg';
import * as Stats from './stats';
import { evaluate as achvEvaluate, defs as achvDefs, def as achvDef } from './achievements';
import type { AchvDef, Flags } from './achievements';
import type { Word, ReviewRecord, StudyDay, AchievementRec, Settings, WordFields, ReviewResult, ReviewMode } from './types';

export interface Dashboard {
  today: { newWords: number; reviewCount: number };
  streak: number;
  longest: number;
  totalWords: number;
  dueCount: number;
  studyDays: number;
  totalReviews: number;
  week: { newWords: number; reviewCount: number; weekStart: string };
  month: { newWords: number; reviewCount: number };
}

export interface AchvView extends AchvDef { unlocked: boolean; unlockedAt: string | null; }
type Listener = () => void;

const SET_KEY = 'kotoba.settings.v1';

class StoreImpl {
  words: Word[] = [];
  reviews: ReviewRecord[] = [];
  studyDays: StudyDay[] = [];
  achievements: AchievementRec[] = [];
  settings: Settings = { theme: 'dark', dir: 'jp2cn', order: 'random', goal: 10, notify: false };
  flags: Flags = { morning: false, night: false, revival: false, goalHit: false };
  ready: Promise<void> | null = null;
  private listeners: Listener[] = [];
  /** bumped on every mutation; React subscribes via useSyncExternalStore */
  version = 0;

  onChange(fn: Listener) { this.listeners.push(fn); }
  private notify() { this.version++; this.listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } }); }

  async init(): Promise<void> {
    if (this.ready) return this.ready;
    this.ready = (async () => {
      try {
        const raw = localStorage.getItem(SET_KEY);
        if (raw) Object.assign(this.settings, JSON.parse(raw));
      } catch { /* ignore */ }
      this.words = await DB.getAll<Word>('words');
      this.reviews = await DB.getAll<ReviewRecord>('reviews');
      this.studyDays = await DB.getAll<StudyDay>('studyDays');
      this.achievements = (await DB.getAll<AchievementRec>('achievements')).filter(a => !!achvDef(a.id));
      const meta = await DB.get<{ key: string } & Flags>('settings', 'flags');
      if (meta) this.flags = { ...this.flags, ...meta };
    })();
    return this.ready;
  }

  getWords(): Word[] { return this.words; }
  getWord(id: string): Word | undefined { return this.words.find(w => w.id === id); }
  getStudyDays(): StudyDay[] { return this.studyDays; }
  getReviews(): ReviewRecord[] { return this.reviews; }

  private todayRecord(): StudyDay | undefined {
    return this.studyDays.find(d => d.date === Util.todayKey());
  }

  private upsertStudyDay(date: string, patch: { newWords?: number; reviewCount?: number }): StudyDay {
    let rec = this.studyDays.find(d => d.date === date);
    if (!rec) {
      rec = { date, newWords: 0, reviewCount: 0, createdAt: new Date().toISOString() };
      this.studyDays.push(rec);
    }
    rec.newWords = (rec.newWords || 0) + (patch.newWords || 0);
    rec.reviewCount = (rec.reviewCount || 0) + (patch.reviewCount || 0);
    rec.updatedAt = new Date().toISOString();
    return rec;
  }

  async addWord(fields: WordFields): Promise<Word> {
    const now = new Date();
    const w: Word = {
      id: Util.uid('w'),
      word: (fields.word || '').trim(),
      reading: (fields.reading || '').trim(),
      partOfSpeech: (fields.partOfSpeech || '').trim(),
      translation: (fields.translation || '').trim(),
      transitivity: (fields.transitivity || '').trim(),
      example: (fields.example || '').trim(),
      note: (fields.note || '').trim(),
      tags: Array.isArray(fields.tags) ? fields.tags.map(t => String(t).trim()).filter(Boolean) : [],
      important: !!fields.important,
      hard: !!fields.hard,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      lastReviewedAt: null,
      reviewCount: 0,
      forgotCount: 0,
      rememberedCount: 0,
      streak: 0,
      nextReviewAt: null,
      mastery: 'new',
    };
    this.words.push(w);
    await DB.put('words', w);
    this.upsertStudyDay(Util.todayKey(), { newWords: 1 });
    await DB.put('studyDays', this.todayRecord()!);
    await this.maybeUnlock();
    this.notify();
    return w;
  }

  async updateWord(id: string, fields: Partial<WordFields>): Promise<Word | null> {
    const w = this.getWord(id);
    if (!w) return null;
    const patch: Word = { ...w };
    (['word', 'reading', 'partOfSpeech', 'translation', 'transitivity', 'example', 'note'] as const).forEach(k => {
      if (k in fields) patch[k] = String((fields as Record<string, unknown>)[k] ?? '').trim();
    });
    if ('tags' in fields) patch.tags = Array.isArray(fields.tags) ? fields.tags.map(t => String(t).trim()).filter(Boolean) : [];
    if ('important' in fields) patch.important = !!fields.important;
    if ('hard' in fields) patch.hard = !!fields.hard;
    patch.updatedAt = new Date().toISOString();
    const idx = this.words.findIndex(x => x.id === id);
    this.words[idx] = patch;
    await DB.put('words', patch);
    await this.maybeUnlock();
    this.notify();
    return patch;
  }

  async deleteWord(id: string): Promise<void> {
    this.words = this.words.filter(w => w.id !== id);
    await DB.delete('words', id);
    await this.maybeUnlock();
    this.notify();
  }

  async recordReview(wordId: string, result: ReviewResult, mode: ReviewMode): Promise<Word | null> {
    const w = this.getWord(wordId);
    if (!w) return null;
    const when = new Date();
    const updated = SRS.applyResult(w, result, when);
    const idx = this.words.findIndex(x => x.id === wordId);
    this.words[idx] = updated;
    await DB.put('words', updated);

    const rec: ReviewRecord = { id: Util.uid('r'), wordId, date: Util.key(when), result, mode: mode || 'jp2cn', createdAt: when.toISOString() };
    this.reviews.push(rec);
    await DB.put('reviews', rec);

    this.upsertStudyDay(Util.key(when), { reviewCount: 1 });
    await DB.put('studyDays', this.todayRecord()!);

    const period = Util.periodOf(when);
    if (period === 'morning') this.flags.morning = true;
    if (period === 'night') this.flags.night = true;
    if (updated.forgotCount >= 3 && (updated.mastery === 'familiar' || updated.mastery === 'mastered')) this.flags.revival = true;
    const tr = this.todayRecord();
    if (tr && (tr.newWords || 0) + (tr.reviewCount || 0) >= this.settings.goal) this.flags.goalHit = true;
    await DB.put('settings', { key: 'flags', ...this.flags });

    await this.maybeUnlock();
    this.notify();
    return updated;
  }

  private async maybeUnlock(): Promise<{ id: string; unlockedAt: string }[]> {
    const ctx = {
      words: this.words, reviews: this.reviews, studyDays: this.studyDays,
      settings: this.settings,
      bestStreak: Math.max(Stats.currentStreak(this.studyDays), Stats.longestStreak(this.studyDays)),
      flags: this.flags,
    };
    const newly = achvEvaluate({ ...ctx, unlockedIds: this.achievements.map(a => a.id) });
    for (const a of newly) {
      this.achievements.push(a);
      await DB.put('achievements', a);
    }
    return newly;
  }

  getAchievements(): AchvView[] {
    return achvDefs().map(d => {
      const rec = this.achievements.find(a => a.id === d.id);
      return { ...d, unlocked: !!rec, unlockedAt: rec?.unlockedAt || null };
    });
  }

  dashboard(): Dashboard {
    const today = Util.todayKey();
    const tr = this.todayRecord();
    const due = Stats.dueWords(this.words);
    return {
      today: tr ? { ...tr } : { newWords: 0, reviewCount: 0 },
      streak: Stats.currentStreak(this.studyDays, today),
      longest: Stats.longestStreak(this.studyDays),
      totalWords: this.words.length,
      dueCount: due.length,
      studyDays: this.studyDays.length,
      totalReviews: this.reviews.length,
      week: Stats.weekTotals(this.studyDays, today),
      month: Stats.monthTotals(this.studyDays, today),
    };
  }

  dueQueue(): Word[] {
    const today = Util.todayKey();
    return this.words
      .filter(w => SRS.isDue(w, today))
      .sort((a, b) => {
        const p = SRS.priority(b, today) - SRS.priority(a, today);
        if (p) return p;
        return (a.nextReviewAt || '9999') < (b.nextReviewAt || '9999') ? -1 : 1;
      });
  }

  exportData() {
    return {
      app: 'kotoba-notebook', version: 1, exportedAt: new Date().toISOString(),
      words: this.words, reviews: this.reviews, studyDays: this.studyDays,
      achievements: this.achievements, settings: this.settings,
    };
  }

  static validateBackup(obj: unknown): obj is ExportPayload { 
    const o = obj as ExportPayload;
    return !!o && o.app === 'kotoba-notebook' && Array.isArray(o.words) && Array.isArray(o.reviews) && Array.isArray(o.studyDays);
  }

  async importData(obj: ExportPayload, mode: 'replace' | 'merge' = 'replace'): Promise<void> {
    if (!StoreImpl.validateBackup(obj)) throw new Error('备份文件格式不正确');
    const w = obj.words.map(x => ({ ...x }));
    const r = obj.reviews.map(x => ({ ...x }));
    const s = obj.studyDays.map(x => ({ ...x }));
    const a = (obj.achievements || []).filter(x => achvDef(x.id));
    if (mode === 'replace') {
      await DB.wipeAll(false);
      this.words = []; this.reviews = []; this.studyDays = []; this.achievements = [];
    }
    const wmap = new Map(this.words.map(x => [x.id, x])); w.forEach(x => wmap.set(x.id, x)); this.words = [...wmap.values()];
    const rmap = new Map(this.reviews.map(x => [x.id, x])); r.forEach(x => rmap.set(x.id, x)); this.reviews = [...rmap.values()];
    const smap = new Map(this.studyDays.map(x => [x.date, x])); s.forEach(x => smap.set(x.date, x)); this.studyDays = [...smap.values()];
    const amap = new Map(this.achievements.map(x => [x.id, x])); a.forEach(x => amap.set(x.id, x)); this.achievements = [...amap.values()];
    await DB.putMany('words', this.words);
    await DB.putMany('reviews', this.reviews);
    await DB.putMany('studyDays', this.studyDays);
    await DB.putMany('achievements', this.achievements);
    if (obj.settings) Object.assign(this.settings, obj.settings);
    this.saveSettings();
    this.flags = { morning: false, night: false, revival: false, goalHit: false };
    this.reviews.forEach(rv => { const p = Util.periodOf(new Date(rv.createdAt)); if (p === 'morning') this.flags.morning = true; if (p === 'night') this.flags.night = true; });
    this.words.forEach(wd => { if (wd.forgotCount >= 3 && (wd.mastery === 'familiar' || wd.mastery === 'mastered')) this.flags.revival = true; });
    this.studyDays.forEach(d => { if ((d.newWords || 0) + (d.reviewCount || 0) >= this.settings.goal) this.flags.goalHit = true; });
    await DB.put('settings', { key: 'flags', ...this.flags });
    await this.maybeUnlock();
    this.notify();
  }

  async clearAll(): Promise<void> {
    await DB.wipeAll(false);
    this.words = []; this.reviews = []; this.studyDays = []; this.achievements = [];
    this.flags = { morning: false, night: false, revival: false, goalHit: false };
    await DB.put('settings', { key: 'flags', ...this.flags });
    this.notify();
  }

  patchSettings(patch: Partial<Settings>): void {
    Object.assign(this.settings, patch);
    this.saveSettings();
    this.notify();
  }

  private saveSettings() {
    try { localStorage.setItem(SET_KEY, JSON.stringify(this.settings)); } catch { /* ignore */ }
  }
}

export interface ExportPayload {
  app: string; version: number; exportedAt: string;
  words: Word[]; reviews: ReviewRecord[]; studyDays: StudyDay[];
  achievements: AchievementRec[]; settings?: Partial<Settings>;
}

export const Store = new StoreImpl();
export { Util };
