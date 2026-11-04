// ---------- картинки клавиш ----------
const { pickLang } = require('./i18n');
let T = pickLang('en');
function setLang(code) { T = pickLang(code); }
const C = { bg: '#14101f', accent: '#b26bff', red: '#ff4e6a', dim: '#5d5670', text: '#ffffff', ok: '#3ddc84' };

function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c])); }

// Примерная ширина строки в долях кегля: иероглифы/хангыль ~1.0, латиница/кириллица ~0.6
function textWidth(t) {
  let w = 0;
  for (const ch of String(t)) w += /[\u1100-\u11ff\u2e80-\u9fff\uac00-\ud7af\uf900-\ufaff\uff00-\uffef]/.test(ch) ? 1.0 : 0.6;
  return w;
}
function wrap(str, max, lines) {
  // Длинные слова без пробелов (CJK) режем по символам
  const words = [];
  for (const w of String(str).split(/\s+/).filter(Boolean)) {
    if (textWidth(w) / 0.6 <= max) { words.push(w); continue; }
    let cur = '';
    for (const ch of w) { if (textWidth(cur + ch) / 0.6 > max) { words.push(cur); cur = ch; } else cur += ch; }
    if (cur) words.push(cur);
  }
  const out = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (textWidth(t) / 0.6 <= max) cur = t;
    else { if (cur) out.push(cur); cur = w; }
    if (out.length === lines) break;
  }
  if (out.length < lines && cur) out.push(cur);
  if (out.length === lines && words.join(' ').length > out.join(' ').length) {
    out[lines - 1] = out[lines - 1].slice(0, max - 1).replace(/\s+$/, '') + '…';
  }
  return out;
}

function svg(body, bg = C.bg, border) {
  const s = `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">` +
    `<rect width="144" height="144" rx="18" fill="${bg}"/>` +
    (border ? `<rect x="4" y="4" width="136" height="136" rx="16" fill="none" stroke="${border}" stroke-width="6"/>` : '') +
    body + `</svg>`;
  return 'data:image/svg+xml;charset=utf8,' + encodeURIComponent(s);
}
function label(t, y = 128, size = 17, color = C.text) {
  const w = textWidth(t) * size;
  if (w > 132) size = Math.max(10, Math.floor(size * 132 / w));
  return `<text x="72" y="${y}" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="${size}" font-weight="600" fill="${color}">${esc(t)}</text>`;
}
const HEART = 'M72 104 L40 72 C28 60 32 40 50 38 C60 37 67 43 72 50 C77 43 84 37 94 38 C112 40 116 60 104 72 Z';
const THUMB = 'M48 40 h12 v42 h-12 z M66 82 l14 30 c6 0 10 -4 10 -10 l-4 -18 h22 c6 0 10 -6 8 -12 l-8 -26 c-2 -4 -5 -6 -9 -6 h-33 z';

const IMG = {
  offline: (name) => svg(label(T.offline, 62, 18, C.dim) + label(name, 92, 15, C.dim) + label(T.offlineHint, 128, 13, C.accent)),
  like: (on) => svg(`<path d="${HEART}" transform="translate(0,-8)" fill="${on ? C.red : 'none'}" stroke="${on ? C.red : C.text}" stroke-width="6" stroke-linejoin="round"/>` + label(on ? T.liked : T.like)),
  dislike: (on) => svg(`<path d="${THUMB}" transform="translate(-6,-12)" fill="${on ? C.accent : 'none'}" stroke="${on ? C.accent : C.text}" stroke-width="5" stroke-linejoin="round"/>` + label(on ? T.disliked : T.dislike)),
  radio: () => svg(
    `<circle cx="72" cy="60" r="9" fill="${C.accent}"/>` +
    `<path d="M50 38 a31 31 0 0 0 0 44 M94 38 a31 31 0 0 1 0 44 M38 26 a48 48 0 0 0 0 68 M106 26 a48 48 0 0 1 0 68" fill="none" stroke="${C.text}" stroke-width="6" stroke-linecap="round"/>` +
    label(T.radio)),
  mix: () => svg(
    `<path d="M30 46 h20 c14 0 18 28 32 28 h22 M30 74 h20 c14 0 18 -28 32 -28 h22" fill="none" stroke="${C.text}" stroke-width="7" stroke-linecap="round"/>` +
    `<path d="M100 36 l12 10 -12 10 z M100 64 l12 10 -12 10 z" fill="${C.accent}"/>` +
    label(T.mix)),
  plIdle: () => svg(
    `<path d="M32 40 h56 M32 58 h56 M32 76 h34" stroke="${C.text}" stroke-width="7" stroke-linecap="round"/>` +
    `<path d="M98 66 v34 M81 83 h34" stroke="${C.accent}" stroke-width="8" stroke-linecap="round"/>` +
    label(T.playlist)),
  plLoading: () => svg(label('…', 78, 40, C.accent) + label(T.playlists, 128)),
  plSelect: (title, idx, total, contains) => {
    const lines = wrap(title, 11, 3);
    const top = 62 - (lines.length - 1) * 11;
    return svg(
      label(`${idx + 1}/${total}`, 26, 15, C.dim) +
      lines.map((l, i) => label(l, top + i * 22, 19)).join('') +
      label(contains ? T.hasIt : T.pressAdd, 128, 14, contains ? C.ok : C.accent),
      C.bg, contains ? C.dim : C.accent);
  },
  // Обложка плейлиста на всю клавишу: номер в углу, галочка если трек уже там
  plCover: (dataUri, idx, total, contains) => {
    const s = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="144" height="144" viewBox="0 0 144 144">` +
      `<defs><clipPath id="r"><rect width="144" height="144" rx="18"/></clipPath></defs>` +
      `<rect width="144" height="144" rx="18" fill="${C.bg}"/>` +
      `<image x="0" y="0" width="144" height="144" preserveAspectRatio="xMidYMid slice" clip-path="url(#r)" xlink:href="${dataUri}" href="${dataUri}"/>` +
      (contains ? `<rect width="144" height="144" rx="18" fill="#000" fill-opacity="0.45"/>` : '') +
      `<rect x="8" y="8" width="${total > 9 ? 54 : 44}" height="26" rx="13" fill="#000" fill-opacity="0.65"/>` +
      `<text x="${total > 9 ? 35 : 30}" y="27" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="15" font-weight="700" fill="#fff">${idx + 1}/${total}</text>` +
      (contains
        ? `<circle cx="116" cy="28" r="18" fill="${C.ok}"/><path d="M107 28 l6 6 l12 -12" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`
        : '') +
      `<rect x="3" y="3" width="138" height="138" rx="16" fill="none" stroke="${contains ? C.dim : C.accent}" stroke-width="6"/>` +
      `</svg>`;
    return 'data:image/svg+xml;charset=utf8,' + encodeURIComponent(s);
  },
  done: (t) => svg(label('✓', 74, 54, C.ok) + label(t, 126, 16)),
  fail: (t) => svg(label('✕', 74, 50, C.red) + label(t, 126, 15)),
};

module.exports = { IMG, setLang, t: (k) => T[k] || k };
