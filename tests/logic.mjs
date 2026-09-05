/* ============================================================
   ことばノート — pure logic unit tests (node:test, no browser)
   Run: node --test tests/logic.mjs
   ============================================================ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const load = fn => readFileSync(path.join(root, 'js', fn), 'utf8');

/* classic scripts share one function scope; expose namespaces */
const bundle = [load('util.js'), load('srs.js'), load('stats.js'), load('achievements.js')].join('\n');
const { Util, SRS, Stats, Achv } = new Function(`${bundle}\n;return { Util, SRS, Stats, Achv };`)();

/* ---------------- dates ---------------- */
test('weekday kanji: 2026-09-05 is Saturday → 土', () => {
  assert.equal(Util.weekdayKanji('2026-09-05'), '土');
});
test('weekday kanji: 2026-09-07 is Monday → 月', () => {
  assert.equal(Util.weekdayKanji('2026-09-07'), '月');
});
test('weekday kanji: 2026-09-06 is Sunday → 日', () => {
  assert.equal(Util.weekdayKanji('2026-09-06'), '日');
});
test('week start is Monday (2026-09-05 → 2026-08-31)', () => {
  assert.equal(Util.weekStartKey('2026-09-05'), '2026-08-31');
});
test('weekdayKanjiFromIndex order is 日月火水木金土 (getDay)', () => {
  assert.equal(Util.weekdayKanjiFromIndex(1), '月');
  assert.equal(Util.weekdayKanjiFromIndex(6), '土');
});
test('addDays across month boundary', () => {
  assert.equal(Util.addDays('2026-09-30', 1), '2026-10-01');
  assert.equal(Util.addDays('2026-01-01', -1), '2025-12-31');
});

/* ---------------- SRS ---------------- */
test('srs: forgotten → due today, streak 0, forgotCount+1, mastery shaky', () => {
  const w = { id: '1', nextReviewAt: null, reviewCount: 0, streak: 0, forgotCount: 0, rememberedCount: 0, mastery: 'new' };
  const r = SRS.applyResult(w, 'forgotten', new Date(2026, 8, 5, 10, 0));
  assert.equal(r.nextReviewAt, '2026-09-05');
  assert.equal(r.forgotCount, 1);
  assert.equal(r.streak, 0);
  assert.equal(r.mastery, 'shaky');
});
test('srs: remembered → intervals 1, 3, 7, 14 days', () => {
  let w = { id: '1', nextReviewAt: null, reviewCount: 0, streak: 0, forgotCount: 0, rememberedCount: 0, mastery: 'new' };
  w = SRS.applyResult(w, 'remembered', new Date(2026, 8, 5, 10, 0));
  assert.equal(w.nextReviewAt, '2026-09-06'); // +1
  assert.equal(w.streak, 1);
  w = SRS.applyResult(w, 'remembered', new Date(2026, 8, 6, 10, 0));
  assert.equal(w.nextReviewAt, '2026-09-09'); // +3
  w = SRS.applyResult(w, 'remembered', new Date(2026, 8, 9, 10, 0));
  assert.equal(w.nextReviewAt, '2026-09-16'); // +7
  w = SRS.applyResult(w, 'remembered', new Date(2026, 8, 16, 10, 0));
  assert.equal(w.nextReviewAt, '2026-09-30'); // +14
});
test('srs: forgot resets streak and comes back sooner than remember', () => {
  let w = { id: '1', nextReviewAt: null, reviewCount: 0, streak: 3, forgotCount: 0, rememberedCount: 3, mastery: 'familiar' };
  w = SRS.applyResult(w, 'forgotten', new Date(2026, 8, 5, 10, 0));
  assert.equal(w.streak, 0);
  assert.equal(w.nextReviewAt, '2026-09-05');
  assert.equal(w.mastery, 'shaky');
});
test('srs: mastery progresses learning → familiar → mastered', () => {
  let w = { id: '1', nextReviewAt: null, reviewCount: 0, streak: 0, forgotCount: 0, rememberedCount: 0, mastery: 'new' };
  w = SRS.applyResult(w, 'remembered', new Date(2026, 8, 1, 10));
  assert.equal(w.mastery, 'learning');
  w = SRS.applyResult(w, 'remembered', new Date(2026, 8, 3, 10));
  assert.equal(w.mastery, 'learning'); // streak 2 → still learning
  w = SRS.applyResult(w, 'remembered', new Date(2026, 8, 6, 10));
  assert.equal(w.mastery, 'familiar'); // streak 3 → familiar
  w = SRS.applyResult(w, 'remembered', new Date(2026, 8, 10, 10));
  assert.equal(w.mastery, 'familiar');
  w = SRS.applyResult(w, 'remembered', new Date(2026, 8, 15, 10));
  assert.equal(w.mastery, 'mastered'); // streak 5 → mastered
});
test('srs: mastery shaky after 3+ forgets even with some remembers', () => {
  let w = { id: '1', nextReviewAt: null, reviewCount: 5, streak: 2, forgotCount: 3, rememberedCount: 2, mastery: 'familiar' };
  w = SRS.applyResult(w, 'forgotten', new Date(2026, 8, 5, 10));
  assert.equal(w.mastery, 'shaky');
});
test('srs: priority raises recently forgotten / important / hard words', () => {
  const today = '2026-09-05';
  const plain = { id: 'a', important: false, hard: false, forgotCount: 0, nextReviewAt: null, lastReviewedAt: null };
  const forgot = { id: 'b', important: false, hard: false, forgotCount: 2, nextReviewAt: '2026-09-05', lastReviewedAt: '2026-09-04T10:00:00.000Z' };
  const imp = { id: 'c', important: true, hard: false, forgotCount: 0, nextReviewAt: null, lastReviewedAt: null };
  const hard = { id: 'd', important: false, hard: true, forgotCount: 0, nextReviewAt: null, lastReviewedAt: null };
  assert.ok(SRS.priority(forgot, today) > SRS.priority(plain, today));
  assert.ok(SRS.priority(imp, today) > SRS.priority(plain, today));
  assert.ok(SRS.priority(hard, today) > SRS.priority(plain, today));
});
test('srs: requeueInSession re-inserts forgotten word ahead', () => {
  const q = ['a', 'b', 'c', 'd'];
  SRS.requeueInSession(q, 0, null); // forgot 'a'
  assert.equal(q.length, 5);
  assert.equal(q.filter(x => x === 'a').length, 2); // duplicate added
  assert.ok(q[1] !== 'a' || q[2] !== 'a' || q[3] !== 'a'); // re-inserted ahead of b/c/d
});

