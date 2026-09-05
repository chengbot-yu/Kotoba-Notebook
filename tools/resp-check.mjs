/* ============================================================
   ことばノート — responsive overflow check (no deps).
   Usage: node resp-check.mjs <url> [waitMs]
   For each viewport width (320..1920) and each view, asserts
   document.documentElement.scrollWidth <= clientWidth, and that
   the add-word Dialog fits at narrow widths.
   ============================================================ */
import { spawn } from 'node:child_process';
import path from 'node:path';

const CHROME = process.env.KOTOBA_CHROME || (process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe') : 'chrome');
const url = process.argv[2];
const waitMs = Number(process.argv[3] || 2600);

const port = 10500 + Math.floor(Math.random() * 300);
const profile = `${process.env.TEMP || '/tmp'}/kotoba-resp-profile`;
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--hide-scrollbars', '--window-size=1440,900', '--force-device-scale-factor=1',
  '--remote-debugging-port=' + port, '--user-data-dir=' + profile, 'about:blank',
], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJson = async (p, init) => { const r = await fetch(`http://127.0.0.1:${port}${p}`, init); return r.json(); };

let ws = null, id = 0;
const pending = new Map();
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const mid = ++id;
    pending.set(mid, { resolve, reject });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
}
async function evalJs(expression) {
  const res = await send('Runtime.evaluate', { expression, returnByValue: true });
  return res?.result?.value;
}

const WIDTHS = [320, 375, 390, 430, 768, 1024, 1440, 1920];
const VIEWS = ['home', 'words', 'review', 'calendar', 'achievements', 'stats', 'settings'];

async function main() {
  let ok = false;
  for (let i = 0; i < 50; i++) { try { await getJson('/json/version'); ok = true; break; } catch { await sleep(200); } }
  if (!ok) throw new Error('devtools unreachable');
  const tab = await getJson('/json/new?' + encodeURIComponent(url), { method: 'PUT' });
  ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id).resolve(m.result); pending.delete(m.id); }
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await sleep(waitMs);

  const problems = [];
  const report = [];
  for (const w of WIDTHS) {
    const h = w <= 430 ? 740 : 900;
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w <= 430 });
    await send('Page.reload');
    await sleep(2200);
    for (const v of VIEWS) {
      await evalJs(`location.hash = '${v}'`);
      await sleep(350);
      const ov = await evalJs(`document.documentElement.scrollWidth - document.documentElement.clientWidth`);
      if (ov > 0) problems.push(`${w}px #${v} overflow ${ov}px`);
      report.push(`${w} ${v}: ${ov <= 0 ? 'ok' : 'OVERFLOW+' + ov}`);
    }
    /* dialog fit check at the two narrowest widths */
    if (w === 320 || w === 390) {
      await evalJs(`location.hash = 'home'`);
      await sleep(300);
      await evalJs(`document.querySelector('[data-testid="home-add"]')?.click()`);
      await sleep(600);
      const fit = await evalJs(`(() => {
        const dlg = document.querySelector('[data-testid="word-dialog"] .MuiDialog-paper, .MuiDialog-paper');
        if (!dlg) return 'no-dialog';
        const r = dlg.getBoundingClientRect();
        return (r.left >= -1 && r.right <= innerWidth + 1 && r.width <= innerWidth) ? 'fits' : 'overflow ' + Math.round(r.right - innerWidth);
      })()`);
      if (fit !== 'fits') problems.push(`${w}px dialog ${fit}`);
      report.push(`${w} dialog: ${fit}`);
      await evalJs(`document.querySelector('[data-testid="word-dialog"] [aria-label="閉じる"], .MuiDialog-root [aria-label="閉じる"]')?.click()`);
      await sleep(300);
    }
  }

  console.log('=== RESP CHECK ===');
  console.log(report.join('\n'));
  console.log('=== PROBLEMS (' + problems.length + ') ===');
  problems.forEach(p => console.log('BAD ' + p));
  console.log(problems.length === 0 ? 'RESP_RESULT: PASS' : 'RESP_RESULT: FAIL');
  ws.close();
  chrome.kill();
  process.exit(problems.length === 0 ? 0 : 1);
}

main().catch(e => { console.error('resp-check failed: ' + e.message); try { chrome.kill(); } catch {} process.exit(2); });
