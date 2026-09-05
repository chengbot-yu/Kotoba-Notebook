/* ============================================================
   ことばノート — review session engine

   Modes:
   - jp2cn : 見る:日本語 → 思い出す:中国語
   - cn2jp : 見る:中国語 → 思い出す:日本語
   - recall: 単語を思い出す（純粋な想起トレーニング）

   Forgotten words are re-queued a few positions ahead so the
   user immediately meets them again in the same session.
   ============================================================ */
const Review = (() => {
  let queue = [];       // word ids
  let idx = 0;
  let mode = 'jp2cn';
  let scope = 'due';    // 'due' | 'all'
  let active = false;
  let stats = { remembered: 0, forgotten: 0 };
  let root = null;      // DOM container

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function buildQueue(m, sc) {
    let list = sc === 'all' ? Store.getWords() : Store.dueQueue();
    if (m === 'recall') list = list.slice(0, 10);
    if (Store.settings.order === 'random') list = shuffle(list);
    return list.map(w => w.id);
  }

  function start(m, sc) {
    let mm = m || Store.settings.dir;
    if (mm === 'random') mm = Math.random() < 0.5 ? 'jp2cn' : 'cn2jp';
    mode = mm;
    scope = sc || 'due';
    queue = buildQueue(mode, scope);
    if (!queue.length) return false;
    idx = 0;
    active = true;
    stats = { remembered: 0, forgotten: 0 };
    return true;
  }

  function current() { return Store.getWord(queue[idx]); }

  function progress() { return { now: idx + 1, total: queue.length }; }

  function judge(result) {
    const w = current();
    if (!w) { idx++; return render(); }
    Store.recordReview(w.id, result, mode);
    stats[result === 'remembered' ? 'remembered' : 'forgotten']++;
    if (result === 'forgotten') SRS.requeueInSession(queue, idx, null);
    idx++;
    if (idx >= queue.length) { active = false; renderSummary(); }
    else render();
  }

  function setRoot(el) { root = el; }

  function promptFor(w) {
    if (mode === 'jp2cn') return { main: w.word, sub: w.reading ? `${w.reading}` : '', placeholder: '中国語の意味を入力', label: '日本語を見て、意味を思い出す' };
    if (mode === 'cn2jp') return { main: w.translation || w.word, sub: w.translation ? '' : '（翻訳未入力）', placeholder: '日本語を入力', label: '中国語を見て、日本語を思い出す' };
    return { main: w.word, sub: w.reading || '', placeholder: '', label: '単語の意味を思い出す' };
  }

  function render() {
    if (!root) return;
    const w = current();
    const p = progress();
    const pr = promptFor(w);
    const pct = Math.round((idx / queue.length) * 100);

    root.innerHTML = `
      <div class="review-top">
        <span class="review-label">${UI.esc(pr.label)}</span>
        <span class="review-count">第 ${p.now} / ${p.total}</span>
      </div>
      <div class="progress"><div class="progress-fill" style="width:${pct}%"></div></div>

      <div class="review-card glass" id="reviewCard">
        <div class="review-prompt">
          <div class="prompt-main">${UI.esc(pr.main)}</div>
          ${pr.sub ? `<div class="prompt-sub">${UI.esc(pr.sub)}</div>` : ''}
        </div>
        ${mode !== 'recall' ? `<input class="review-input" id="reviewInput" type="text" placeholder="${UI.esc(pr.placeholder)}" autocomplete="off" spellcheck="false">` : ''}
        <div class="review-actions" id="reviewActions">
          <button class="btn btn-ghost" id="btnReveal">答えを確認</button>
        </div>
        <div class="review-answer hidden" id="reviewAnswer"></div>
      </div>
    `;

    const revealBtn = root.querySelector('#btnReveal');
    if (revealBtn) revealBtn.addEventListener('click', () => reveal());
    const input = root.querySelector('#reviewInput');
    if (input) {
      input.focus();
      input.addEventListener('keydown', e => { if (e.key === 'Enter') reveal(); });
    }
  }

  function reveal() {
    const w = current();
    const card = root.querySelector('#reviewCard');
    const answer = root.querySelector('#reviewAnswer');
    const actions = root.querySelector('#reviewActions');
    if (!answer) return;

    const info = [
      w.word ? `<div class="ans-word">${UI.esc(w.word)}</div>` : '',
      w.reading ? `<div class="ans-reading">${UI.esc(w.reading)}</div>` : '',
      (w.partOfSpeech || w.transitivity) ? `<div class="ans-pos">${UI.esc([w.partOfSpeech, w.transitivity].filter(Boolean).join(' · '))}</div>` : '',
      w.translation ? `<div class="ans-trans">${UI.esc(w.translation)}</div>` : '',
      w.example ? `<div class="ans-example">${UI.esc(w.example)}</div>` : '',
      w.note ? `<div class="ans-note">📝 ${UI.esc(w.note)}</div>` : '',
      (w.tags || []).length ? `<div class="ans-tags">${w.tags.map(t => `<span class="tag">${UI.esc(t)}</span>`).join('')}</div>` : '',
    ].filter(Boolean).join('');

    answer.innerHTML = info || '<div class="ans-empty">（この単語に記録がありません）</div>';
    answer.classList.remove('hidden');
    actions.innerHTML = `
      <button class="btn btn-remember" id="btnRemember">覚えていた</button>
      <button class="btn btn-forget" id="btnForget">忘れていた</button>
    `;
    root.querySelector('#btnRemember').addEventListener('click', () => judge('remembered'));
    root.querySelector('#btnForget').addEventListener('click', () => judge('forgotten'));
    card.classList.add('revealed');
    actions.classList.add('judge-mode');
    actions.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function renderSummary() {
    if (!root) return;
    const due = Store.dashboard().dueCount;
    root.innerHTML = `
      <div class="review-summary glass">
        <div class="summary-emoji">${stats.forgotten === 0 ? '🎉' : '💪'}</div>
        <h2>復習完了！</h2>
        <div class="summary-stats">
          <div class="s-stat"><span class="s-num good">${stats.remembered}</span><span>覚えていた</span></div>
          <div class="s-stat"><span class="s-num warn">${stats.forgotten}</span><span>忘れていた</span></div>
          <div class="s-stat"><span class="s-num">${stats.remembered + stats.forgotten}</span><span>合計</span></div>
        </div>
        <p class="summary-note">${due > 0 ? `まだ待復習が ${due} 語あります` : '今日の待復習はすべて完了しました 🎊'}</p>
        <div class="summary-actions">
          <button class="btn btn-primary" id="btnAgain">もう一度復習</button>
          <button class="btn btn-ghost" id="btnHome">ホームへ</button>
        </div>
      </div>
    `;
    root.querySelector('#btnAgain').addEventListener('click', () => { start(mode, scope) && render(); });
    root.querySelector('#btnHome').addEventListener('click', () => App.navigate('home'));
  }

  function renderEmpty() {
    if (!root) return;
    root.innerHTML = `
      <div class="empty glass">
        <div class="empty-emoji">🌙</div>
        <h3>待復習はありません</h3>
        <p>今日の復習はすべて完了です。新しい単語を追加すると、明日また復習に出てきます。</p>
        <div class="empty-actions">
          <button class="btn btn-primary" id="btnPracticeAll">すべての単語から練習</button>
          <button class="btn btn-ghost" id="btnAddWord">＋ 単語を追加</button>
        </div>
      </div>
    `;
    root.querySelector('#btnPracticeAll').addEventListener('click', () => { if (start(mode, 'all')) render(); });
    root.querySelector('#btnAddWord').addEventListener('click', () => UI.openWordModal());
  }

  function renderStart() {
    if (!root) return;
    const due = Store.dashboard().dueCount;
    root.innerHTML = `
      <div class="view-head">
        <h1>復習</h1>
        <p class="view-sub">${due > 0 ? `今日の待復習：<b>${due}</b> 語` : '今日の待復習はありません'}</p>
      </div>
      <div class="review-start glass">
        <h3>トレーニングを選ぶ</h3>
        <div class="mode-grid">
          <button class="mode-card" data-mode="jp2cn">
            <div class="mode-ico">🇯🇵→🇨🇳</div>
            <div class="mode-name">日本語 → 中国語</div>
            <div class="mode-desc">単語を見て意味を思い出す</div>
          </button>
          <button class="mode-card" data-mode="cn2jp">
            <div class="mode-ico">🇨🇳→🇯🇵</div>
            <div class="mode-name">中国語 → 日本語</div>
            <div class="mode-desc">意味を見て単語を思い出す</div>
          </button>
          <button class="mode-card" data-mode="recall">
            <div class="mode-ico">🧠</div>
            <div class="mode-name">単語を思い出す</div>
            <div class="mode-desc">今日の復習枠・10語</div>
          </button>
        </div>
        <p class="mode-hint">設定 → 訓練方向・順序 を変更できます</p>
      </div>
    `;
    root.querySelectorAll('.mode-card').forEach(b => b.addEventListener('click', () => {
      const m = b.dataset.mode;
      if (start(m, 'due')) render();
      else renderEmpty();
    }));
  }

  function renderRoot() {
    if (!root) return;
    if (!active) renderStart();
    else render();
  }

  return { start, judge, render, renderRoot, renderEmpty, setRoot, progress, isActive: () => active };
})();
