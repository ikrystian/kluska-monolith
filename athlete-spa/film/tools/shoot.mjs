// Headless Chromium over CDP: capture the real app (mock API) at phone size.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const BASE = process.env.BASE || 'http://localhost:5261';
const OUT = process.argv[2];
const routes = process.argv.slice(3); // name=route[:scrollY]
fs.mkdirSync(OUT, { recursive: true });
const port = 9333 + Math.floor(Math.random() * 300);
const ch = spawn('/usr/bin/chromium', ['--headless=new', `--remote-debugging-port=${port}`, '--no-sandbox', '--hide-scrollbars', '--user-data-dir=/tmp/claude-1000/shoot-' + port, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws, id = 0; const pend = new Map();
for (let i = 0; i < 50; i++) { try { const t = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); const pg = t.find(x => x.type === 'page'); if (pg) { ws = new WebSocket(pg.webSocketDebuggerUrl); break; } } catch {} await sleep(200); }
await new Promise(r => ws.addEventListener('open', r));
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const token = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: 'u1', email: 'kuba@example.com', name: 'Kuba Nowak', role: 'athlete', exp: 4102444800 })}.x`;
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
await send('Emulation.setFocusEmulationEnabled', { enabled: true });
await send('Page.addScriptToEvaluateOnNewDocument', { source: `try{localStorage.setItem('athlete-spa:token','${token}');localStorage.setItem('athlete-spa:tours:u1',JSON.stringify({seen:{},disabled:true}));localStorage.setItem('theme','dark');}catch(e){}` });
for (const spec of routes) {
  const [name, rest] = spec.split('='); const [route, scroll] = rest.split(':');
  await send('Page.navigate', { url: `${BASE}/?r=${Date.now()}#${route}` });
  await sleep(4500);
  if (scroll) { await ev(`document.querySelector('#outlet').scrollTo(0,${+scroll})`); await sleep(900); }
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(`${OUT}/${name}.png`, Buffer.from(shot.result.data, 'base64'));
  console.log('shot', name);
}
ch.kill(); process.exit(0);
