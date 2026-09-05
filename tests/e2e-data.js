/* ============================================================
   ことばノート — browser data-layer e2e (real IndexedDB)
   Run twice with the same profile:
     ?mode=seed    → build data (add/edit/review/achievements/export)
     ?mode=verify  → check persistence + import/delete/clear
   ============================================================ */
(async () => {
  const out = document.getElementById('out');
  let pass = 0, fail = 0;
  const ok = (name, cond, msg = '') => {
    if (cond) { pass++; out.textContent += 'PASS ' + name + '\n'; }
    else { fail++; out.textContent += 'FAIL ' + name + (msg ? ' :: ' + msg : '') + '\n'; }
  };
  const mode = new URLSearchParams(location.search).get('mode');
  out.textContent += 'START mode=' + mode + ' time=' + new Date().toISOString() + '\n';

  window.addEventListener('error', e => { fail++; out.textContent += 'FAIL window.error :: ' + e.message + '\n'; });
  window.addEventListener('unhandledrejection', e => { fail++; out.textContent += 'FAIL unhandledrejection :: ' + (e.reason && e.reason.message || e.reason) + '\n'; });

  try {
    out.textContent += 'INIT begin\n';
    await Store.init();
    out.textContent += 'INIT done\n';

    if (mode === 'seed') {
      await Store.clearAll();
      ok('clear-start', Store.getWords().length === 0);

      const w = await Store.addWord({ word: '食べる', reading: 'たべる', partOfSpeech: '動詞', translation: '吃', transitivity: '他動詞', example: '朝ご飯を食べる。', note: '容易和 食う 混淆', tags: ['JLPT N3', '生活'], important: false, hard: false });
      ok('add-word-fields', !!w && w.word === '食べる' && w.reading === 'たべる' && w.partOfSpeech === '動詞' && w.translation === '吃' && w.transitivity === '他動詞' && w.example.includes('朝ご飯') && w.note.includes('食う') && w.tags.length === 2 && w.mastery === 'new');
      ok('word-count-1', Store.getWords().length === 1);
      const d0 = Store.dashboard();
      ok('today-new-1', d0.today.newWords === 1, JSON.stringify(d0.today));
      ok('streak-1', d0.streak === 1);
      ok('due-1', d0.dueCount === 1);

      // review: forgotten
      const w2 = await Store.recordReview(w.id, 'forgotten', 'jp2cn');
      ok('forgotten-due-today', w2.nextReviewAt === Util.todayKey());
      ok('forgot-count-1', w2.forgotCount === 1 && w2.streak === 0);
      ok('review-recorded-1', Store.getReviews().length === 1 && Store.getReviews()[0].result === 'forgotten');
      ok('achv-first-word', Store.getAchievements().find(a => a.id === 'first-word').unlocked);
      ok('achv-review-1', Store.getAchievements().find(a => a.id === 'review-1').unlocked);

      // review: remembered → interval 1 day
      const w3 = await Store.recordReview(w.id, 'remembered', 'jp2cn');
      ok('remembered-interval-1', w3.nextReviewAt === Util.addDays(Util.todayKey(), 1), w3.nextReviewAt);
      ok('mastery-learning', w3.mastery === 'learning', w3.mastery);
      ok('today-review-2', Store.dashboard().today.reviewCount === 2);

      // edit (important flag + translation)
      const w4 = await Store.updateWord(w.id, { translation: '吃（食べる）', important: true });
      ok('edit-word', w4.translation === '吃（食べる）' && w4.important === true);

      // 9 more words → 10 total → words-10 achievement
      for (let i = 2; i <= 10; i++) await Store.addWord({ word: '単語' + i, translation: '訳' + i });
      ok('words-10', Store.getWords().length === 10);
      ok('achv-words-10', Store.getAchievements().find(a => a.id === 'words-10').unlocked);

      const exp = JSON.parse(JSON.stringify(Store.exportData()));
      ok('export-shape', exp.app === 'kotoba-notebook' && exp.words.length === 10 && exp.reviews.length === 2 && exp.studyDays.length === 1);
      localStorage.setItem('e2e-export', JSON.stringify(exp));
      out.textContent += 'SEED_DONE\n';
    } else if (mode === 'verify') {
      // persistence check after reload (same profile)
      const words = Store.getWords();
      ok('persist-words-10', words.length === 10, 'got ' + words.length);
      const taberu = words.find(x => x.word === '食べる');
      ok('persist-taberu', !!taberu);
      ok('persist-fields', !!taberu && taberu.reading === 'たべる' && taberu.transitivity === '他動詞' && taberu.partOfSpeech === '動詞' && taberu.important === true && taberu.translation === '吃（食べる）');
      ok('persist-review-state', !!taberu && taberu.reviewCount === 2 && taberu.forgotCount === 1 && taberu.rememberedCount === 1 && taberu.mastery === 'learning');
      const days = Store.getStudyDays();
      ok('persist-study-days', days.length === 1 && days[0].newWords === 10 && days[0].reviewCount === 2, JSON.stringify(days));
      ok('persist-reviews', Store.getReviews().length === 2);
      ok('persist-achievements', Store.getAchievements().filter(a => a.unlocked).length >= 3);
      ok('persist-due', Store.dashboard().dueCount >= 9);

      // import (merge) adds an 11th word — build backup from CURRENT live data
      const exp = Store.exportData();
      exp.words.push({ ...exp.words[0], id: 'imported-1', word: 'インポート語' });
      await Store.importData(exp, 'merge');
      ok('import-merge', Store.getWords().some(x => x.word === 'インポート語'));
      ok('import-merge-count', Store.getWords().length === 11);

      // delete
      await Store.deleteWord('imported-1');
      ok('delete-word', !Store.getWord('imported-1') && Store.getWords().length === 10);

      // import replace
      await Store.importData(exp, 'replace');
      ok('import-replace', Store.getWords().length === 11 && Store.getWords().some(x => x.word === 'インポート語'));
      ok('import-replace-no-dup', Store.getWords().filter(x => x.word === '食べる').length === 1);

      // clear
      await Store.clearAll();
      ok('clear-all', Store.getWords().length === 0 && Store.getReviews().length === 0 && Store.getStudyDays().length === 0 && Store.getAchievements().filter(a => a.unlocked).length === 0);
      out.textContent += 'VERIFY_DONE\n';
    } else {
      fail++;
      out.textContent += 'FAIL unknown mode ' + mode + '\n';
    }
  } catch (e) {
    fail++;
    out.textContent += 'FAIL exception :: ' + (e && (e.stack || e.message) || e) + '\n';
  }
  out.textContent += 'RESULT pass=' + pass + ' fail=' + fail + '\n';
})();
