// VO1KOV YT Music — плагин Stream Dock.
// Связывается с расширением Chrome в YouTube Music по ws://127.0.0.1:39871.
const fs = require('fs');
const path = require('path');
const { connect, createServer } = require('./ws');

const BRIDGE_PORT = 39871;
const SELECT_TIMEOUT = 10000;
const NS = 'com.vo1kov.ytmusic.';

// ---------- лог ----------
const LOG = path.join(__dirname, 'log.txt');
function log(...a) {
  try {
    const line = `[${new Date().toISOString()}] ${a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ')}\n`;
    if (fs.existsSync(LOG) && fs.statSync(LOG).size > 512 * 1024) fs.writeFileSync(LOG, '');
    fs.appendFileSync(LOG, line);
  } catch {}
}
process.on('uncaughtException', (e) => log('uncaught', String(e && e.stack || e)));
process.on('unhandledRejection', (e) => log('unhandled', String(e && e.stack || e)));

// ---------- аргументы Stream Dock (оба формата: позиционный и -port ...) ----------
function args() {
  const a = process.argv.slice(2);
  const i = a.indexOf('-port');
  if (i >= 0) {
    const get = (k) => a[a.indexOf(k) + 1];
    return { port: get('-port'), uuid: get('-pluginUUID'), event: get('-registerEvent'), info: get('-info') };
  }
  return { port: a[0], uuid: a[1], event: a[2], info: a[3] };
}
const A = args();

const { IMG, setLang, t } = require('./images');
function appLang(info) {
  try { return String(JSON.parse(info || '{}').application.language || 'en'); } catch { return 'en'; }
}
setLang(appLang(A.info));

// Ошибки приходят кодами, на клавише показываем перевод
const ERR_CODES = ['NOT_PLAYING', 'NOT_SIGNED_IN', 'NOT_READY', 'NO_REPLY', 'NO_TAB'];
function errText(e) {
  const code = String(e && e.message || '');
  return ERR_CODES.includes(code) ? t(code) : t('ERROR');
}

// Страница с инструкцией по установке расширения (лежит в папке плагина)
const SETUP_FILE = path.join(__dirname, '..', 'setup.html');
function openSetup() {
  const url = 'file:///' + encodeURI(SETUP_FILE.replace(/\\/g, '/').replace(/^\/+/, ''));
  sdSend({ event: 'openUrl', payload: { url } });
}

// ---------- Stream Dock ----------
const instances = new Map(); // context -> {action, controller}
let sd = null;

function sdSend(obj) { if (sd) sd.send(JSON.stringify(obj)); }
function setImage(ctx, image) { sdSend({ event: 'setImage', context: ctx, payload: { image, target: 0 } }); }
function setTitle(ctx, title) { sdSend({ event: 'setTitle', context: ctx, payload: { title, target: 0 } }); }
function showAlert(ctx) { sdSend({ event: 'showAlert', context: ctx }); }

function startStreamDock() {
  if (!A.port) { log('нет порта Stream Dock в аргументах', process.argv); return; }
  const h = connect(Number(A.port), (conn) => {
    sd = conn;
    conn.send(JSON.stringify({ event: A.event, uuid: A.uuid }));
    log('подключён к Stream Dock');
  });
  h.on('message', onSdMessage);
  h.on('close', () => { log('Stream Dock закрыл соединение'); process.exit(0); });
}

function onSdMessage(raw) {
  let m;
  try { m = JSON.parse(raw); } catch { return; }
  const action = (m.action || '').replace(NS, '');
  const ctx = m.context;
  // Крутилка: разные прошивки шлют поворот по-разному
  const ev = String(m.event || '');
  const isKnob = action === 'playlistknob' || (instances.get(ctx) && instances.get(ctx).controller === 'Knob');
  if (isKnob && /rotate/i.test(ev)) {
    const p = m.payload || {};
    let t = Number(p.ticks ?? p.tick ?? p.rotation ?? p.value ?? p.delta ?? 0);
    if (!t && typeof p.direction !== 'undefined') t = /left|ccw|-|^0$/i.test(String(p.direction)) ? -1 : 1;
    rotate(t || 1, ctx);
    return;
  }
  if (isKnob && /^(dialDown|dialPress|knobDown|keyDown|touchTap)$/.test(ev)) {
    confirmOrOpen(ctx);
    return;
  }
  switch (m.event) {
    case 'willAppear':
      instances.set(ctx, { action, controller: m.payload && m.payload.controller });
      lastImg.delete(ctx);
      setTitle(ctx, '');
      render(ctx);
      break;
    case 'willDisappear':
      instances.delete(ctx);
      break;
    case 'keyDown':
      onPress(action, ctx);
      break;
    case 'dialDown':
      if (action === 'playlistknob') confirmOrOpen(ctx);
      break;
    case 'dialRotate':
      if (action === 'playlistknob') rotate((m.payload && m.payload.ticks) || 0, ctx);
      break;
  }
}

