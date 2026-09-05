/* ことばノート — scale test phase 2: runs AFTER the driver reloaded the page
   (so the app booted with the 500 seeded words). Walks every view, measures
   render + search, checks overflow, then wipes all seeded data. */
const tick = ms => new Promise(r => setTimeout(r, ms));
const $$ = s => Array.from(document.querySelectorAll(s));
const N = Math.max(1, Math.min(500, Number(new URLSearchParams(location.search).get('n')) || 500));
const nav = async v => { location.hash = v; await tick(450); };
const setInput = (el, v) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setter.call(el, v);
  el.dispatchEvent(new Event('input', { bubbles: true }));
};
const overflow = () => document.documentElement.scrollWidth - document.documentElement.clientWidth;

function openDb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('kotoba-notebook');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function clearStores() {
  const db = await openDb();
  for (const s of ['words', 'reviews', 'studyDays', 'achievements']) {
    await new Promise((res, rej) => {
      const tx = db.transaction(s, 'readwrite');
      tx.objectStore(s).clear();
      tx.oncomplete = res;
      tx.onerror = () => rej(tx.error);
    });
  }
}
async function countWords() {
  const db = await openDb();
  return new Promise((res, rej) => {
    const tx = db.transaction('words', 'readonly');
    const rq = tx.objectStore('words').count();
    rq.onsuccess = () => res(rq.result);
    rq.onerror = () => rej(rq.error);
  });
}

const lines = [];
let pass = 0, fail = 0;
const ok = (name, cond, msg = '') => { if (cond) { pass++; lines.push('PASS ' + name); } else { fail++; lines.push('FAIL ' + name + (msg ? ' :: ' + msg : '')); } };

ok('app-reboot', !!document.querySelector('[data-app]'));

/* ---------- home ---------- */
await nav('home');
const homeRows = $$('[data-testid="home-word-row"]').length;
ok('home-renders', document.body.innerText.includes('今日の学習'));
ok('home-today-rows', homeRows > 0 && homeRows <= 8, 'rows=' + homeRows);

/* ---------- words: full 500-row list render ---------- */
await nav('words');
let t = performance.now();
const rowCount = $$('[data-testid="word-row"]').length;
const listMs = Math.round(performance.now() - t);
ok('words-N-rows', rowCount === N, 'rows=' + rowCount);
ok('words-render-fast', listMs < 1500, 'ms=' + listMs);
lines.push(`words view: ${rowCount} rows in ${listMs}ms after nav`);

/* ---------- search ---------- */
const search = document.querySelector('[data-testid="word-search"] input');
ok('search-exists', !!search);
if (search) {
  t = performance.now();
  setInput(search, '見');
  await tick(400);
  const hit = $$('[data-testid="word-row"]').length;
  const searchMs = Math.round(performance.now() - t);
  ok('search-hits', hit > 0 && hit < N, 'hits=' + hit);
  ok('search-fast', searchMs < 800, 'ms=' + searchMs);
  lines.push(`search 見: ${hit} rows in ${searchMs}ms`);
  setInput(search, '存在しない词xyz');
  await tick(400);
  ok('search-empty-state', $$('[data-testid="word-row"]').length === 0 && document.body.innerText.includes('条件に一致する単語はありません'));
  setInput(search, '');
  await tick(300);
}

/* ---------- review ---------- */
await nav('review');
const reviewText = document.body.innerText;
const m = reviewText.match(/今日の待復習[：:]\s*(\d+)/);
ok('review-due-count', !!m && Number(m[1]) > 0, 'got=' + (m && m[1]));
ok('review-modes', !!document.querySelector('[data-mode="jp2cn"]'));

/* ---------- calendar ---------- */
await nav('calendar');
const cells = $$('[data-key]');
ok('calendar-cells', cells.length >= 28, 'cells=' + cells.length);
/* the seeded range covers the last 60 days, so only the days of the current
   month that fall inside it can be painted — assert today's cell is painted */
const pad = n => String(n).padStart(2, '0');
const todayKey = (() => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; })();
const todayCell = cells.find(c => c.getAttribute('data-key') === todayKey);
ok('calendar-today-painted', !!todayCell && (() => {
  const bg = getComputedStyle(todayCell).backgroundColor;
  return bg && bg !== 'rgba(0, 0, 0, 0)' && !bg.endsWith(', 0)');
})(), 'cell=' + !!todayCell);

/* ---------- stats ---------- */
await nav('stats');
const statsText = document.body.innerText;
ok('stats-render', statsText.includes('累計単語') && statsText.includes(String(N)), statsText.slice(0, 80).replace(/\n/g, ' '));
const bars = $$('[title]').filter(e => /^20\d\d-/.test(e.getAttribute('title'))).length;
ok('stats-30d-bars', bars >= 28, 'bars=' + bars);

/* ---------- achievements ---------- */
await nav('achievements');
const unlocked = $$('[data-achv]').filter(a => a.textContent.includes('✓')).length;
ok('achv-many-unlocked', unlocked >= 3, 'unlocked=' + unlocked);

/* ---------- overflow ---------- */
const ov = overflow();
ok('no-horizontal-scroll', ov <= 0, 'overflowPx=' + ov);

/* ---------- cleanup: wipe seeded data ---------- */
await clearStores();
const remaining = await countWords();
ok('cleanup-empty', remaining === 0, 'remaining=' + remaining);

lines.push(`RESULT pass=${pass} fail=${fail}`);
setResult(lines.join('\n'));
