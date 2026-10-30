// VO1KOV Claude — лимиты Claude на кнопках Mirabox Stream Dock.
// Без зависимостей: работает на встроенном в Stream Dock Node 20.
'use strict';

const net = require('net');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

// ---------- лог ----------
const LOG = path.join(__dirname, 'log.txt');
function log(...a) {
  try {
    if (fs.existsSync(LOG) && fs.statSync(LOG).size > 200_000) fs.writeFileSync(LOG, '');
    fs.appendFileSync(LOG, new Date().toISOString() + ' ' + a.map(String).join(' ') + '\n');
  } catch {}
}
process.on('uncaughtException', (e) => log('uncaught', e && e.stack));
process.on('unhandledRejection', (e) => log('unhandled', e && e.stack));

// ---------- аргументы от Stream Dock ----------
function arg(name) {
  const i = process.argv.indexOf('-' + name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const PORT = Number(arg('port'));
const PLUGIN_UUID = arg('pluginUUID');
const REGISTER_EVENT = arg('registerEvent');

// ---------- языки ----------
function appLang() {
  try { return String(JSON.parse(arg('info') || '{}').application.language || 'en'); } catch { return 'en'; }
}
const I18N = {
  en: { s: '5H', w: '7D', m: 'MODEL', d: 'd', h: 'h', mi: 'm', login: 'LOGIN', loginS: 'no sign-in', tok: 'TOKEN', tokS: 'open Claude', net: 'offline', rl: 'API limit', none: 'n/a', stale: 'stale' },
  ru: { s: '5Ч', w: '7Д', m: 'МОДЕЛЬ', d: 'д', h: 'ч', mi: 'м', login: 'ВХОД', loginS: 'нет входа', tok: 'ТОКЕН', tokS: 'открой Claude', net: 'нет сети', rl: 'лимит API', none: 'нет', stale: 'старое' },
  de: { s: '5H', w: '7T', m: 'MODELL', d: 'T', h: 'h', mi: 'm', login: 'LOGIN', loginS: 'abgemeldet', tok: 'TOKEN', tokS: 'Claude öffnen', net: 'offline', rl: 'API-Limit', none: 'k. A.', stale: 'veraltet' },
  fr: { s: '5H', w: '7J', m: 'MODÈLE', d: 'j', h: 'h', mi: 'm', login: 'LOGIN', loginS: 'non connecté', tok: 'JETON', tokS: 'ouvrir Claude', net: 'hors ligne', rl: 'limite API', none: 'n/d', stale: 'périmé' },
  es: { s: '5H', w: '7D', m: 'MODELO', d: 'd', h: 'h', mi: 'm', login: 'LOGIN', loginS: 'sin sesión', tok: 'TOKEN', tokS: 'abre Claude', net: 'sin red', rl: 'límite API', none: 'n/d', stale: 'antiguo' },
  zh: { s: '5小时', w: '7天', m: '模型', d: '天', h: '时', mi: '分', login: '登录', loginS: '未登录', tok: '令牌', tokS: '打开 Claude', net: '无网络', rl: 'API 限流', none: '无', stale: '已过期' },
  ja: { s: '5時間', w: '7日', m: 'モデル', d: '日', h: '時', mi: '分', login: 'ログイン', loginS: '未ログイン', tok: 'トークン', tokS: 'Claudeを開く', net: 'オフライン', rl: 'API制限', none: 'なし', stale: '古い' },
  ko: { s: '5시간', w: '7일', m: '모델', d: '일', h: '시', mi: '분', login: '로그인', loginS: '로그인 필요', tok: '토큰', tokS: 'Claude 열기', net: '오프라인', rl: 'API 제한', none: '없음', stale: '오래됨' },
};
function pickLang(code) {
  const c = String(code || '').toLowerCase();
  if (c.startsWith('ru') || c.startsWith('uk') || c.startsWith('be')) return I18N.ru;
  for (const k of ['zh', 'ja', 'ko', 'de', 'fr', 'es']) if (c.startsWith(k)) return I18N[k];
  return I18N.en;
}
let T = pickLang(appLang());

// ---------- минимальный WebSocket-клиент ----------
class WS {
  constructor(port, onOpen, onMessage, onClose) {
    this.buf = Buffer.alloc(0);
    this.open = false;
    const key = crypto.randomBytes(16).toString('base64');
    this.sock = net.connect(port, '127.0.0.1', () => {
      this.sock.write(
        `GET / HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n` +
          `Sec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`,
      );
    });
    this.sock.on('data', (d) => {
      this.buf = Buffer.concat([this.buf, d]);
      if (!this.open) {
        const end = this.buf.indexOf('\r\n\r\n');
        if (end < 0) return;
        this.buf = this.buf.subarray(end + 4);
        this.open = true;
        onOpen();
      }
      this.parse(onMessage);
    });
    this.sock.on('close', onClose);
    this.sock.on('error', (e) => log('ws error', e.message));
    this.frag = [];
  }
  parse(onMessage) {
    for (;;) {
      const b = this.buf;
      if (b.length < 2) return;
      const fin = b[0] & 0x80, op = b[0] & 0x0f;
      let len = b[1] & 0x7f, off = 2;
      if (len === 126) { if (b.length < 4) return; len = b.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (b.length < 10) return; len = Number(b.readBigUInt64BE(2)); off = 10; }
      const masked = b[1] & 0x80;
      let mask;
      if (masked) { if (b.length < off + 4) return; mask = b.subarray(off, off + 4); off += 4; }
      if (b.length < off + len) return;
      let payload = Buffer.from(b.subarray(off, off + len));
      if (masked) for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3];
      this.buf = b.subarray(off + len);
      if (op === 0x8) { this.sock.end(); return; }
      if (op === 0x9) { this.frame(0xA, payload); continue; }
      if (op === 0x1 || op === 0x0) {
        this.frag.push(payload);
        if (fin) { const msg = Buffer.concat(this.frag).toString('utf8'); this.frag = []; onMessage(msg); }
      }
    }
  }
  frame(op, data) {
    const len = data.length;
    let head;
    if (len < 126) { head = Buffer.alloc(2); head[1] = 0x80 | len; }
    else if (len < 65536) { head = Buffer.alloc(4); head[1] = 0x80 | 126; head.writeUInt16BE(len, 2); }
    else { head = Buffer.alloc(10); head[1] = 0x80 | 127; head.writeBigUInt64BE(BigInt(len), 2); }
    head[0] = 0x80 | op;
    const mask = crypto.randomBytes(4);
    const out = Buffer.from(data);
    for (let i = 0; i < out.length; i++) out[i] ^= mask[i & 3];
    this.sock.write(Buffer.concat([head, mask, out]));
  }
  send(obj) { if (this.open) this.frame(0x1, Buffer.from(JSON.stringify(obj), 'utf8')); }
}

// ---------- токен Claude Code ----------
const ENDPOINT = 'https://api.anthropic.com/api/oauth/usage';
const TOKEN_ENDPOINT = 'https://platform.claude.com/v1/oauth/token';
const CLIENT_ID = '9d1c250a-e61b-44d9-88ed-5944d1962f5e';
const UA = 'claude-code/2.0.31';

function credPath() {
  const dir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
  return path.join(dir, '.credentials.json');
}
function readCred() {
  try {
    const o = JSON.parse(fs.readFileSync(credPath(), 'utf8')).claudeAiOauth || {};
    const exp = Number(o.expiresAt || 0);
    return { token: o.accessToken, expired: exp > 0 && Date.now() > exp };
  } catch { return {}; }
}

let refreshFailedAt = 0, refreshing = null;
async function refreshToken(badToken) {
  if (refreshing) return refreshing;
  if (Date.now() - refreshFailedAt < 5 * 60_000) return null;
  refreshing = (async () => {
    const p = credPath();
    let j;
    try { j = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
    const o = j && j.claudeAiOauth;
    if (!o || !o.refreshToken) return null;
    const exp = Number(o.expiresAt || 0);
    // Claude Code уже обновил токен сам — берём его.
    if (o.accessToken && o.accessToken !== badToken && !(exp > 0 && Date.now() > exp)) return o.accessToken;
    try {
      const res = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': UA },
        body: JSON.stringify({ grant_type: 'refresh_token', refresh_token: o.refreshToken, client_id: CLIENT_ID }),
      });
      if (!res.ok) { const again = readCred(); return again.token && !again.expired ? again.token : null; }
      const body = await res.json();
      if (!body.access_token) return null;
      // Refresh-токен одноразовый: обязательно записываем новую пару обратно,
      // иначе Claude Code разлогинится.
      let fresh = j;
      try { fresh = JSON.parse(fs.readFileSync(p, 'utf8')); } catch {}
      const t = (fresh.claudeAiOauth = fresh.claudeAiOauth || {});
      t.accessToken = body.access_token;
      t.refreshToken = body.refresh_token || o.refreshToken;
      t.expiresAt = Date.now() + (Number(body.expires_in) || 28800) * 1000;
      try { fs.writeFileSync(p + '.tmp', JSON.stringify(fresh)); fs.renameSync(p + '.tmp', p); }
      catch { try { fs.writeFileSync(p, JSON.stringify(fresh)); } catch {} }
      return body.access_token;
    } catch (e) { log('refresh failed', e.message); return null; }
  })();
  try {
    const r = await refreshing;
    if (!r) refreshFailedAt = Date.now(); else refreshFailedAt = 0;
    return r;
  } finally { refreshing = null; }
}

