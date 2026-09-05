/* ============================================================
   Headless-Chrome screenshot helper (no deps).
   Usage: node shot.mjs <url> <out.png> <width> <height> [waitMs] [evalJs]
   ============================================================ */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { writeFileSync, readFileSync } from 'node:fs';

const CHROME = process.env.KOTOBA_CHROME || (process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe') : 'chrome');
let [url, outPng, width, height, waitMs, evalJs, reloadFlag] = [process.argv[2], process.argv[3], Number(process.argv[4] || 1440), Number(process.argv[5] || 900), Number(process.argv[6] || 2500), process.argv[7], process.argv[8]];
if (evalJs && evalJs.startsWith('@')) evalJs = readFileSync(evalJs.slice(1), 'utf8');

const port = 10100 + Math.floor(Math.random() * 300);
const profile = `${process.env.TEMP || '/tmp'}/kotoba-shot-profile`;
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--hide-scrollbars', `--window-size=${width},${height}`, '--force-device-scale-factor=1',
  '--remote-debugging-port=' + port, '--user-data-dir=' + profile, 'about:blank',
], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function getJson(p, init) {
  const res = await fetch(`http://127.0.0.1:${port}${p}`, init);
  return res.json();
}

let ws = null, id = 0;
const pending = new Map();
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const mid = ++id;
    pending.set(mid, { resolve, reject });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
}

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
  if (evalJs) {
    await send('Runtime.evaluate', { expression: evalJs, awaitPromise: true });
    if (reloadFlag === 'reload') {
      await send('Page.reload');
      await sleep(2600);
    } else {
      await sleep(1200);
    }
  }
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(outPng, Buffer.from(shot.data, 'base64'));
  console.log('saved ' + outPng + ' (' + width + 'x' + height + ')');
  ws.close();
  chrome.kill();
}

main().catch(e => { console.error('shot failed: ' + e.message); chrome.kill(); process.exit(1); });
