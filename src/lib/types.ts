/* ============================================================
   ことばノート — word type (shape identical to v1 IndexedDB)
   ============================================================ */

export interface Word {
  id: string;
  word: string;
  reading: string;
  partOfSpeech: string;
  translation: string;
  transitivity: string;
  example: string;
  note: string;
  tags: string[];
  important: boolean;
  hard: boolean;
  createdAt: string;
  updatedAt: string;
  lastReviewedAt: string | null;
  reviewCount: number;
  forgotCount: number;
  rememberedCount: number;
  streak: number;
  nextReviewAt: string | null;
  mastery: MasteryKey;
}

export type MasteryKey = 'new' | 'learning' | 'shaky' | 'familiar' | 'mastered';
export type ReviewResult = 'remembered' | 'forgotten';
export type ReviewMode = 'jp2cn' | 'cn2jp' | 'recall';

export interface ReviewRecord {
  id: string;
  wordId: string;
  date: string;
  result: ReviewResult;
  mode: ReviewMode;
  createdAt: string;
}

export interface StudyDay {
  date: string;
  newWords: number;
  reviewCount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface AchievementRec {
  id: string;
  unlockedAt: string;
}

export interface Settings {
  theme: 'dark' | 'light';
  dir: 'jp2cn' | 'cn2jp' | 'random';
  order: 'random' | 'input';
  goal: number;
  notify: boolean;
}

export interface WordFields {
  word: string;
  reading: string;
  partOfSpeech: string;
  translation: string;
  transitivity: string;
  example: string;
  note: string;
  tags: string[];
  important: boolean;
  hard: boolean;
}