// ---------- данные ----------
const state = { data: null, at: 0, error: null };
let fetching = null;

async function fetchUsage(force) {
  if (fetching) return fetching;
  if (!force && state.at && Date.now() - state.at < 55_000) return;
  fetching = (async () => {
    let c = readCred();
    let token = c.token;
    if (!token || c.expired) token = (await refreshToken()) || null;
    if (!token) { state.error = c.token ? 'expired' : 'nologin'; return; }
    const get = (t) => fetch(ENDPOINT, {
      headers: {
        Authorization: 'Bearer ' + t,
        'anthropic-beta': 'oauth-2025-04-20',
        'User-Agent': UA,
        Accept: 'application/json',
      },
    });
    try {
      let res = await get(token);
      if (res.status === 401) {
        const t2 = await refreshToken(token);
        if (t2 && t2 !== token) res = await get(t2);
      }
      if (!res.ok) { state.error = res.status === 429 ? 'ratelimit' : 'http' + res.status; log('http', res.status); return; }
      state.data = await res.json();
      state.at = Date.now();
      state.error = null;
    } catch (e) { state.error = 'network'; log('net', e.message); }
  })();
  try { await fetching; } finally { fetching = null; }
}

const METRICS = ['session', 'weekly', 'model'];
const LABELS = new Proxy({}, { get: (_, k) => (k === 'session' ? T.s : k === 'weekly' ? T.w : T.m) });

