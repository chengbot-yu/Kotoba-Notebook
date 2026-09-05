/* ============================================================
   ことばノート — review scheduling (SRS core)

   Simple, transparent, reliable spaced repetition:

   - 忘れていた  → due again TODAY (immediately re-queued in session),
                   forgotCount++, streak reset
   - 覚えていた  → next review after 1, 3, 7, 14, 30, 60, 120 days
                   (interval grows with consecutive remembers)

   Mastery status is derived purely from review behaviour:
   未复习 → 学习中 → 容易忘记 / 熟悉 → 已掌握
   ============================================================ */
const SRS = (() => {
  const INTERVALS = [1, 3, 7, 14, 30, 60, 120];

  const MASTERY = {
    new:      { label: '未复习', en: 'new' },
    learning: { label: '学习中', en: 'learning' },
    shaky:    { label: '容易忘记', en: 'shaky' },
    familiar: { label: '熟悉', en: 'familiar' },
    mastered: { label: '已掌握', en: 'mastered' },
  };
  const MASTERY_ORDER = ['new', 'learning', 'shaky', 'familiar', 'mastered'];

  /* due check: no next date yet (fresh word) or due on/before today */
  function isDue(word, today) {
    return !word.nextReviewAt || word.nextReviewAt <= today;
  }

  /* priority: forgotten-lately / important / hard words first */
  function priority(word, today) {
    let p = 0;
    if (word.important) p += 4;
    if (word.hard) p += 4;
    const last = word.lastReviewedAt ? Util.key(new Date(word.lastReviewedAt)) : null;
    if (word.forgotCount > 0 && last && Util.addDays(last, 3) >= today) p += 6; // recently forgotten
    else if (word.forgotCount > 0) p += 3;
    if (!word.nextReviewAt) p += 2; // never reviewed → sooner
    return p;
  }

  function masteryOf(word) {
    if (!word.reviewCount) return 'new';
    if (word.forgotCount >= 3 && word.streak < 3) return 'shaky';
    if (word.streak >= 5) return 'mastered';
    if (word.streak >= 3 || word.reviewCount >= 6) return 'familiar';
    if (word.streak === 0) return 'shaky';
    return 'learning';
  }

  /* apply one review result; returns a NEW word object (immutable update) */
  function applyResult(word, result, when = new Date()) {
    const today = Util.key(when);
    const w = { ...word, reviewCount: (word.reviewCount || 0) + 1, updatedAt: when.toISOString(), lastReviewedAt: when.toISOString() };
    if (result === 'remembered') {
      w.streak = (word.streak || 0) + 1;
      w.rememberedCount = (word.rememberedCount || 0) + 1;
      const idx = Math.min(w.streak - 1, INTERVALS.length - 1);
      w.nextReviewAt = Util.addDays(today, INTERVALS[idx]);
    } else {
      w.forgotCount = (word.forgotCount || 0) + 1;
      w.streak = 0;
      w.nextReviewAt = today; // comes back today
    }
    w.mastery = masteryOf(w);
    return w;
  }

  /* in-session re-queue: forgotten words reappear soon within the same session */
  function requeueInSession(queue, currentIdx, wordIds, maxRepeats = 2) {
    // count occurrences of each id already in queue (from this point on)
    const seen = {};
    for (let i = 0; i < queue.length; i++) {
      const id = queue[i];
      seen[id] = (seen[id] || 0) + 1;
    }
    const id = queue[currentIdx];
    if ((seen[id] || 0) > maxRepeats) return; // don't loop forever
    const insertAt = Math.min(currentIdx + 2 + Math.floor(Math.random() * 2), queue.length);
    queue.splice(insertAt, 0, id);
  }

  return { INTERVALS, MASTERY, MASTERY_ORDER, isDue, priority, masteryOf, applyResult, requeueInSession };
})();
