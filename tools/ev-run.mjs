/* poll window.__E2E_RESULT__ then print; independent of cdp-run polling */
import { spawn } from 'node:child_process';
import path from 'node:path';

const CHROME = process.env.KOTOBA_CHROME || (process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe') : 'chrome');
const url = process.argv[2];
const timeoutMs = Number(process.argv[3] || 60000);
const evalFile = process.argv[4]; // optional: path to js file whose contents will be eval'd
const evalFile2 = process.argv[5]; // optional: eval'd after a Page.reload (data seeded in phase 1 becomes visible to the app)

const port = 9700 + Math.floor(Math.random() * 200);
const profile = `${process.env.TEMP || '/tmp'}/kotoba-ev-profile-${Date.now()}`;

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--window-size=1440,900',
  '--remote-debugging-port=' + port, '--user-data-dir=' + profile, 'about:blank',
], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJson = async (p, init) => { const r = await fetch(`http://127.0.0.1:${port}${p}`, init); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); };

let ws, id = 0; const pending = new Map(); const consoleErrors = [];
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const mid = ++id; pending.set(mid, { resolve, reject });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
}

async function main() {
  let okEndpoint = false;
  for (let i = 0; i < 50; i++) { try { await getJson('/json/version'); okEndpoint = true; break; } catch { await sleep(200); } }
  if (!okEndpoint) throw new Error('devtools unreachable');

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
  };
  await send('Runtime.enable');
  await send('Page.enable');

  await sleep(3500); // let the app boot

  const fs = await import('node:fs');
  const runEval = async (src) => {
    const expr = `(async () => { let result; const setResult = v => { result = v; }; ${src} return result; })()`;
    const res = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    console.log('=== RESULT ===');
    console.log(typeof res?.result?.value === 'object' ? JSON.stringify(res.result.value) : (res?.result?.value ?? 'undefined'));
    if (res?.exceptionDetails) console.log('EVAL-EXC: ' + (res.exceptionDetails.exception?.description || res.exceptionDetails.text));
  };

  if (evalFile) {
    await runEval(fs.readFileSync(evalFile, 'utf8'));
  } else {
    const res = await send('Runtime.evaluate', { expression: `(window.__E2E_RESULT__ ? Promise.resolve(window.__E2E_RESULT__).then(v => String(v)) : Promise.resolve('NO_RESULT'))`, awaitPromise: true, returnByValue: true });
    console.log('=== RESULT ===');
    console.log(typeof res?.result?.value === 'object' ? JSON.stringify(res.result.value) : (res?.result?.value ?? 'undefined'));
  }

  if (evalFile2) {
    await send('Page.reload');
    await sleep(3500);
    console.log('=== RESULT (after reload) ===');
    await runEval(fs.readFileSync(evalFile2, 'utf8'));
  }
  console.log('=== CONSOLE ERRORS (' + consoleErrors.length + ') ===');
  consoleErrors.forEach(e => console.log('ERR ' + e));
  ws.close(); chrome.kill();
  process.exit(0);
}

main().catch(e => { console.error('ev-run failed: ' + e.message); try { chrome.kill(); } catch {} process.exit(2); });