function pick(metric) {
  const d = state.data;
  if (!d) return { pct: null, reset: null, label: LABELS[metric] };
  if (metric === 'model') {
    const l = Array.isArray(d.limits) ? d.limits.find((x) => x && x.kind === 'weekly_scoped' && typeof x.percent === 'number') : null;
    if (!l) return { pct: null, reset: null, label: LABELS.model, none: true };
    const name = l.scope && l.scope.model && l.scope.model.display_name;
    return { pct: l.percent, reset: l.resets_at || null, label: name ? String(name).toUpperCase().slice(0, 7) : LABELS.model };
  }
  const n = d[metric === 'session' ? 'five_hour' : 'seven_day'];
  if (!n || typeof n.utilization !== 'number') return { pct: null, reset: null, label: LABELS[metric], none: true };
  return { pct: n.utilization, reset: n.resets_at || null, label: LABELS[metric] };
}

function until(iso) {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  let s = Math.max(0, Math.floor((t - Date.now()) / 1000));
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60);
  const cjk = T === I18N.zh || T === I18N.ja || T === I18N.ko;
  const sp = cjk ? '' : ' ';
  if (d > 0) return `${d}${T.d}${sp}${h}${T.h}`;
  if (h > 0) return `${h}${T.h}${sp}${m}${T.mi}`;
  return `${m}${T.mi}`;
}

// ---------- рисование (SVG без '#', '%' и '&' — так требует Stream Dock) ----------
const C = {
  bg: 'rgb(8,8,11)', track: 'rgb(38,36,48)', text: 'rgb(245,245,250)', dim: 'rgb(150,148,165)',
  ok: 'rgb(168,85,247)', warn: 'rgb(245,158,11)', crit: 'rgb(239,68,68)', grey: 'rgb(90,90,100)',
};
function colorFor(p) { return p == null ? C.grey : p >= 80 ? C.crit : p >= 50 ? C.warn : C.ok; }
function esc(s) { return String(s).replace(/[&<>]/g, ''); }

