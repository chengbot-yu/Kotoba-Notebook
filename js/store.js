/* ============================================================
   ことばノート — central store: words / reviews / study days /
   achievements / settings, plus import & export (JSON backup)
   ============================================================ */
const Store = (() => {
  let words = [];
  let reviews = [];
  let studyDays = [];
  let achievements = [];
  let settings = { theme: 'dark', dir: 'jp2cn', order: 'random', goal: 10, notify: false };
  let flags = { morning: false, night: false, revival: false, goalHit: false };
  let ready = null;
  let listeners = [];

  /* ---------- settings (lightweight prefs, localStorage) ---------- */
  const SET_KEY = 'kotoba.settings.v1';
  function loadSettings() {
    try {
      const raw = localStorage.getItem(SET_KEY);
      if (raw) Object.assign(settings, JSON.parse(raw));
    } catch (e) { /* ignore */ }
  }
  function saveSettings() {
    try { localStorage.setItem(SET_KEY, JSON.stringify(settings)); } catch (e) { /* ignore */ }
  }
  function patchSettings(patch) {
    Object.assign(settings, patch);
    saveSettings();
    notify();
  }

  /* ---------- init ---------- */
  async function init() {
    if (ready) return ready;
    ready = (async () => {
      loadSettings();
      words = await DB.getAll('words');
      reviews = await DB.getAll('reviews');
      studyDays = await DB.getAll('studyDays');
      achievements = await DB.getAll('achievements');
      const meta = await DB.get('settings', 'flags');
      if (meta) flags = { ...flags, ...meta };
      // drop achievements of removed defs (keep data clean)
      achievements = achievements.filter(a => Achv.def(a.id));
    })();
    return ready;
  }

  function onChange(fn) { listeners.push(fn); }
  function notify() { listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } }); }

  /* ---------- words ---------- */
  function getWords() { return words; }
  function getWord(id) { return words.find(w => w.id === id); }
  function getStudyDays() { return studyDays; }
  function getReviews() { return reviews; }

  function todayRecord() {
    const k = Util.todayKey();
    return studyDays.find(d => d.date === k);
  }

  function upsertStudyDay(date, patch) {
    let rec = studyDays.find(d => d.date === date);
    if (!rec) { rec = { date, newWords: 0, reviewCount: 0, createdAt: new Date().toISOString() }; studyDays.push(rec); }
    rec.newWords = (rec.newWords || 0) + (patch.newWords || 0);
    rec.reviewCount = (rec.reviewCount || 0) + (patch.reviewCount || 0);
    rec.updatedAt = new Date().toISOString();
    return rec;
  }

  async function addWord(fields) {
    const now = new Date();
    const w = {
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
    words.push(w);
    await DB.put('words', w);
    upsertStudyDay(Util.todayKey(), { newWords: 1, reviewCount: 0 });
    await DB.put('studyDays', todayRecord());
    await maybeUnlock(); // words / streak / goal etc.
    notify();
    return w;
  }

  async function updateWord(id, fields) {
    const w = getWord(id);
    if (!w) return null;
    const patch = { ...w };
    ['word', 'reading', 'partOfSpeech', 'translation', 'transitivity', 'example', 'note'].forEach(k => {
      if (k in fields) patch[k] = String(fields[k] ?? '').trim();
    });
    if ('tags' in fields) patch.tags = Array.isArray(fields.tags) ? fields.tags.map(t => String(t).trim()).filter(Boolean) : [];
    if ('important' in fields) patch.important = !!fields.important;
    if ('hard' in fields) patch.hard = !!fields.hard;
    patch.updatedAt = new Date().toISOString();
    const idx = words.findIndex(x => x.id === id);
    words[idx] = patch;
    await DB.put('words', patch);
    await maybeUnlock();
    notify();
    return patch;
  }

  async function deleteWord(id) {
    words = words.filter(w => w.id !== id);
    await DB.delete('words', id);
    // keep review history (statistics stay honest) but they reference a
    // removed word — calendar day details simply won't list it.
    await maybeUnlock();
    notify();
  }

  /* ---------- reviews ---------- */
  async function recordReview(wordId, result, mode) {
    const w = getWord(wordId);
    if (!w) return null;
    const when = new Date();
    const updated = SRS.applyResult(w, result, when);
    const idx = words.findIndex(x => x.id === wordId);
    words[idx] = updated;
    await DB.put('words', updated);

    const rec = { id: Util.uid('r'), wordId, date: Util.key(when), result, mode: mode || 'jp2cn', createdAt: when.toISOString() };
    reviews.push(rec);
    await DB.put('reviews', rec);

    upsertStudyDay(Util.key(when), { newWords: 0, reviewCount: 1 });
    await DB.put('studyDays', todayRecord());

    // time-of-day flags for early-bird / night-owl
    const period = Util.periodOf(when);
    if (period === 'morning') flags.morning = true;
    if (period === 'night') flags.night = true;
    // revival: a word that was forgotten ≥3 times and now reached familiar/mastered
    if (updated.forgotCount >= 3 && (updated.mastery === 'familiar' || updated.mastery === 'mastered')) flags.revival = true;
    // goal-hit: today total ≥ goal
    const tr = todayRecord();
    if (tr && (tr.newWords || 0) + (tr.reviewCount || 0) >= settings.goal) flags.goalHit = true;
    await DB.put('settings', { key: 'flags', ...flags });

    await maybeUnlock();
    notify();
    return updated;
  }

  /* ---------- achievements ---------- */
  async function maybeUnlock() {
    const ctx = {
      words, reviews, studyDays,
      settings,
      bestStreak: Math.max(Stats.currentStreak(studyDays), Stats.longestStreak(studyDays)),
      flags,
    };
    const newly = Achv.evaluate({ ...ctx, unlockedIds: achievements.map(a => a.id) });
    if (newly.length) {
      for (const a of newly) {
        achievements.push(a);
        await DB.put('achievements', a);
      }
    }
    return newly;
  }

  function getAchievements() {
    return Achv.defs().map(d => {
      const rec = achievements.find(a => a.id === d.id);
      return { ...d, unlocked: !!rec, unlockedAt: rec?.unlockedAt || null };
    });
  }

  /* ---------- stats shortcuts ---------- */
  function dashboard() {
    const today = Util.todayKey();
    const tr = todayRecord();
    const due = Stats.dueWords(words);
    return {
      today: tr ? { ...tr } : { newWords: 0, reviewCount: 0 },
      streak: Stats.currentStreak(studyDays, today),
      longest: Stats.longestStreak(studyDays),
      totalWords: words.length,
      dueCount: due.length,
      studyDays: studyDays.length,
      totalReviews: reviews.length,
      week: Stats.weekTotals(studyDays, today),
      month: Stats.monthTotals(studyDays, today),
    };
  }

  function dueQueue() {
    const today = Util.todayKey();
    return words
      .filter(w => SRS.isDue(w, today))
      .sort((a, b) => {
        const p = SRS.priority(b, today) - SRS.priority(a, today);
        if (p) return p;
        return (a.nextReviewAt || '9999') < (b.nextReviewAt || '9999') ? -1 : 1;
      });
  }

  /* ---------- import / export ---------- */
  function exportData() {
    return {
      app: 'kotoba-notebook',
      version: 1,
      exportedAt: new Date().toISOString(),
      words, reviews, studyDays, achievements,
      settings,
    };
  }

  function validateBackup(obj) {
    return obj && obj.app === 'kotoba-notebook' && Array.isArray(obj.words) && Array.isArray(obj.reviews) && Array.isArray(obj.studyDays);
  }

  async function importData(obj, mode = 'replace') {
    if (!validateBackup(obj)) throw new Error('备份文件格式不正确');
    // normalize records
    const w = obj.words.map(x => ({ ...x }));
    const r = obj.reviews.map(x => ({ ...x }));
    const s = obj.studyDays.map(x => ({ ...x }));
    const a = (obj.achievements || []).filter(x => Achv.def(x.id));
    if (mode === 'replace') {
      await DB.wipeAll(false);
      words = []; reviews = []; studyDays = []; achievements = [];
    }
    // merge by id / date
    const wmap = new Map(words.map(x => [x.id, x])); w.forEach(x => wmap.set(x.id, x)); words = [...wmap.values()];
    const rmap = new Map(reviews.map(x => [x.id, x])); r.forEach(x => rmap.set(x.id, x)); reviews = [...rmap.values()];
    const smap = new Map(studyDays.map(x => [x.date, x])); s.forEach(x => smap.set(x.date, x)); studyDays = [...smap.values()];
    const amap = new Map(achievements.map(x => [x.id, x])); a.forEach(x => amap.set(x.id, x)); achievements = [...amap.values()];
    await DB.putMany('words', words);
    await DB.putMany('reviews', reviews);
    await DB.putMany('studyDays', studyDays);
    await DB.putMany('achievements', achievements);
    if (obj.settings) Object.assign(settings, obj.settings);
    saveSettings();
    // recompute data-derived flags (don't trust file blindly)
    flags = { morning: false, night: false, revival: false, goalHit: false };
    reviews.forEach(rv => { const p = Util.periodOf(new Date(rv.createdAt)); if (p === 'morning') flags.morning = true; if (p === 'night') flags.night = true; });
    words.forEach(wd => { if (wd.forgotCount >= 3 && (wd.mastery === 'familiar' || wd.mastery === 'mastered')) flags.revival = true; });
    studyDays.forEach(d => { if ((d.newWords || 0) + (d.reviewCount || 0) >= settings.goal) flags.goalHit = true; });
    await DB.put('settings', { key: 'flags', ...flags });
    await maybeUnlock();
    notify();
  }

  async function clearAll() {
    await DB.wipeAll(false);
    words = []; reviews = []; studyDays = []; achievements = [];
    flags = { morning: false, night: false, revival: false, goalHit: false };
    await DB.put('settings', { key: 'flags', ...flags });
    notify();
  }

  return { init, onChange, get settings() { return settings; }, patchSettings, getWords, getWord, getStudyDays, getReviews, addWord, updateWord, deleteWord, recordReview, dueQueue, dashboard, getAchievements, maybeUnlock, exportData, importData, clearAll };
})();
