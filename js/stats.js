/* ============================================================
   ことばノート — statistics: streaks, calendar, weekly/monthly
   ============================================================ */
const Stats = (() => {
  /* day "studied" = added ≥1 word OR reviewed ≥1 time */
  const dayTotal = d => (d.newWords || 0) + (d.reviewCount || 0);
  const isStudyDay = d => dayTotal(d) > 0;

  function dayMap(studyDays) {
    const m = new Map();
    (studyDays || []).forEach(d => m.set(d.date, d));
    return m;
  }

  /* streak ending at `endKey` (inclusive). If endKey is today and today not yet
     studied, streak is measured from yesterday (still "alive"). */
  function streakEndingAt(studyDays, endKey) {
    const map = dayMap(studyDays);
    let cursor = endKey;
    if (!map.has(cursor)) cursor = Util.addDays(cursor, -1);
    let n = 0;
    while (map.has(cursor) && isStudyDay(map.get(cursor))) {
      n++;
      cursor = Util.addDays(cursor, -1);
    }
    return n;
  }

  function currentStreak(studyDays, today) {
    return streakEndingAt(studyDays, today || Util.todayKey());
  }

  function longestStreak(studyDays) {
    const map = dayMap(studyDays);
    const days = Array.from(map.keys()).filter(k => isStudyDay(map.get(k))).sort();
    let best = 0, run = 0, prev = null;
    for (const k of days) {
      if (prev && Util.addDays(prev, 1) === k) run++;
      else run = 1;
      if (run > best) best = run;
      prev = k;
    }
    return best;
  }

  function totalWords(words) { return (words || []).length; }
  function totalReviews(reviews) { return (reviews || []).length; }

  function totalsBetween(studyDays, fromKey, toKey) {
    let newWords = 0, reviewCount = 0;
    (studyDays || []).forEach(d => {
      if (d.date >= fromKey && d.date <= toKey) {
        newWords += d.newWords || 0;
        reviewCount += d.reviewCount || 0;
      }
    });
    return { newWords, reviewCount };
  }

  function weekTotals(studyDays, today) {
    const ws = Util.weekStartKey(today || Util.todayKey());
    return { ...totalsBetween(studyDays, ws, Util.addDays(ws, 6)), weekStart: ws };
  }

  function monthTotals(studyDays, today) {
    const t = today || Util.todayKey();
    const from = t.slice(0, 8) + '01';
    const lastDay = new Date(+t.slice(0, 4), +t.slice(5, 7), 0).getDate();
    const to = `${t.slice(0, 8)}${String(lastDay).padStart(2, '0')}`;
    return totalsBetween(studyDays, from, to);
  }

  /* intensity level for calendar cell: 0 / 1–5 / 6–10 / 11–20 / 20+ */
  function levelOf(day) {
    const t = dayTotal(day);
    if (t <= 0) return 0;
    if (t <= 5) return 1;
    if (t <= 10) return 2;
    if (t <= 20) return 3;
    return 4;
  }

  /* calendar month cells with monday-first layout */
  function calendarMonth(studyDays, year, month) { // month 1-12
    const first = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    const lead = (first.getDay() + 6) % 7; // Mon=0 → empty cells before day 1
    const map = dayMap(studyDays);
    const cells = [];
    for (let i = 0; i < lead; i++) cells.push({ key: null, level: 0 });
    for (let d = 1; d <= daysInMonth; d++) {
      const k = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const rec = map.get(k);
      cells.push({ key: k, day: d, level: rec ? levelOf(rec) : 0, newWords: rec?.newWords || 0, reviewCount: rec?.reviewCount || 0 });
    }
    return cells;
  }

  function dueWords(words, today) {
    const t = today || Util.todayKey();
    return (words || []).filter(w => SRS.isDue(w, t));
  }

  function wordStats(words) {
    const total = words.length;
    const byStatus = { new: 0, learning: 0, shaky: 0, familiar: 0, mastered: 0 };
    words.forEach(w => { byStatus[w.mastery || 'new'] = (byStatus[w.mastery || 'new'] || 0) + 1; });
    const important = words.filter(w => w.important).length;
    const hard = words.filter(w => w.hard).length;
    return { total, byStatus, important, hard };
  }

  return { dayTotal, isStudyDay, dayMap, streakEndingAt, currentStreak, longestStreak, totalWords, totalReviews, totalsBetween, weekTotals, monthTotals, levelOf, calendarMonth, dueWords, wordStats };
})();