function arc(cx, cy, r, pct) {
  const p = Math.max(0, Math.min(99.99, pct)) / 100;
  if (p <= 0) return '';
  const a0 = -Math.PI / 2, a1 = a0 + p * 2 * Math.PI;
  const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${p > 0.5 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}
const FONT = `font-family="Segoe UI, Microsoft YaHei, Yu Gothic, Malgun Gothic, Arial, sans-serif"`;

function fitW(text, maxW) {
  const em = [...String(text)].reduce((a, ch) => a + (ch.charCodeAt(0) > 0x2e80 ? 1 : ch === ' ' ? 0.3 : 0.6), 0);
  return Math.floor(maxW / Math.max(1, em));
}

function svgKey(label, pct, bottom, opts = {}) {
  // Кнопка физически ~15 мм: кольцо по краю, максимум крупная цифра, без мелочи.
  const col = colorFor(pct);
  const cx = 72, cy = 72, r = 64, sw = 11;
  let mid;
  if (pct == null) {
    mid = `<text x="72" y="84" ${FONT} font-weight="800" font-size="${opts.bigSize || 34}" fill="${C.dim}" text-anchor="middle">${esc(opts.big || '--')}</text>`;
  } else {
    const n = String(Math.round(pct));
    const fs = n.length >= 3 ? 46 : 58;
    mid = `<text x="72" y="${72 + fs * 0.36}" ${FONT} font-weight="800" font-size="${fs}" fill="${C.text}" text-anchor="middle">${n}</text>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">` +
    `<rect width="144" height="144" fill="${C.bg}"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${C.track}" stroke-width="${sw}"/>` +
    (pct != null ? `<path d="${arc(cx, cy, r, pct)}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linecap="round"/>` : '') +
    `<text x="72" y="44" ${FONT} font-weight="800" font-size="${Math.min(21, fitW(label, 84))}" fill="${C.dim}" text-anchor="middle">${esc(label)}</text>` +
    mid +
    (bottom ? `<text x="72" y="${opts.small ? 113 : 116}" ${FONT} font-weight="700" font-size="${Math.min(opts.small ? 15 : 20, fitW(bottom, 80))}" fill="${opts.stale ? C.warn : C.text}" text-anchor="middle">${esc(bottom)}</text>` : '') +
    `</svg>`;
}

// Подобрать размер, чтобы слово влезло внутрь кольца (~100 px).
function fit(word, size) {
  const em = [...String(word)].reduce((a, ch) => a + (ch.charCodeAt(0) > 0x2e80 ? 1 : 0.68), 0);
  return Math.max(14, Math.min(size, Math.floor(100 / Math.max(1, em))));
}

function render(metric) {
  const m = pick(metric);
  const err = state.error;
  if (!state.data) {
    if (err === 'nologin') return svgKey(m.label, null, T.loginS, { big: T.login, bigSize: fit(T.login, 28), small: true });
    if (err === 'expired') return svgKey(m.label, null, T.tokS, { big: T.tok, bigSize: fit(T.tok, 26), small: true });
    if (err) return svgKey(m.label, null, err === 'network' ? T.net : err === 'ratelimit' ? T.rl : err, { big: '!', small: true });
    return svgKey(m.label, null, '', { big: '...' });
  }
  if (m.none) return svgKey(m.label, null, T.none, { big: '--' });
  const stale = !!err && Date.now() - state.at > 3 * 60_000;
  const t = until(m.reset);
  return svgKey(m.label, m.pct, stale ? T.stale : t, { stale });
}

// ---------- связь со Stream Dock ----------
const keys = new Map(); // context -> { action, metric }

function metricOf(action, settings) {
  const id = String(action || '').split('.').pop();
  if (id === 'cycle') return METRICS.includes(settings && settings.metric) ? settings.metric : 'session';
  return METRICS.includes(id) ? id : 'session';
}

let ws;
function draw(context) {
  const k = keys.get(context);
  if (!k || !ws) return;
  const svg = render(k.metric);
  ws.send({ event: 'setImage', context, payload: { target: 0, image: 'data:image/svg+xml;charset=utf8,' + svg } });
}
function drawAll() { for (const c of keys.keys()) draw(c); }

async function refresh(force) {
  await fetchUsage(force);
  drawAll();
}

function onMessage(raw) {
  let m;
  try { m = JSON.parse(raw); } catch { return; }
  const { event, context, action, payload } = m;
  switch (event) {
    case 'willAppear': {
      keys.set(context, { action, metric: metricOf(action, payload && payload.settings) });
      draw(context);
      refresh(false);
      break;
    }
    case 'willDisappear':
      keys.delete(context);
      break;
    case 'keyUp': {
      const k = keys.get(context);
      if (!k) break;
      if (String(action).endsWith('.cycle')) {
        k.metric = METRICS[(METRICS.indexOf(k.metric) + 1) % METRICS.length];
        ws.send({ event: 'setSettings', context, payload: { metric: k.metric } });
        draw(context);
      } else {
        refresh(true);
      }
      break;
    }
    case 'dialRotate': {
      const k = keys.get(context);
      if (!k) break;
      const step = (payload && payload.ticks) > 0 ? 1 : -1;
      k.metric = METRICS[(METRICS.indexOf(k.metric) + step + METRICS.length) % METRICS.length];
      draw(context);
      break;
    }
    case 'dialDown':
      refresh(true);
      break;
  }
}

function start() {
  if (!PORT || !PLUGIN_UUID) { log('no args', JSON.stringify(process.argv)); return; }
  ws = new WS(
    PORT,
    () => { ws.send({ event: REGISTER_EVENT, uuid: PLUGIN_UUID }); log('registered'); },
    onMessage,
    () => process.exit(0),
  );
  setInterval(() => { if (keys.size) refresh(false); }, 60_000);
  setInterval(() => { if (keys.size) drawAll(); }, 20_000);
}

if (require.main === module) start();
module.exports = { render, svgKey, state, pick, setLang: (c) => { T = pickLang(c); } };
