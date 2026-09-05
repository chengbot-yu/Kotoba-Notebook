/* ============================================================
   ことばノート — modals, toasts, forms (word add/edit/detail)
   ============================================================ */
const UIModal = (() => {
  let modalRoot = null;

  function init() {
    modalRoot = document.getElementById('modalRoot');
  }

  function esc(s) { return Util.esc(s); }

  function open(html) {
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `<div class="modal glass">${html}</div>`;
    wrap.addEventListener('click', e => { if (e.target === wrap) close(wrap); });
    modalRoot.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add('show'));
    return wrap;
  }

  function close(wrap) {
    if (!wrap) wrap = modalRoot.lastElementChild;
    if (!wrap) return;
    wrap.classList.remove('show');
    setTimeout(() => wrap.remove(), 200);
  }

  function toast(msg, type = 'info', ms = 2600) {
    let root = document.getElementById('toastRoot');
    if (!root) { root = document.createElement('div'); root.id = 'toastRoot'; document.body.appendChild(root); }
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.innerHTML = msg;
    root.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, ms);
  }

  function showUnlock(list) {
    if (!list || !list.length) return;
    const items = list.map(a => {
      const d = Achv.def(a.id);
      return `<div class="unlock-item"><span class="unlock-ico">${d.icon}</span><div><div class="unlock-name">${d.name}</div><div class="unlock-desc">${esc(d.desc)}</div></div></div>`;
    }).join('');
    const wrap = open(`
      <div class="unlock-modal">
        <div class="unlock-title">🏆 実績解除！</div>
        <div class="unlock-list">${items}</div>
        <button class="btn btn-primary" id="unlockOk">わかった</button>
      </div>
    `);
    wrap.querySelector('#unlockOk').addEventListener('click', () => close(wrap));
    wrap.classList.add('unlock-pop');
  }

  /* ---------- word form (add / edit) ---------- */
  function wordFormHtml(w) {
    const v = k => w ? esc(w[k] ?? '') : '';
    const tags = w ? (w.tags || []).join(', ') : '';
    return `
      <div class="modal-head">
        <h3>${w ? '単語を編集' : '＋ 今日の単語を追加'}</h3>
        <button class="modal-x" data-close>✕</button>
      </div>
      <form id="wordForm" class="word-form" autocomplete="off">
        <div class="f-row">
          <label class="f-label">単語 <em class="req">*</em></label>
          <input class="f-input" name="word" value="${v('word')}" placeholder="食べる" required>
        </div>
        <div class="f-grid">
          <div class="f-row">
            <label class="f-label">読み方</label>
            <input class="f-input" name="reading" value="${v('reading')}" placeholder="たべる">
          </div>
          <div class="f-row">
            <label class="f-label">品詞</label>
            <input class="f-input" name="partOfSpeech" value="${v('partOfSpeech')}" placeholder="動詞 / 名詞 …">
          </div>
          <div class="f-row">
            <label class="f-label">中国語訳</label>
            <input class="f-input" name="translation" value="${v('translation')}" placeholder="吃">
          </div>
          <div class="f-row">
            <label class="f-label">自他動詞</label>
            <input class="f-input" name="transitivity" value="${v('transitivity')}" placeholder="他動詞 / 自動詞 / 自他 …">
          </div>
        </div>
        <div class="f-row">
          <label class="f-label">例文</label>
          <input class="f-input" name="example" value="${v('example')}" placeholder="朝ご飯を食べる。">
        </div>
        <div class="f-row">
          <label class="f-label">メモ</label>
          <textarea class="f-input f-textarea" name="note" rows="2" placeholder="容易和 食う 混淆">${v('note')}</textarea>
        </div>
        <div class="f-row">
          <label class="f-label">タグ（カンマ区切り）</label>
          <input class="f-input" name="tags" value="${esc(tags)}" placeholder="JLPT N3, 生活, 重要">
        </div>
        <div class="f-checks">
          <label class="check"><input type="checkbox" name="important" ${w && w.important ? 'checked' : ''}> ⭐ 重要</label>
          <label class="check"><input type="checkbox" name="hard" ${w && w.hard ? 'checked' : ''}> 🌀 容易忘记</label>
        </div>
        ${w ? '' : '<p class="f-hint">最低限「単語」だけでも保存できます。後からいつでも編集できます。</p>'}
        <div class="modal-foot">
          <button type="button" class="btn btn-ghost" data-close>キャンセル</button>
          <button type="submit" class="btn btn-primary">保存</button>
        </div>
      </form>
    `;
  }

  function openWordModal(wordId) {
    const w = wordId ? Store.getWord(wordId) : null;
    const wrap = open(wordFormHtml(w));
    const form = wrap.querySelector('#wordForm');

    wrap.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => close(wrap)));

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(form);
      const fields = {
        word: fd.get('word'), reading: fd.get('reading'), partOfSpeech: fd.get('partOfSpeech'),
        translation: fd.get('translation'), transitivity: fd.get('transitivity'),
        example: fd.get('example'), note: fd.get('note'),
        tags: String(fd.get('tags') || '').split(/[,，]/).map(s => s.trim()).filter(Boolean),
        important: fd.get('important') === 'on', hard: fd.get('hard') === 'on',
      };
      if (!fields.word) { toast('単語を入力してください', 'warn'); return; }

      if (!w) {
        // duplicate check — user owns the data; we only warn, never silently merge
        const dup = Store.getWords().find(x => x.word.trim() === fields.word.trim());
        if (dup) { openDuplicateDialog(fields, dup, wrap); return; }
        await Store.addWord(fields);
        toast('✅ 保存しました');
      } else {
        await Store.updateWord(w.id, fields);
        toast('✅ 更新しました');
      }
      close(wrap);
      App.refresh();
    });
    // focus word field
    setTimeout(() => { const el = form.querySelector('[name="word"]'); if (el) el.focus(); }, 60);
  }

  /* duplicate: この単語はすでに登録されています */
  function openDuplicateDialog(fields, dup, sourceWrap) {
    const wrap = open(`
      <div class="modal-head"><h3>⚠️ この単語はすでに登録されています</h3><button class="modal-x" data-close>✕</button></div>
      <div class="dup-body">
        <p>「<b>${esc(fields.word)}</b>」はすでに登録されています。</p>
        <div class="dup-existing">
          <div class="dup-word">${esc(dup.word)}</div>
          ${dup.reading ? `<div class="dup-sub">${esc(dup.reading)}</div>` : ''}
          ${dup.translation ? `<div class="dup-sub">${esc(dup.translation)}</div>` : ''}
          <span class="tag">${dup.reviewCount}回復習</span>
          ${dup.nextReviewAt && dup.nextReviewAt <= Util.todayKey() ? '<span class="tag tag-due">待復習</span>' : ''}
        </div>
        <p class="f-hint">重複データを増やさず、既存の単語を編集することをおすすめします。</p>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" id="dupCancel" data-close>キャンセル</button>
        <button class="btn btn-ghost" id="dupView">元の単語を見る</button>
        <button class="btn btn-primary" id="dupForce">新しい記録として追加</button>
      </div>
    `);
    wrap.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => close(wrap)));
    wrap.querySelector('#dupCancel').addEventListener('click', () => close(wrap));
    wrap.querySelector('#dupView').addEventListener('click', () => { close(wrap); close(sourceWrap); App.navigate('words'); setTimeout(() => UIModal.openDetail(dup.id), 50); });
    wrap.querySelector('#dupForce').addEventListener('click', async () => {
      await Store.addWord(fields);
      close(wrap); close(sourceWrap);
      toast('✅ 保存しました');
      App.refresh();
    });
  }

  /* ---------- word detail ---------- */
  function openDetail(id) {
    const w = Store.getWord(id);
    if (!w) return;
    const due = w.nextReviewAt ? (w.nextReviewAt <= Util.todayKey() ? '待復習' : `次回 ${Util.formatDateShort(w.nextReviewAt)}`) : '未スケジュール';
    const last = w.lastReviewedAt ? Util.formatDateTime(w.lastReviewedAt) : '—';
    const m = SRS.MASTERY[w.mastery || 'new'] || SRS.MASTERY.new;
    const wrap = open(`
      <div class="modal-head">
        <h3>単語の詳細</h3>
        <button class="modal-x" data-close>✕</button>
      </div>
      <div class="detail-body">
        <div class="detail-main">
          <div class="detail-word">${esc(w.word)}</div>
          ${w.reading ? `<div class="detail-reading">${esc(w.reading)}</div>` : ''}
          <div class="detail-tags">
            ${w.partOfSpeech ? `<span class="tag">${esc(w.partOfSpeech)}</span>` : ''}
            ${w.transitivity ? `<span class="tag">${esc(w.transitivity)}</span>` : ''}
            ${w.important ? '<span class="tag tag-star">⭐ 重要</span>' : ''}
            ${w.hard ? '<span class="tag tag-hard">🌀 容易忘记</span>' : ''}
            ${(w.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('')}
          </div>
        </div>
        ${w.translation ? `<div class="detail-line"><span class="dl-label">中国語訳</span><span class="dl-val">${esc(w.translation)}</span></div>` : ''}
        ${w.example ? `<div class="detail-line"><span class="dl-label">例文</span><span class="dl-val">${esc(w.example)}</span></div>` : ''}
        ${w.note ? `<div class="detail-line"><span class="dl-label">メモ</span><span class="dl-val">${esc(w.note)}</span></div>` : ''}
        <div class="detail-grid">
          <div class="dg-item"><span class="dg-k">作成</span><span class="dg-v">${Util.formatDateShort(Util.key(new Date(w.createdAt)))}</span></div>
          <div class="dg-item"><span class="dg-k">最終復習</span><span class="dg-v">${esc(last)}</span></div>
          <div class="dg-item"><span class="dg-k">復習回数</span><span class="dg-v">${w.reviewCount || 0}</span></div>
          <div class="dg-item"><span class="dg-k">忘れた回数</span><span class="dg-v">${w.forgotCount || 0}</span></div>
          <div class="dg-item"><span class="dg-k">覚えた回数</span><span class="dg-v">${w.rememberedCount || 0}</span></div>
          <div class="dg-item"><span class="dg-k">次回</span><span class="dg-v ${w.nextReviewAt && w.nextReviewAt <= Util.todayKey() ? 'dg-due' : ''}">${esc(due)}</span></div>
          <div class="dg-item"><span class="dg-k">状態</span><span class="dg-v"><span class="mastery-chip mastery-${w.mastery || 'new'}">${m.label}</span></span></div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-danger-ghost" id="btnDelete">削除</button>
        <button class="btn btn-primary" id="btnEdit">編集</button>
        <button class="btn btn-ghost" data-close>閉じる</button>
      </div>
    `);
    wrap.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => close(wrap)));
    wrap.querySelector('#btnEdit').addEventListener('click', () => { close(wrap); openWordModal(id); });
    wrap.querySelector('#btnDelete').addEventListener('click', () => { close(wrap); confirmDelete(id); });
  }

  function confirmDelete(id) {
    const w = Store.getWord(id);
    if (!w) return;
    const wrap = open(`
      <div class="modal-head"><h3>単語を削除</h3><button class="modal-x" data-close>✕</button></div>
      <div class="dup-body">
        <p>「<b>${esc(w.word)}</b>」を削除しますか？</p>
        <p class="f-hint">この操作は取り消せません。復習履歴（統計）は保持されます。</p>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" data-close>キャンセル</button>
        <button class="btn btn-danger" id="delConfirm">削除する</button>
      </div>
    `);
    wrap.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => close(wrap)));
    wrap.querySelector('#delConfirm').addEventListener('click', async () => {
      await Store.deleteWord(id);
      close(wrap);
      toast('🗑️ 削除しました');
      App.refresh();
    });
  }

  return { init, open, close, toast, showUnlock, openWordModal, openDetail, confirmDelete, openDuplicateDialog };
})();
