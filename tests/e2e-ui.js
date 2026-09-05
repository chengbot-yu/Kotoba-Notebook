/* ============================================================
   ことばノート — browser UI e2e (drives the real index.html in
   an iframe: add / duplicate / review / calendar / achievements /
   stats / detail-edit / settings)
   ============================================================ */
(async () => {
  const out = document.getElementById('out');
  let pass = 0, fail = 0, errs = 0;
  const ok = (name, cond, msg = '') => {
    if (cond) { pass++; out.textContent += 'PASS ' + name + '\n'; }
    else { fail++; out.textContent += 'FAIL ' + name + (msg ? ' :: ' + msg : '') + '\n'; }
  };
  const tick = (ms = 90) => new Promise(r => setTimeout(r, ms));

  const iframe = document.getElementById('app');
  const W = iframe.contentWindow;
  let D = iframe.contentDocument;

  W.addEventListener('error', e => { errs++; out.textContent += 'ERR window.error :: ' + e.message + '\n'; });
  W.addEventListener('unhandledrejection', e => { errs++; out.textContent += 'ERR unhandledrejection :: ' + (e.reason && e.reason.message || e.reason) + '\n'; });

  try {
    // poll until the real app document is present (iframes may fire an early blank load)
    let loaded = false;
    for (let i = 0; i < 100; i++) {
      D = iframe.contentDocument;
      if (D && D.getElementById('view-home') && W.eval('typeof Store !== "undefined" && typeof App !== "undefined"')) { loaded = true; break; }
      await tick(100);
    }
    ok('app-loaded', loaded);
    await tick(150); // let async init finish

    const g = name => W.eval(name); // const-declared names live in the page's global lexical scope
    const Store = g('Store'), UI = g('UI'), UIModal = g('UIModal'), App = g('App'), Review = g('Review'), Util = g('Util');

    // clean slate
    await Store.init();
    await Store.clearAll();
    App.navigate('home'); // re-render with empty data
    await tick(150);

    ok('boot-home-empty', D.getElementById('view-home').textContent.includes('まだ単語がありません'));

    /* ---- 1. add word via the real modal form ---- */
    UI.openWordModal();
    await tick(80);
    let form = D.getElementById('wordForm');
    ok('modal-opens', !!form);
    if (form) {
      form.querySelector('[name=word]').value = '食べる';
      form.querySelector('[name=reading]').value = 'たべる';
      form.querySelector('[name=partOfSpeech]').value = '動詞';
      form.querySelector('[name=translation]').value = '吃';
      form.querySelector('[name=transitivity]').value = '他動詞';
      form.querySelector('[name=example]').value = '朝ご飯を食べる。';
      form.querySelector('[name=note]').value = '容易和 食う 混淆';
      form.querySelector('[name=tags]').value = 'JLPT N3, 生活';
      form.querySelector('[name=important]').checked = true;
      form.requestSubmit();
      await tick(150); await tick(150);
    }
    ok('word-added-via-ui', Store.getWords().length === 1);
    ok('modal-closed', !D.getElementById('wordForm'));
    ok('fields-saved', Store.getWords()[0].reading === 'たべる' && Store.getWords()[0].transitivity === '他動詞' && Store.getWords()[0].important === true && Store.getWords()[0].tags.length === 2);
    ok('home-shows-today', D.getElementById('view-home').textContent.includes('今日新增') && D.getElementById('view-home').textContent.includes('1'));
    ok('home-no-empty', !D.getElementById('view-home').textContent.includes('まだ単語がありません'));

    /* ---- 2. duplicate dialog ---- */
    UI.openWordModal();
    await tick(80);
    form = D.getElementById('wordForm');
    form.querySelector('[name=word]').value = '食べる';
    form.requestSubmit();
    await tick(150);
    ok('dup-dialog', D.body.textContent.includes('この単語はすでに登録されています'));
    const dupCancel = D.getElementById('dupCancel');
    ok('dup-cancel-exists', !!dupCancel);
    dupCancel.click();
    await tick(250); // modal close animation
    ok('dup-cancel-no-add', Store.getWords().length === 1);
    ok('dup-cancel-form-kept', !!D.getElementById('wordForm')); // cancelling returns to the form (good UX)

    // submit the SAME (kept) form again → dup dialog → force add as new record
    form = D.getElementById('wordForm');
    form.requestSubmit();
    await tick(150);
    D.getElementById('dupForce').click();
    await tick(300); // wait for both modals to close (200ms removal)
    ok('dup-force-added', Store.getWords().length === 2);
    ok('dup-force-modals-closed', D.querySelectorAll('.modal').length === 0, 'modals=' + D.querySelectorAll('.modal').length);

    /* ---- 3. review session via real clicks ---- */
    App.navigate('review');
    await tick(120);
    ok('review-mode-cards', !!D.querySelector('.mode-card[data-mode="jp2cn"]'));
    D.querySelector('.mode-card[data-mode="jp2cn"]').click();
    await tick(150);
    ok('review-prompt-word', D.querySelector('.prompt-main') && !!D.querySelector('.prompt-main').textContent.trim());
    // first card → 忘れていた
    D.getElementById('btnReveal').click();
    await tick(100);
    ok('answer-revealed', !!D.getElementById('btnForget') && !!D.getElementById('btnRemember'));
    D.getElementById('btnForget').click();
    await tick(150);
    // finish the rest as 覚えていた
    let guard = 0;
    while (!D.getElementById('btnAgain') && guard < 20) {
      if (D.getElementById('btnReveal')) D.getElementById('btnReveal').click();
      await tick(80);
      const rem = D.getElementById('btnRemember');
      if (rem) rem.click();
      await tick(120);
      guard++;
    }
    ok('review-summary', !!D.getElementById('btnAgain'));
    ok('review-stats-recorded', Store.getReviews().length >= 3);
    ok('forgot-flag', Store.getWords().some(x => x.forgotCount >= 1));
    ok('remembered-scheduled', Store.getWords().every(x => x.reviewCount >= 1 && !!x.nextReviewAt));
    const forgotWord = Store.getWords().find(x => x.forgotCount >= 1);
    // 忘记后在同会话中回炉 → 再次判定为覚えていた → 下次复习延后到明天
    ok('forgot-then-remember-scheduled', forgotWord && forgotWord.nextReviewAt === Util.addDays(Util.todayKey(), 1), 'got ' + (forgotWord && forgotWord.nextReviewAt));

    /* ---- 4. calendar ---- */
    App.navigate('calendar');
    await tick(150);
    const wkText = D.querySelector('.cal-week').textContent.replace(/\s/g, '');
    ok('calendar-weekday-kanji', wkText === '月火水木金土日', wkText);
    ok('calendar-no-mon', !D.body.textContent.includes('Mon') && wkText.indexOf('一') === -1);
    const todayCell = D.querySelector('.cal-cell.is-today');
    ok('calendar-today-cell', !!todayCell);
    todayCell.click();
    await tick(120);
    ok('calendar-day-detail', D.getElementById('calDetail').textContent.includes('新增'));
    ok('calendar-streak', D.getElementById('calDetail').textContent.includes('連続'));

    /* ---- 5. achievements ---- */
    App.navigate('achievements');
    await tick(120);
    ok('achv-first-unlocked', D.body.textContent.includes('初めの一歩'));
    const unlockedCards = D.querySelectorAll('.achv-card.unlocked').length;
    ok('achv-unlocked-cards', unlockedCards >= 2, 'unlocked=' + unlockedCards);

    /* ---- 6. stats ---- */
    App.navigate('stats');
    await tick(120);
    ok('stats-page', D.getElementById('view-stats').textContent.includes('累計単語') && D.getElementById('view-stats').textContent.includes('学習日数'));

    /* ---- 7. word detail + edit ---- */
    const first = Store.getWords()[0];
    const orderDump = Store.getWords().map(w => w.word + '[' + w.reading + '|' + w.id.slice(0, 4) + ']').join(' , ');
    ok('words-order', Store.getWords().length === 2, orderDump);
    const foundProbe = W.eval('(() => { const w = Store.getWord(' + JSON.stringify(first.id) + '); return w ? "found:" + w.reading : "missing"; })()');
    ok('getword-probe', foundProbe.startsWith('found:'), 'probe=' + foundProbe);
    UI.openDetail(first.id);
    await tick(120);
    ok('detail-shows', D.body.textContent.includes('単語の詳細') && D.body.textContent.includes(first.word));
    const detailWord = D.querySelector('.detail-word');
    ok('detail-word-match', detailWord && detailWord.textContent === '食べる', 'got=' + (detailWord && detailWord.textContent));
    D.getElementById('btnEdit').click();
    await tick(300); // detail modal closes after 200ms; edit modal opens
    const forms = [...D.querySelectorAll('#wordForm')];
    form = forms.length ? forms[forms.length - 1] : null; // topmost (edit) form
    const modalTitles = [...D.querySelectorAll('.modal h3')].map(h => h.textContent);
    ok('edit-form-opens', !!form, 'titles=' + JSON.stringify(modalTitles));
    ok('edit-form-prefilled', !!form && form.querySelector('[name=reading]').value === first.reading, 'expected=' + first.reading + ' got=' + (form ? form.querySelector('[name=reading]').value : 'no-form') + ' titles=' + JSON.stringify(modalTitles));
    if (form) {
      form.querySelector('[name=translation]').value = '吃（更新）';
      form.requestSubmit();
      await tick(200);
    }
    const afterEdit = Store.getWord(first.id);
    ok('edit-saved', afterEdit && afterEdit.translation === '吃（更新）', 'got=' + (afterEdit && afterEdit.translation));

    /* ---- 8. settings theme ---- */
    App.navigate('settings');
    await tick(120);
    const lightBtn = D.querySelector('.seg-btn[data-theme="light"]');
    ok('settings-rendered', !!lightBtn);
    // dispatch the click from inside the page realm
    const inPageTheme = W.eval(`(() => { const b = document.querySelector('.seg-btn[data-theme="light"]'); if (!b) return 'no-btn'; b.click(); return Store.settings.theme; })()`);
    ok('theme-click-in-page', inPageTheme === 'light', 'inPage=' + inPageTheme);
    if (lightBtn) lightBtn.click(); // parent-realm click
    await tick(150);
    const themeAfter = W.eval('Store.settings.theme');
    ok('theme-light', D.body.classList.contains('light'), 'classes=' + D.body.className + ' theme=' + themeAfter + ' inPage=' + inPageTheme);
    const darkBtn = D.querySelector('.seg-btn[data-theme="dark"]');
    if (darkBtn) darkBtn.click();
    await tick(150);
    ok('theme-dark', !D.body.classList.contains('light'), 'classes=' + D.body.className);

    /* ---- 9. words view search ---- */
    App.navigate('words');
    await tick(120);
    const search = D.getElementById('wSearch');
    search.value = '食べ';
    search.dispatchEvent(new Event('input'));
    await tick(250);
    ok('search-finds', D.querySelectorAll('.word-card').length === 2, 'cards=' + D.querySelectorAll('.word-card').length);
    const search2 = D.getElementById('wSearch'); // re-rendered toolbar → re-query
    search2.value = '不存在词xyz';
    search2.dispatchEvent(new Event('input'));
    await tick(250);
    ok('search-empty', D.querySelectorAll('.word-card').length === 0 && D.getElementById('view-words').textContent.includes('該当なし'), 'cards=' + D.querySelectorAll('.word-card').length);

    ok('no-console-errors', errs === 0, 'errs=' + errs);
  } catch (e) {
    fail++;
    out.textContent += 'FAIL exception :: ' + (e && (e.stack || e.message) || e) + '\n';
  }
  out.textContent += 'RESULT pass=' + pass + ' fail=' + fail + ' errs=' + errs + ' DONE\n';
})();
