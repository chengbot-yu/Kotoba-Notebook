/* ============================================================
   ことばノート — views: home / words / calendar / achievements /
   stats / settings  (rendered into static sections in index.html)
   ============================================================ */
const UI = (() => {
  const esc = s => Util.esc(s);
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  /* filter state for words view */
  const wordFilter = { q: '', status: 'all', date: 'all', pos: 'all', trans: 'all', tag: 'all', due: false, sort: 'new' };

  /* ---------- shared bits ---------- */
  function masteryChip(m) {
    const def = SRS.MASTERY[m || 'new'];
    return `<span class="mastery-chip mastery-${m || 'new'}">${def.label}</span>`;
  }
  function tagHtml(t) { return `<span class="tag">${esc(t)}</span>`; }
  function statCard(icon, label, value, sub = '') {
    return `<div class="stat-card glass"><div class="stat-ico">${icon}</div><div class="stat-body"><div class="stat-val">${value}</div><div class="stat-label">${esc(label)}</div>${sub ? `<div class="stat-sub">${sub}</div>` : ''}</div></div>`;
  }
  function emptyState(emoji, title, sub, actions = '') {
    return `<div class="empty glass"><div class="empty-emoji">${emoji}</div><h3>${esc(title)}</h3><p>${esc(sub)}</p>${actions ? `<div class="empty-actions">${actions}</div>` : ''}</div>`;
  }
  function pageHead(title, sub = '') {
    return `<div class="view-head"><h1>${esc(title)}</h1>${sub ? `<p class="view-sub">${sub}</p>` : ''}</div>`;
  }

  /* ---------- HOME ---------- */
  function renderHome(root) {
    const d = Store.dashboard();
    const today = Util.todayKey();
    const wk = Util.weekdayKanji(today);
    const words = Store.getWords();

    if (!words.length) {
      root.innerHTML = `
        ${pageHead('今日の学習', `${Util.formatDateJP(today)} <span class="wk-badge">${wk}</span>`)}
        ${emptyState('🌱', 'まだ単語がありません', '今日から始めよう。最初の1語を記録して、あなただけの単語帳をつくりましょう。', `
          <button class="btn btn-primary" id="homeAdd1">＋ 今日の単語を追加</button>
        `)}
      `;
      root.querySelector('#homeAdd1')?.addEventListener('click', () => UIModal.openWordModal());
      return;
    }

    const nextAchv = nextTarget();
    const todayWords = words.filter(w => Util.key(new Date(w.createdAt)) === today).slice(0, 8);
    const duePreview = Store.dueQueue().slice(0, 5);
    const goalPct = Math.min(100, Math.round(((d.today.newWords + d.today.reviewCount) / Math.max(1, Store.settings.goal)) * 100));

    root.innerHTML = `
      ${pageHead('今日の学習', `${Util.formatDateJP(today)} <span class="wk-badge">${wk}</span>`)}
      ${d.dueCount > 0 ? `<div class="banner glass"><span class="banner-ico">🔔</span><span>今日の待復習は <b>${d.dueCount}</b> 語あります</span></div>` : ''}
      <div class="home-cta">
        <button class="btn btn-primary btn-lg" id="homeAdd">＋ 今日の単語を追加</button>
        <button class="btn btn-accent btn-lg" id="homeReview">復習を始める</button>
      </div>
      <div class="stat-grid">
        ${statCard('🆕', '今日新增', d.today.newWords)}
        ${statCard('🔁', '今日復習', d.today.reviewCount)}
        ${statCard('🔥', '連続学習', `${d.streak}日`, d.streak > 0 ? '継続中' : '今日から始めよう')}
        ${statCard('📚', '総単語数', Util.fmt(d.totalWords))}
        ${statCard('⏳', '待復習', d.dueCount, '今日の分')}
        ${statCard('🎯', '今日の目標', `${d.today.newWords + d.today.reviewCount}/${Store.settings.goal}`, goalPct >= 100 ? '達成！' : `あと ${Store.settings.goal - (d.today.newWords + d.today.reviewCount)} で達成`)}
      </div>
      <div class="home-grid">
        <div class="panel glass">
          <div class="panel-head"><h3>今日記録した単語</h3><button class="link-btn" id="homeSeeAll">すべて見る →</button></div>
          ${todayWords.length ? `<div class="chip-list">${todayWords.map(w => `<button class="word-chip" data-id="${w.id}">${esc(w.word)}${w.reading ? `<i>${esc(w.reading)}</i>` : ''}</button>`).join('')}</div>` : '<p class="panel-empty">今日はまだ記録していません</p>'}
        </div>
        <div class="panel glass">
          <div class="panel-head"><h3>待復習プレビュー</h3><button class="link-btn" id="homeGoReview">復習へ →</button></div>
          ${duePreview.length ? `<div class="due-list">${duePreview.map(w => `<button class="due-row" data-id="${w.id}"><span class="due-word">${esc(w.word)}</span><span class="due-trans">${esc(w.translation || '')}</span>${w.important ? '<span class="mini-star">⭐</span>' : ''}</button>`).join('')}</div>` : '<p class="panel-empty">待復習なし。よくできました！</p>'}
        </div>
      </div>
      ${nextAchv ? `
        <div class="panel glass next-target">
          <div class="panel-head"><h3>🏆 次の目標</h3></div>
          <div class="nt-row">
            <div class="nt-info"><div class="nt-name">${nextAchv.icon} ${esc(nextAchv.name)}</div><div class="nt-desc">${esc(nextAchv.desc)}</div></div>
            <div class="nt-remain">あと <b>${nextAchv.remain}</b> ${nextAchv.unit}</div>
          </div>
          <div class="goal-bar-wrap"><div class="goal-bar" style="width:${nextAchv.pct}%"></div></div>
        </div>` : ''}
      <div class="panel glass recent-achv">
        <div class="panel-head"><h3>最近の実績</h3><button class="link-btn" id="homeGoAchv">実績一覧 →</button></div>
        <div id="recentAchvList"></div>
      </div>
    `;

    root.querySelector('#homeAdd')?.addEventListener('click', () => UIModal.openWordModal());
    root.querySelector('#homeAdd1')?.addEventListener('click', () => UIModal.openWordModal());
    root.querySelector('#homeReview')?.addEventListener('click', () => App.navigate('review'));
    root.querySelector('#homeSeeAll')?.addEventListener('click', () => App.navigate('words'));
    root.querySelector('#homeGoReview')?.addEventListener('click', () => App.navigate('review'));
    root.querySelector('#homeGoAchv')?.addEventListener('click', () => App.navigate('achievements'));
    root.querySelectorAll('.word-chip, .due-row').forEach(b => b.addEventListener('click', () => UIModal.openDetail(b.dataset.id)));

    const recent = Store.getAchievements().filter(a => a.unlocked).sort((a, b) => (b.unlockedAt || '').localeCompare(a.unlockedAt || '')).slice(0, 3);
    const listEl = root.querySelector('#recentAchvList');
    if (listEl) listEl.innerHTML = recent.length
      ? recent.map(a => `<div class="achv-mini"><span class="achv-mini-ico">${a.icon}</span><div><div class="achv-mini-name">${esc(a.name)}</div><div class="achv-mini-date">${Util.formatDateShort(Util.key(new Date(a.unlockedAt)))}</div></div></div>`).join('')
      : '<p class="panel-empty">まだ実績はありません。最初の1語を記録しましょう。</p>';
  }

  function nextTarget() {
    const cur = Store.dashboard().streak;
    const thresholds = [3, 7, 14, 30, 100];
    const t = thresholds.find(x => x > cur);
    if (!t) return null;
    return { name: `${t}日連続`, icon: '🔥', desc: `${t}日連続で学習`, remain: t - cur, unit: '日', pct: Math.min(100, Math.round(cur / t * 100)) };
  }

  /* ---------- WORDS ---------- */
  function distinct(values) { return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ja')); }

  function filteredWords() {
    let list = Store.getWords().slice();
    const q = wordFilter.q.trim().toLowerCase();
    if (q) {
      list = list.filter(w =>
        w.word.toLowerCase().includes(q) ||
        (w.reading || '').toLowerCase().includes(q) ||
        (w.translation || '').toLowerCase().includes(q) ||
        (w.note || '').toLowerCase().includes(q) ||
        (w.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }
    if (wordFilter.status !== 'all') list = list.filter(w => (w.mastery || 'new') === wordFilter.status);
    const today = Util.todayKey();
    if (wordFilter.date === 'today') list = list.filter(w => Util.key(new Date(w.createdAt)) === today);
    if (wordFilter.date === 'week') { const ws = Util.weekStartKey(today); list = list.filter(w => Util.dateInWeek(Util.key(new Date(w.createdAt)), ws)); }
    if (wordFilter.date === 'month') list = list.filter(w => Util.key(new Date(w.createdAt)).startsWith(today.slice(0, 7)));
    if (wordFilter.pos !== 'all') list = list.filter(w => w.partOfSpeech === wordFilter.pos);
    if (wordFilter.trans !== 'all') list = list.filter(w => w.transitivity === wordFilter.trans);
    if (wordFilter.tag !== 'all') list = list.filter(w => (w.tags || []).includes(wordFilter.tag));
    if (wordFilter.due) list = list.filter(w => SRS.isDue(w, today));
    if (wordFilter.sort === 'new') list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (wordFilter.sort === 'old') list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    if (wordFilter.sort === 'due') list.sort((a, b) => (a.nextReviewAt || '9999').localeCompare(b.nextReviewAt || '9999'));
    if (wordFilter.sort === 'alpha') list.sort((a, b) => a.word.localeCompare(b.word, 'ja'));
    return list;
  }

  function renderWords(root) {
    const words = Store.getWords();
    const today = Util.todayKey();
    if (!words.length) {
      root.innerHTML = `
        ${pageHead('単語', 'あなたの単語帳')}
        ${emptyState('📖', 'まだ単語がありません', '「＋ 今日の単語を追加」から最初の1語を記録しましょう。', `<button class="btn btn-primary" id="wAdd1">＋ 今日の単語を追加</button>`)}
      `;
      root.querySelector('#wAdd1')?.addEventListener('click', () => UIModal.openWordModal());
      return;
    }

    const posOptions = distinct(words.map(w => w.partOfSpeech));
    const transOptions = distinct(words.map(w => w.transitivity));
    const tagOptions = distinct(words.flatMap(w => w.tags || []));
    const list = filteredWords();

    root.innerHTML = `
      ${pageHead('単語', `全 ${Util.fmt(words.length)} 語`)}
      <div class="toolbar glass">
        <input class="f-input search-input" id="wSearch" type="search" placeholder="検索：単語・読み・訳・タグ・メモ" value="${esc(wordFilter.q)}">
        <select class="f-input f-select" id="wStatus">
          <option value="all">状態：すべて</option>
          ${SRS.MASTERY_ORDER.map(m => `<option value="${m}" ${wordFilter.status === m ? 'selected' : ''}>${SRS.MASTERY[m].label}</option>`).join('')}
        </select>
        <select class="f-input f-select" id="wDate">
          <option value="all">日付：すべて</option>
          <option value="today" ${wordFilter.date === 'today' ? 'selected' : ''}>今日</option>
          <option value="week" ${wordFilter.date === 'week' ? 'selected' : ''}>今週</option>
          <option value="month" ${wordFilter.date === 'month' ? 'selected' : ''}>今月</option>
        </select>
        <select class="f-input f-select" id="wPos">
          <option value="all">品詞：すべて</option>
          ${posOptions.map(p => `<option value="${esc(p)}" ${wordFilter.pos === p ? 'selected' : ''}>${esc(p)}</option>`).join('')}
        </select>
        <select class="f-input f-select" id="wTrans">
          <option value="all">自他：すべて</option>
          ${transOptions.map(p => `<option value="${esc(p)}" ${wordFilter.trans === p ? 'selected' : ''}>${esc(p)}</option>`).join('')}
        </select>
        <select class="f-input f-select" id="wTag">
          <option value="all">タグ：すべて</option>
          ${tagOptions.map(t => `<option value="${esc(t)}" ${wordFilter.tag === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}
        </select>
        <select class="f-input f-select" id="wSort">
          <option value="new" ${wordFilter.sort === 'new' ? 'selected' : ''}>新しい順</option>
          <option value="old" ${wordFilter.sort === 'old' ? 'selected' : ''}>古い順</option>
          <option value="due" ${wordFilter.sort === 'due' ? 'selected' : ''}>復習期限順</option>
          <option value="alpha" ${wordFilter.sort === 'alpha' ? 'selected' : ''}>五十音順</option>
        </select>
        <label class="check toolbar-check"><input type="checkbox" id="wDue" ${wordFilter.due ? 'checked' : ''}> 待復習のみ</label>
      </div>
      <div class="words-result">${list.length ? `${Util.fmt(list.length)} 件` : '該当なし'}</div>
      <div class="word-list" id="wordList">
        ${list.map(w => {
          const due = SRS.isDue(w, today);
          return `
          <button class="word-card glass" data-id="${w.id}">
            <div class="wc-main">
              <div class="wc-word">${esc(w.word)}${w.important ? '<span class="mini-star">⭐</span>' : ''}${w.hard ? '<span class="mini-hard">🌀</span>' : ''}</div>
              ${w.reading ? `<div class="wc-reading">${esc(w.reading)}</div>` : ''}
            </div>
            <div class="wc-mid">
              ${w.translation ? `<div class="wc-trans">${esc(w.translation)}</div>` : ''}
              <div class="wc-tags">
                ${w.partOfSpeech ? `<span class="tag">${esc(w.partOfSpeech)}</span>` : ''}
                ${w.transitivity ? `<span class="tag">${esc(w.transitivity)}</span>` : ''}
                ${(w.tags || []).slice(0, 3).map(t => `<span class="tag">${esc(t)}</span>`).join('')}
              </div>
            </div>
            <div class="wc-side">
              ${masteryChip(w.mastery || 'new')}
              ${due ? '<span class="tag tag-due">待復習</span>' : ''}
              <span class="wc-count">${w.reviewCount || 0}回</span>
            </div>
          </button>`;
        }).join('')}
      </div>
    `;

    const onSearch = () => { wordFilter.q = root.querySelector('#wSearch').value; renderWords(root); };
    root.querySelector('#wSearch').addEventListener('input', debounce(onSearch, 150));
    root.querySelector('#wStatus').addEventListener('change', e => { wordFilter.status = e.target.value; renderWords(root); });
    root.querySelector('#wDate').addEventListener('change', e => { wordFilter.date = e.target.value; renderWords(root); });
    root.querySelector('#wPos').addEventListener('change', e => { wordFilter.pos = e.target.value; renderWords(root); });
    root.querySelector('#wTrans').addEventListener('change', e => { wordFilter.trans = e.target.value; renderWords(root); });
    root.querySelector('#wTag').addEventListener('change', e => { wordFilter.tag = e.target.value; renderWords(root); });
    root.querySelector('#wSort').addEventListener('change', e => { wordFilter.sort = e.target.value; renderWords(root); });
    root.querySelector('#wDue').addEventListener('change', e => { wordFilter.due = e.target.checked; renderWords(root); });
    root.querySelectorAll('.word-card').forEach(b => b.addEventListener('click', () => UIModal.openDetail(b.dataset.id)));
  }

  let debounceT = null;
  function debounce(fn, ms) { return (...a) => { clearTimeout(debounceT); debounceT = setTimeout(() => fn(...a), ms); }; }

  /* ---------- CALENDAR ---------- */
  let calYear = new Date().getFullYear();
  let calMonth = new Date().getMonth() + 1;
  let calSelected = Util.todayKey();

  function renderCalendar(root) {
    const studyDays = App.getStudyDays();
    const cells = Stats.calendarMonth(studyDays, calYear, calMonth);
    const today = Util.todayKey();
    const sel = calSelected;
    const selRec = studyDays.find(d => d.date === sel);
    const selWords = Store.getWords().filter(w => Util.key(new Date(w.createdAt)) === sel);
    const selStreak = Stats.streakEndingAt(studyDays, sel);
    const weekRow = Util.WEEK_MON.map(w => `<span class="cal-wk">${w}</span>`).join('');

    root.innerHTML = `
      ${pageHead('カレンダー', '学習のあしあと')}
      <div class="cal-layout">
        <div class="cal-wrap glass">
          <div class="cal-head">
            <button class="cal-nav" id="calPrev">‹</button>
            <div class="cal-title">${calYear}年${calMonth}月</div>
            <button class="cal-nav" id="calNext">›</button>
          </div>
          <div class="cal-week">${weekRow}</div>
          <div class="cal-grid">
            ${cells.map(c => c.key
              ? `<button class="cal-cell level-${c.level} ${c.key > today ? 'is-future' : ''} ${c.key === today ? 'is-today' : ''} ${c.key === sel ? 'is-sel' : ''}" data-key="${c.key}"><span class="cal-day">${c.day}</span>${c.level > 0 ? `<i class="cal-dot"></i>` : ''}</button>`
              : '<span class="cal-cell cal-empty"></span>').join('')}
          </div>
        </div>
        <div class="cal-detail glass" id="calDetail">
          <div class="cd-head">
            <div class="cd-date">${Util.formatDateJP(sel)} <span class="wk-badge">${Util.weekdayKanji(sel)}</span></div>
            ${sel === today ? '<span class="tag tag-due">今日</span>' : ''}
          </div>
          ${selRec ? `
            <div class="cd-stats">
              <div class="cd-stat"><span class="cd-n">${selRec.newWords || 0}</span><span>新增</span></div>
              <div class="cd-stat"><span class="cd-n">${selRec.reviewCount || 0}</span><span>復習</span></div>
              <div class="cd-stat"><span class="cd-n">${selStreak}</span><span>連続（この日時点）</span></div>
            </div>
          ` : '<p class="panel-empty">この日は学習記録がありません</p>'}
          ${selWords.length ? `<div class="cd-words"><div class="cd-words-title">この日に記録した単語（${selWords.length}）</div><div class="chip-list">${selWords.map(w => `<button class="word-chip" data-id="${w.id}">${esc(w.word)}${w.reading ? `<i>${esc(w.reading)}</i>` : ''}</button>`).join('')}</div></div>` : ''}
        </div>
      </div>
      <div class="cal-legend">
        <span class="lg-item"><span class="lg-cell level-0"></span>0</span>
        <span class="lg-item"><span class="lg-cell level-1"></span>1–5</span>
        <span class="lg-item"><span class="lg-cell level-2"></span>6–10</span>
        <span class="lg-item"><span class="lg-cell level-3"></span>11–20</span>
        <span class="lg-item"><span class="lg-cell level-4"></span>20+</span>
        <span class="lg-item"><span class="lg-cell lg-today"></span>今日</span>
      </div>
    `;
    root.querySelector('#calPrev').addEventListener('click', () => { calMonth--; if (calMonth < 1) { calMonth = 12; calYear--; } renderCalendar(root); });
    root.querySelector('#calNext').addEventListener('click', () => { calMonth++; if (calMonth > 12) { calMonth = 1; calYear++; } renderCalendar(root); });
    root.querySelectorAll('.cal-cell[data-key]').forEach(b => b.addEventListener('click', () => { calSelected = b.dataset.key; renderCalendar(root); }));
    root.querySelectorAll('.cd-words .word-chip').forEach(b => b.addEventListener('click', () => UIModal.openDetail(b.dataset.id)));
  }

  /* ---------- ACHIEVEMENTS ---------- */
  function renderAchievements(root) {
    const list = Store.getAchievements();
    const unlockedCount = list.filter(a => a.unlocked).length;
    root.innerHTML = `
      ${pageHead('実績', `${unlockedCount} / ${list.length} 解除済み`)}
      <div class="achv-grid">
        ${list.map(a => `
          <div class="achv-card glass ${a.unlocked ? 'unlocked' : 'locked'}">
            <div class="achv-ico">${a.unlocked ? a.icon : '🔒'}</div>
            <div class="achv-name">${esc(a.name)}</div>
            <div class="achv-desc">${esc(a.desc)}</div>
            ${a.unlocked ? `<div class="achv-date">${Util.formatDateJP(Util.key(new Date(a.unlockedAt)))}</div>` : ''}
          </div>`).join('')}
      </div>
    `;
  }

  /* ---------- STATS ---------- */
  function renderStats(root) {
    const d = Store.dashboard();
    const today = Util.todayKey();
    const studyDays = App.getStudyDays();
    const words = Store.getWords();

    // last 7 days
    const days7 = [];
    for (let i = 6; i >= 0; i--) {
      const k = Util.addDays(today, -i);
      const rec = studyDays.find(x => x.date === k);
      days7.push({ k, wk: Util.weekdayKanji(k), rec });
    }
    const max7 = Math.max(1, ...days7.map(x => (x.rec ? x.rec.newWords + x.rec.reviewCount : 0)));
    // last 30 days
    const days30 = [];
    for (let i = 29; i >= 0; i--) {
      const k = Util.addDays(today, -i);
      const rec = studyDays.find(x => x.date === k);
      days30.push({ k, rec });
    }
    const max30 = Math.max(1, ...days30.map(x => (x.rec ? x.rec.newWords + x.rec.reviewCount : 0)));

    const monthRatio = d.month.newWords + d.month.reviewCount;
    const newPct = monthRatio ? Math.round(d.month.newWords / monthRatio * 100) : 0;

    const ws = Stats.weekTotals(studyDays, today).weekStart;
    root.innerHTML = `
      ${pageHead('統計', 'あなたの学習データ')}
      <div class="stat-grid">
        ${statCard('📚', '累計単語', Util.fmt(d.totalWords))}
        ${statCard('📅', '学習日数', d.studyDays)}
        ${statCard('🏔️', '最長連続', `${d.longest}日`)}
        ${statCard('🔁', '累計復習', Util.fmt(d.totalReviews))}
        ${statCard('📈', '今週新增', d.week.newWords, `${Util.formatDateShort(ws)} 〜`)}
        ${statCard('🔁', '今週復習', d.week.reviewCount)}
        ${statCard('📥', '今月新增', d.month.newWords)}
        ${statCard('🏋️', '今月復習', d.month.reviewCount)}
      </div>
      <div class="chart-grid">
        <div class="panel glass">
          <div class="panel-head"><h3>過去7日間の学習量</h3></div>
          <div class="bars bars-7">
            ${days7.map(x => {
              const v = x.rec ? x.rec.newWords + x.rec.reviewCount : 0;
              const nv = x.rec ? x.rec.newWords : 0;
              const rv = x.rec ? x.rec.reviewCount : 0;
              return `<div class="bar-col"><div class="bar-track"><div class="bar-stack" style="height:${Math.round(v / max7 * 100)}%"><div class="bar-new" style="height:${nv ? Math.round(nv / v * 100) : 0}%"></div><div class="bar-review" style="height:${rv ? Math.round(rv / v * 100) : 0}%"></div></div></div><div class="bar-label">${x.wk}</div><div class="bar-val">${v || ''}</div></div>`;
            }).join('')}
          </div>
          <div class="chart-legend"><span><i class="lg-new"></i>新增</span><span><i class="lg-review"></i>復習</span></div>
        </div>
        <div class="panel glass">
          <div class="panel-head"><h3>過去30日間</h3></div>
          <div class="bars bars-30">
            ${days30.map(x => {
              const v = x.rec ? x.rec.newWords + x.rec.reviewCount : 0;
              return `<div class="bar-col" title="${Util.formatDateShort(x.k)}：${v}"><div class="bar-track"><div class="bar-stack" style="height:${Math.round(v / max30 * 100)}%"></div></div></div>`;
            }).join('')}
          </div>
        </div>
      </div>
      <div class="panel glass">
        <div class="panel-head"><h3>今月の新增 / 復習バランス</h3></div>
        <div class="ratio-bar"><div class="ratio-new" style="width:${newPct}%"></div></div>
        <div class="ratio-labels"><span>🆕 新增 ${d.month.newWords}（${newPct}%）</span><span>🔁 復習 ${d.month.reviewCount}（${100 - newPct}%）</span></div>
      </div>
    `;
  }

  /* ---------- SETTINGS ---------- */
  function renderSettings(root) {
    const s = Store.settings;
    const storageInfo = (() => {
      try { return indexedDB && indexedDB.open ? 'IndexedDB（ブラウザ内に保存）' : 'localStorage（フォールバック）'; } catch (e) { return 'localStorage（フォールバック）'; }
    })();
    root.innerHTML = `
      ${pageHead('設定', 'アプリの設定とデータ管理')}
      <div class="settings-stack">
        <div class="panel glass">
          <div class="panel-head"><h3>テーマ</h3></div>
          <div class="seg">
            <button class="seg-btn ${s.theme === 'dark' ? 'on' : ''}" data-theme="dark">🌙 ダーク</button>
            <button class="seg-btn ${s.theme === 'light' ? 'on' : ''}" data-theme="light">☀️ ライト</button>
          </div>
        </div>
        <div class="panel glass">
          <div class="panel-head"><h3>トレーニング設定</h3></div>
          <div class="set-row">
            <label class="set-label">既定の訓練方向</label>
            <select class="f-input f-select" id="setDir">
              <option value="jp2cn" ${s.dir === 'jp2cn' ? 'selected' : ''}>日本語 → 中国語</option>
              <option value="cn2jp" ${s.dir === 'cn2jp' ? 'selected' : ''}>中国語 → 日本語</option>
              <option value="random" ${s.dir === 'random' ? 'selected' : ''}>ランダム</option>
            </select>
          </div>
          <div class="set-row">
            <label class="set-label">復習の順序</label>
            <select class="f-input f-select" id="setOrder">
              <option value="random" ${s.order === 'random' ? 'selected' : ''}>ランダム</option>
              <option value="sequential" ${s.order === 'sequential' ? 'selected' : ''}>順番どおり</option>
            </select>
          </div>
          <div class="set-row">
            <label class="set-label">1日の目標（単語＋復習）</label>
            <select class="f-input f-select" id="setGoal">
              ${[5, 10, 20, 30, 50].map(g => `<option value="${g}" ${s.goal === g ? 'selected' : ''}>${g}語</option>`).join('')}
            </select>
          </div>
          <div class="set-row">
            <label class="check"><input type="checkbox" id="setNotify" ${s.notify ? 'checked' : ''}> 開いたとき待復習があれば通知する</label>
            <button class="btn btn-ghost btn-sm" id="setNotifyPerm">通知権限を確認</button>
          </div>
        </div>
        <div class="panel glass">
          <div class="panel-head"><h3>データ管理</h3></div>
          <p class="set-note">保存先：${storageInfo}。データはこのブラウザ内にのみ保存されます。バックアップを定期的にエクスポートしてください。</p>
          <div class="set-row set-btns">
            <button class="btn btn-primary" id="btnExport">⬇️ データをエクスポート</button>
            <button class="btn btn-ghost" id="btnImport">⬆️ データをインポート</button>
            <button class="btn btn-danger-ghost" id="btnClear">🗑️ すべてのデータを消去</button>
          </div>
          <input type="file" id="importFile" accept=".json,application/json" hidden>
        </div>
        <div class="panel glass">
          <div class="panel-head"><h3>アプリについて</h3></div>
          <p class="set-note">ことばノート v1.0 — あなた自身の日本語単語帳。<br>すべての単語データ・学習記録はあなたのブラウザ内（IndexedDB）に保存され、外部に送信されません。</p>
        </div>
      </div>
    `;

    root.querySelectorAll('.seg-btn').forEach(b => b.addEventListener('click', () => {
      Store.patchSettings({ theme: b.dataset.theme });
      App.applyTheme();
      renderSettings(root);
    }));
    root.querySelector('#setDir').addEventListener('change', e => Store.patchSettings({ dir: e.target.value }));
    root.querySelector('#setOrder').addEventListener('change', e => Store.patchSettings({ order: e.target.value }));
    root.querySelector('#setGoal').addEventListener('change', e => Store.patchSettings({ goal: Number(e.target.value) }));
    root.querySelector('#setNotify').addEventListener('change', e => {
      Store.patchSettings({ notify: e.target.checked });
      if (e.target.checked && 'Notification' in window && Notification.permission === 'default') Notification.requestPermission();
    });
    root.querySelector('#setNotifyPerm').addEventListener('click', async () => {
      if (!('Notification' in window)) { UIModal.toast('このブラウザは通知に対応していません', 'warn'); return; }
      const p = await Notification.requestPermission();
      UIModal.toast(p === 'granted' ? '✅ 通知が許可されました' : '通知は許可されませんでした', p === 'granted' ? 'info' : 'warn');
    });
    root.querySelector('#btnExport').addEventListener('click', () => exportBackup());
    root.querySelector('#btnImport').addEventListener('click', () => root.querySelector('#importFile').click());
    root.querySelector('#importFile').addEventListener('change', e => { const f = e.target.files[0]; if (f) importBackup(f); e.target.value = ''; });
    root.querySelector('#btnClear').addEventListener('click', () => confirmClear());
  }

  function exportBackup() {
    const data = Store.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kotoba-backup-${Util.todayKey()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    UIModal.toast('✅ エクスポートしました');
  }

  function importBackup(file) {
    const reader = new FileReader();
    reader.onload = async () => {
      let obj;
      try { obj = JSON.parse(reader.result); } catch (e) { UIModal.toast('❌ JSONとして読み込めませんでした', 'warn'); return; }
      const wrap = UIModal.open(`
        <div class="modal-head"><h3>データをインポート</h3><button class="modal-x" data-close>✕</button></div>
        <div class="dup-body">
          <p>「<b>${esc(file.name)}</b>」を読み込みます。</p>
          <p class="f-hint">${obj.words ? `${obj.words.length} 語・${obj.reviews ? obj.reviews.length : 0} 件の復習記録` : ''}</p>
          <p class="f-hint"><b>置換</b>：現在のデータをすべて消してから読み込みます。<br><b>マージ</b>：現在のデータに統合します（ID重複は上書き）。</p>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" data-close>キャンセル</button>
          <button class="btn btn-ghost" id="impMerge">マージ</button>
          <button class="btn btn-primary" id="impReplace">置換して読込</button>
        </div>
      `);
      wrap.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => UIModal.close(wrap)));
      wrap.querySelector('#impMerge').addEventListener('click', async () => { UIModal.close(wrap); await doImport(obj, 'merge'); });
      wrap.querySelector('#impReplace').addEventListener('click', async () => { UIModal.close(wrap); await doImport(obj, 'replace'); });
    };
    reader.readAsText(file);
  }

  async function doImport(obj, mode) {
    try {
      await Store.importData(obj, mode);
      App.refresh();
      UIModal.toast('✅ インポートしました');
    } catch (e) {
      UIModal.toast(`❌ ${esc(e.message || 'インポートに失敗')}`, 'warn');
    }
  }

  function confirmClear() {
    const wrap = UIModal.open(`
      <div class="modal-head"><h3>すべてのデータを消去</h3><button class="modal-x" data-close>✕</button></div>
      <div class="dup-body">
        <p>単語・復習記録・学習記録・実績を<b>すべて削除</b>します。この操作は取り消せません。</p>
        <p class="f-hint">安全のため、下の入力欄に「<b>削除</b>」と入力してください。</p>
        <input class="f-input" id="clearType" placeholder="削除">
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" data-close>キャンセル</button>
        <button class="btn btn-danger" id="clearGo" disabled>すべて消去</button>
      </div>
    `);
    wrap.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => UIModal.close(wrap)));
    const input = wrap.querySelector('#clearType');
    const go = wrap.querySelector('#clearGo');
    input.addEventListener('input', () => { go.disabled = input.value.trim() !== '削除'; });
    go.addEventListener('click', async () => {
      await Store.clearAll();
      UIModal.close(wrap);
      App.refresh();
      UIModal.toast('🗑️ すべてのデータを消去しました');
    });
  }

  return {
    renderHome, renderWords, renderCalendar, renderAchievements, renderStats, renderSettings,
    masteryChip, statCard, emptyState, esc, pageHead,
    openWordModal: UIModal.openWordModal,
    openDetail: UIModal.openDetail,
    toast: UIModal.toast,
  };
})();