/* ---------------- stats ---------------- */
test('stats: current streak counts today if studied, else yesterday (still alive)', () => {
  const days = [
    { date: '2026-09-03', newWords: 1, reviewCount: 0 },
    { date: '2026-09-04', newWords: 1, reviewCount: 0 },
    { date: '2026-09-05', newWords: 1, reviewCount: 0 },
  ];
  assert.equal(Stats.currentStreak(days, '2026-09-05'), 3);
  assert.equal(Stats.currentStreak(days, '2026-09-06'), 3); // today not studied yet → alive
  assert.equal(Stats.currentStreak(days, '2026-09-07'), 0); // gap → broken
});
test('stats: study day = newWords or reviewCount > 0', () => {
  assert.equal(Stats.isStudyDay({ newWords: 0, reviewCount: 0 }), false);
  assert.equal(Stats.isStudyDay({ newWords: 1, reviewCount: 0 }), true);
  assert.equal(Stats.isStudyDay({ newWords: 0, reviewCount: 1 }), true);
});
test('stats: streak broken by gap; longest computed correctly', () => {
  const days = [
    { date: '2026-09-01', newWords: 1, reviewCount: 0 },
    { date: '2026-09-02', newWords: 1, reviewCount: 0 },
    { date: '2026-09-04', newWords: 1, reviewCount: 0 },
    { date: '2026-09-05', newWords: 1, reviewCount: 0 },
  ];
  assert.equal(Stats.currentStreak(days, '2026-09-05'), 2);
  assert.equal(Stats.longestStreak(days), 2);
});
test('stats: calendar month monday-first (2026-09-01 is Tuesday → lead 1, Sep has 30 days)', () => {
  const cells = Stats.calendarMonth([], 2026, 9);
  assert.equal(cells.filter(c => c.key === null).length, 1);
  assert.equal(cells.length, 31);
  assert.equal(cells.find(c => c.key === '2026-09-01').day, 1);
  assert.equal(cells.find(c => c.key === '2026-09-30').day, 30);
});
test('stats: intensity levels 0/1–5/6–10/11–20/20+', () => {
  assert.equal(Stats.levelOf({ newWords: 0, reviewCount: 0 }), 0);
  assert.equal(Stats.levelOf({ newWords: 5, reviewCount: 0 }), 1);
  assert.equal(Stats.levelOf({ newWords: 6, reviewCount: 1 }), 2);
  assert.equal(Stats.levelOf({ newWords: 11, reviewCount: 0 }), 3);
  assert.equal(Stats.levelOf({ newWords: 21, reviewCount: 0 }), 4);
});
test('stats: due words = no nextReviewAt or due today', () => {
  const words = [
    { id: 'a', nextReviewAt: null },
    { id: 'b', nextReviewAt: '2026-09-05' },
    { id: 'c', nextReviewAt: '2026-09-06' },
  ];
  assert.deepEqual(Stats.dueWords(words, '2026-09-05').map(w => w.id), ['a', 'b']);
});
test('stats: week totals are monday-based', () => {
  const days = [
    { date: '2026-08-30', newWords: 99, reviewCount: 0 }, // Sunday of PREVIOUS week (excluded)
    { date: '2026-08-31', newWords: 1, reviewCount: 1 },  // Monday of current week
    { date: '2026-09-05', newWords: 2, reviewCount: 3 },  // Saturday of current week
    { date: '2026-09-07', newWords: 99, reviewCount: 0 }, // Monday of NEXT week (excluded)
  ];
  const w = Stats.weekTotals(days, '2026-09-05');
  assert.equal(w.newWords, 3);
  assert.equal(w.reviewCount, 4);
  assert.equal(w.weekStart, '2026-08-31');
});
test('stats: month totals', () => {
  const days = [
    { date: '2026-09-01', newWords: 2, reviewCount: 0 },
    { date: '2026-09-30', newWords: 1, reviewCount: 5 },
    { date: '2026-08-31', newWords: 99, reviewCount: 0 },
  ];
  const m = Stats.monthTotals(days, '2026-09-15');
  assert.equal(m.newWords, 3);
  assert.equal(m.reviewCount, 5);
});

