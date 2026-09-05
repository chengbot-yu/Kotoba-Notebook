/* ============================================================
   Minimal CDP driver (no deps) for headless-Chrome tests.
   Usage: node cdp-run.mjs <url> <__WAITTEXT__> [timeoutMs] [outHtmlFile]
   Polls `#out` textContent until it contains __WAITTEXT__ (or timeout),
   prints console errors, exits 0 on success.
   ============================================================ */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { writeFileSync } from 'node:fs';

const CHROME = process.env.KOTOBA_CHROME || (process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe') : 'chrome');
const url = process.argv[2];
const __WAITTEXT__ = process.argv[3] || 'DONE';
const timeoutMs = Number(process.argv[4] || 45000);
const outHtml = process.argv[5];

const port = 9333 + Math.floor(Math.random() * 500);
const profile = `${process.env.TEMP || '/tmp'}/kotoba-cdp-profile`; // fixed → persistence across runs

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=' + port,
  '--user-data-dir=' + profile,
  'about:blank',
], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getJson(path, init) {
  const res = await fetch(`http://127.0.0.1:${port}${path}`, init);
  if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + path);
  return res.json();
}

let ws = null;
let msgId = 0;
const pending = new Map();
const consoleErrors = [];

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function main() {
  // wait for devtools endpoint
  let version = null;
  for (let i = 0; i < 50; i++) {
    try { version = await getJson('/json/version'); break; } catch { await sleep(200); }
  }
  if (!version) throw new Error('chrome devtools not reachable');

  const tab = await getJson('/json/new?' + encodeURIComponent(url), { method: 'PUT' });
  ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });

  ws.onmessage = ev => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id).resolve(msg.result); pending.delete(msg.id); return; }
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      consoleErrors.push('exception: ' + (d.exception?.description || d.text));
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      consoleErrors.push('console.error: ' + msg.params.args.map(a => a.value || a.description || '').join(' '));
    }
    if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
      consoleErrors.push('log: ' + msg.params.entry.text);
    }
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');

  const deadline = Date.now() + timeoutMs;
  let body = '';
  while (Date.now() < deadline) {
    const res = await send('Runtime.evaluate', { awaitPromise: true, expression: `(window.__E2E__ ? Promise.resolve(window.__E2E__).then(v => String(v)) : Promise.resolve(document.getElementById('out') ? document.getElementById('out').textContent : ''))`, returnByValue: true });
    body = res?.result?.value || '';
    if (body.includes(__WAITTEXT__)) break;
    await sleep(400);
  }
  if (outHtml) {
    const doc = await send('Runtime.evaluate', { expression: 'document.documentElement.outerHTML', returnByValue: true });
    writeFileSync(outHtml, doc?.result?.value || '');
  }
  const ok = body.includes(__WAITTEXT__);
  console.log('=== CDP OUTPUT ===');
  console.log(body);
  console.log('=== CONSOLE ERRORS (' + consoleErrors.length + ') ===');
  consoleErrors.forEach(e => console.log('ERR ' + e));
  console.log(ok ? 'CDP_RESULT: PASS' : 'CDP_RESULT: TIMEOUT');
  ws.close();
  chrome.kill();
  process.exit(ok ? 0 : 1);
}

main().catch(e => { console.error('CDP driver failed: ' + e.message); chrome.kill(); process.exit(2); });