// ---------- мост к расширению ----------
const clients = new Set(); // {conn, state, at}
let reqId = 0;
const pending = new Map();

function activeClient() {
  let best = null;
  for (const c of clients) {
    const score = (c.state && c.state.track && c.state.track.playing ? 4 : 0) +
      (c.state && c.state.focused ? 2 : 0) + (c.state && c.state.track ? 1 : 0);
    if (!best || score > best.score || (score === best.score && c.at > best.c.at)) best = { c, score };
  }
  return best ? best.c : null;
}
function state() { const c = activeClient(); return c && c.state; }

function cmd(name, arg) {
  return new Promise((resolve, reject) => {
    const c = activeClient();
    if (!c) return reject(new Error('NO_TAB'));
    const id = ++reqId;
    const t = setTimeout(() => { pending.delete(id); reject(new Error('NO_REPLY')); }, 8000);
    pending.set(id, { resolve, reject, t });
    c.conn.send(JSON.stringify({ type: 'cmd', id, cmd: name, arg }));
  });
}

function startBridge() {
  createServer(BRIDGE_PORT, (conn, origin) => {
    const client = { conn, state: null, at: Date.now() };
    clients.add(client);
    log('расширение подключилось', origin);
    conn.on('message', (raw) => {
      let m;
      try { m = JSON.parse(raw); } catch { return; }
      if (m.type === 'state') { client.state = m; client.at = Date.now(); renderAll(); }
      if (m.type === 'result' && pending.has(m.id)) {
        const p = pending.get(m.id);
        pending.delete(m.id);
        clearTimeout(p.t);
        m.ok ? p.resolve(m.data) : p.reject(new Error(m.code || m.error || 'ERROR'));
        if (!m.ok) log('ext error', m.code, m.error);
      }
    });
    conn.on('close', () => { clients.delete(client); log('расширение отключилось'); renderAll(); });
  }, (e) => {
    log('порт моста занят/ошибка', String(e));
    setTimeout(startBridge, 5000);
  });
}

// ---------- обложки ----------
const covers = new Map(); // url -> data URI | 'loading' | 'fail'

// Обложки качаем только с серверов картинок Google/YouTube
function coverAllowed(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && /(^|\.)(googleusercontent\.com|ytimg\.com|ggpht\.com)$/.test(u.hostname);
  } catch { return false; }
}

async function loadCover(url) {
  if (!url || covers.has(url)) return;
  if (!coverAllowed(url)) { covers.set(url, 'fail'); return; }
  covers.set(url, 'loading');
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const type = (res.headers.get('content-type') || 'image/jpeg').split(';')[0];
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 400 * 1024) throw new Error('слишком большая');
    covers.set(url, `data:${type};base64,${buf.toString('base64')}`);
  } catch (e) {
    covers.set(url, 'fail');
    log('cover', url, e.message);
  }
  renderAll();
}

// Текущую обложку грузим первой, остальные следом
function loadCovers() {
  const order = sel.items.slice(sel.index).concat(sel.items.slice(0, sel.index));
  order.forEach((p, i) => setTimeout(() => loadCover(p.thumb), i * 60));
}

function coverOf(p) {
  const c = p && p.thumb && covers.get(p.thumb);
  return c && c.startsWith('data:') ? c : null;
}

// ---------- выбор плейлиста ----------
const sel = { active: false, items: [], index: 0, videoId: null, timer: null, flash: null };
let lastPlaylistId = null;