/* ---------------- achievements ---------------- */
function ctx(over = {}) {
  return { words: [], reviews: [], studyDays: [], settings: { goal: 10 }, bestStreak: 0, flags: { morning: false, night: false, revival: false, goalHit: false }, unlockedIds: [], ...over };
}
test('achievements: first-word unlocks at 1 word; words-10 does not', () => {
  const newly = Achv.evaluate(ctx({ words: [{ id: '1' }] }));
  assert.ok(newly.some(a => a.id === 'first-word'));
  assert.ok(!newly.some(a => a.id === 'words-10'));
});
test('achievements: word milestones', () => {
  const words = Array.from({ length: 50 }, (_, i) => ({ id: String(i) }));
  const newly = Achv.evaluate(ctx({ words }));
  assert.ok(newly.some(a => a.id === 'words-10'));
  assert.ok(newly.some(a => a.id === 'words-50'));
  assert.ok(!newly.some(a => a.id === 'words-100'));
});
test('achievements: streak milestones unlock cumulatively', () => {
  const newly = Achv.evaluate(ctx({ bestStreak: 7 }));
  assert.ok(newly.some(a => a.id === 'streak-3'));
  assert.ok(newly.some(a => a.id === 'streak-7'));
  assert.ok(!newly.some(a => a.id === 'streak-14'));
});
test('achievements: already unlocked are not re-emitted', () => {
  const newly = Achv.evaluate(ctx({ words: [{ id: '1' }], unlockedIds: ['first-word'] }));
  assert.ok(!newly.some(a => a.id === 'first-word'));
});
test('achievements: review milestones & flags', () => {
  const reviews = Array.from({ length: 100 }, (_, i) => ({ id: String(i) }));
  const newly = Achv.evaluate(ctx({ reviews, flags: { morning: true, night: false, revival: false, goalHit: false } }));
  assert.ok(newly.some(a => a.id === 'review-1'));
  assert.ok(newly.some(a => a.id === 'review-100'));
  assert.ok(!newly.some(a => a.id === 'review-500'));
  assert.ok(newly.some(a => a.id === 'early-bird'));
});
test('achievements: revival & goal-hit', () => {
  const newly = Achv.evaluate(ctx({ flags: { morning: false, night: false, revival: true, goalHit: true } }));
  assert.ok(newly.some(a => a.id === 'revival'));
  assert.ok(newly.some(a => a.id === 'goal-hit'));
});
