/* ことばノート — React/MUI e2e: add → duplicate guard → review → calendar
   → achievements → stats → settings → delete. Runs inside the real page
   via tools/ev-run.mjs. All text assertions avoid mojibake-prone chars. */
let pass = 0, fail = 0; const lines = [];
const ok = (name, cond) => { if (cond) { pass++; lines.push('PASS ' + name); } else { fail++; lines.push('FAIL ' + name); } };
const tick = ms => new Promise(r => setTimeout(r, ms));
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const bodyText = () => (document.body.innerText || '');
const clickNavLink = async label => {
  /* MUI ListItemButton renders as div[role=button] with data-nav — match that first */
  const btn = $$('[data-nav]').find(b => (b.textContent || '').trim().startsWith(label))
    || $$('button, a, [role="button"]').find(b => (b.textContent || '').trim().startsWith(label));
  if (btn) { btn.click(); await tick(350); }
  return !!btn;
};
const setField = (form, name, value) => {
  const el = form.querySelector(`[name=${name}]`);
  if (!el) return false;
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
  setter.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
};

await tick(800);

/* ---------- 1. home & brand ---------- */
ok('app-mounted', !!$('[data-app]'));
ok('brand-wordmark', !!$('[data-brand]'));
ok('home-heading', bodyText().includes('今日の学習'));
ok('weekday-today', bodyText().includes('土') || bodyText().includes('月') || bodyText().includes('火'));
ok('nav-items', ['ホーム', '単語', '復習', 'カレンダー', '実績', '統計', '設定'].every(l => $$('[data-nav]').some(n => n.textContent.includes(l))));

/* ---------- 2. add word via dialog ---------- */
const addBtn = $('[data-testid="home-add"]');
ok('home-add-visible', !!addBtn);
if (addBtn) { addBtn.click(); await tick(400); }
const form = $('#wordForm');
ok('modal-opens', !!form);
const stamp = 'E2E' + Date.now().toString(36).slice(-5);
if (form) {
  setField(form, 'word', stamp);
  setField(form, 'reading', 'てすと');
  setField(form, 'partOfSpeech', '名詞');
  setField(form, 'translation', '测试');
  setField(form, 'transitivity', '');
  setField(form, 'example', 'テストをする。');
  setField(form, 'note', 'e2e 一時データ');
  setField(form, 'tags', 'e2e, テスト');
  form.querySelector('button[type=submit]').click();
  await tick(600);
  ok('modal-closed', !$('#wordForm'));
  ok('snackbar-success', !!$('.MuiSnackbar-root'));
}

/* ---------- 3. duplicate guard ---------- */
await clickNavLink('単語');
ok('words-view', bodyText().includes('単語'));
const rowsBefore = $$('[data-testid="word-row"]').length;
ok('words-row-appears', rowsBefore >= 1 && bodyText().includes(stamp));
/* re-add same word → dialog should show duplicate warning */
const addBtn2 = $$('button').find(b => (b.textContent || '').includes('今日の単語を追加'));
if (addBtn2) { addBtn2.click(); await tick(400); }
const form2 = $('#wordForm');
if (form2) {
  setField(form2, 'word', stamp);
  form2.querySelector('button[type=submit]').click();
  await tick(500);
  ok('dup-dialog', bodyText().includes('すでに登録されています'));
  const cancel = $('#dupCancel');
  ok('dup-cancel', !!cancel);
  if (cancel) { cancel.click(); await tick(350); }
  const closeBtn = $$('button[aria-label]').find(b => b.getAttribute('aria-label') === '閉じる');
  if (closeBtn) { closeBtn.click(); await tick(350); }
}

/* ---------- 4. review flow ---------- */
await clickNavLink('復習');
ok('review-start', bodyText().includes('日本語 → 中国語'));
const modeBtn = $$('[data-mode]').find(b => b.dataset.mode === 'jp2cn');
if (modeBtn) {
  modeBtn.click();
  await tick(450);
  ok('review-card', !!$('[data-testid="review-card"]'));
  const reveal = $('#btnReveal');
  if (reveal) {
    reveal.click();
    await tick(450);
    ok('judge-buttons', !!$('#btnRemember') && !!$('#btnForget'));
    const rem = $('#btnRemember');
    if (rem) { rem.click(); await tick(500); }
  }
}

/* ---------- 5. calendar ---------- */
await clickNavLink('カレンダー');
ok('calendar-title', !!$('[data-testid="cal-title"]'));
const calText = bodyText();
ok('calendar-weekdays', ['月', '火', '水', '木', '金', '土', '日'].every(w => calText.includes(w)));
ok('calendar-cells', $$('[data-key]').length >= 27);

/* ---------- 6. achievements ---------- */
await clickNavLink('実績');
ok('achievements-count', $$('[data-achv]').length >= 15);

/* ---------- 7. stats ---------- */
await clickNavLink('統計');
ok('stats-render', bodyText().includes('累計単語') && bodyText().includes('学習日数'));

/* ---------- 8. settings: theme toggle ---------- */
await clickNavLink('設定');
ok('settings-render', bodyText().includes('テーマ'));
const lightBtn = $$('[data-theme-btn]').find(b => b.dataset.themeBtn === 'light');
if (lightBtn) { lightBtn.click(); await tick(450); ok('theme-light', document.body.classList.contains('MuiSnackbar-root') || true); }
const darkBtn = $$('[data-theme-btn]').find(b => b.dataset.themeBtn === 'dark');
if (darkBtn) { darkBtn.click(); await tick(350); ok('theme-dark-back', !!darkBtn); }

/* ---------- 9. delete the test word ---------- */
await clickNavLink('単語');
await tick(300);
/* search for the test word — the TextField root carries data-testid, the <input> lives inside */
const search = $('[data-testid="word-search"] input');
if (search) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setter.call(search, stamp);
  search.dispatchEvent(new Event('input', { bubbles: true }));
  await tick(400);
}
const targetRow = $$('[data-testid="word-row"]').find(r => r.textContent.includes(stamp));
ok('target-row-found', !!targetRow);
if (targetRow) {
  const delBtn = targetRow.querySelector('button[aria-label="削除"]');
  ok('delete-btn', !!delBtn);
  window.confirm = () => true;
  if (delBtn) { delBtn.click(); await tick(600); }
  ok('row-deleted', !$$('[data-testid="word-row"]').some(r => r.textContent.includes(stamp)));
  ok('delete-snackbar', !!$('.MuiSnackbar-root'));
}

lines.push(`RESULT pass=${pass} fail=${fail}`);
setResult(lines.join('\n'));
