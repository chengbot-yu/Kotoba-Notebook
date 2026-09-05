/* ============================================================
   ことばノート — shared utilities: dates, ids, formatting
   Weekday display is ALWAYS: 月 火 水 木 金 土 日  (never Mon/一)
   ============================================================ */
const Util = (() => {
  const WEEK = ['日', '月', '火', '水', '木', '金', '土']; // index = getDay() (0=Sun)
  const WEEK_MON = ['月', '火', '水', '木', '金', '土', '日']; // Monday-first display

  const pad = n => String(n).padStart(2, '0');

  /* Local date key YYYY-MM-DD */
  function key(d = new Date()) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  function todayKey() { return key(); }
  function parseKey(k) {
    const [y, m, d] = String(k).split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  function addDays(k, n) {
    const d = parseKey(k);
    d.setDate(d.getDate() + n);
    return key(d);
  }
  function weekdayKanji(k) { return WEEK[parseKey(k).getDay()]; }
  function weekdayKanjiOf(date) { return WEEK[date.getDay()]; }
  function weekdayKanjiFromIndex(i) { return WEEK[i]; }

  /* Monday-based week start key */
  function weekStartKey(k) {
    const d = parseKey(k);
    const offset = (d.getDay() + 6) % 7; // Mon=0
    d.setDate(d.getDate() - offset);
    return key(d);
  }
  function dateInWeek(k, weekStartK) {
    const d = parseKey(k), w = parseKey(weekStartK);
    return d >= w && d <= addDays(weekStartK, 6);
  }

  function formatDateJP(k) {
    const d = parseKey(k);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  }
  function formatDateShort(k) {
    const d = parseKey(k);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }
  function formatDateTime(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function timeLabel(iso) {
    const d = new Date(iso);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function uid(prefix = 'id') {
    return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
  }

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function fmt(n) { return Number(n || 0).toLocaleString('en-US'); }

  /* hour bucket: morning (5-11), night (22-4) — used by achievements */
  function periodOf(date = new Date()) {
    const h = date.getHours();
    if (h >= 5 && h < 11) return 'morning';
    if (h >= 22 || h < 5) return 'night';
    return 'day';
  }

  return { WEEK, WEEK_MON, key, todayKey, parseKey, addDays, weekdayKanji, weekdayKanjiOf, weekdayKanjiFromIndex, weekStartKey, dateInWeek, formatDateJP, formatDateShort, formatDateTime, timeLabel, uid, esc, fmt, periodOf };
})();