function resetTimer() {
  clearTimeout(sel.timer);
  sel.timer = setTimeout(() => { sel.active = false; renderAll(); }, SELECT_TIMEOUT);
}

async function openSelection() {
  sel.flash = 'loading';
  renderAll();
  try {
    const res = await cmd('playlists');
    sel.flash = null;
    if (!res.items.length) { flash('fail', t('none')); return; }
    sel.items = res.items;
    sel.videoId = res.videoId;
    const i = res.items.findIndex((p) => p.id === lastPlaylistId);
    sel.index = i >= 0 ? i : 0;
    sel.active = true;
    loadCovers();
    resetTimer();
    renderAll();
  } catch (e) {
    sel.flash = null;
    log('playlists', e.message);
    flash('fail', errText(e));
  }
}

async function confirmSelection() {
  const p = sel.items[sel.index];
  sel.active = false;
  clearTimeout(sel.timer);
  if (!p) { renderAll(); return; }
  if (p.contains) { flash('done', t('already')); return; }
  try {
    await cmd('addToPlaylist', p.id);
    lastPlaylistId = p.id;
    flash('done', t('added'));
  } catch (e) {
    log('add', e.message);
    flash('fail', errText(e));
  }
}

function confirmOrOpen() { sel.active ? confirmSelection() : openSelection(); }

function rotate(ticks) {
  if (!ticks) return;
  if (!sel.active) { openSelection(); return; }
  const n = sel.items.length;
  sel.index = ((sel.index + Math.sign(ticks) * Math.max(1, Math.abs(ticks))) % n + n) % n;
  resetTimer();
  renderAll();
}

function flash(kind, text) {
  sel.flash = { kind, text };
  renderAll();
  setTimeout(() => { sel.flash = null; renderAll(); }, 1500);
}

// ---------- нажатия ----------
async function onPress(action, ctx) {
  // Расширение не подключено — показываем, как его поставить
  if (!state()) { openSetup(); return; }
  try {
    switch (action) {
      case 'like': await cmd('like'); break;
      case 'dislike': await cmd('dislike'); break;
      case 'playlist': confirmOrOpen(); return;
      case 'radio': await cmd('radio'); break;
      case 'supermix': await cmd('supermix'); break;
      default: return;
    }
  } catch (e) {
    log(action, e.message);
    showAlert(ctx);
  }
}

// ---------- отрисовка ----------
const NAMES = { like: 'like', dislike: 'dislike', playlist: 'playlists', radio: 'radio', supermix: 'mix' };
const lastImg = new Map();

function render(ctx) {
  const inst = instances.get(ctx);
  if (!inst || inst.action === 'playlistknob') return;
  const st = state();
  let img;
  if (!st) img = IMG.offline(t(NAMES[inst.action] || ''));
  else if (inst.action === 'like') img = IMG.like(st.like === 'LIKE');
  else if (inst.action === 'dislike') img = IMG.dislike(st.like === 'DISLIKE');
  else if (inst.action === 'radio') img = IMG.radio();
  else if (inst.action === 'supermix') img = IMG.mix();
  else if (inst.action === 'playlist') {
    if (sel.flash === 'loading') img = IMG.plLoading();
    else if (sel.flash) img = sel.flash.kind === 'done' ? IMG.done(sel.flash.text) : IMG.fail(sel.flash.text);
    else if (sel.active) { const p = sel.items[sel.index]; const c = coverOf(p);
      img = c ? IMG.plCover(c, sel.index, sel.items.length, p.contains) : IMG.plSelect(p.title, sel.index, sel.items.length, p.contains); }
    else img = IMG.plIdle();
  }
  if (!img || lastImg.get(ctx) === img) return;
  lastImg.set(ctx, img);
  setImage(ctx, img);
}
function renderAll() { for (const ctx of instances.keys()) render(ctx); }

// Трек сменился во время выбора — закрываем выбор
setInterval(() => {
  const st = state();
  if (sel.active && st && st.track && st.track.videoId !== sel.videoId) { sel.active = false; renderAll(); }
}, 1000);

// Пинг держит фоновую часть расширения Chrome бодрствующей
setInterval(() => {
  for (const c of clients) { try { c.conn.send('{"type":"ping"}'); } catch {} }
}, 20000);

startBridge();
startStreamDock();
log('старт', A);
