// Основной мир страницы YouTube Music: читает плеер, выполняет команды
// от плагина Stream Dock через внутренний API (youtubei) от твоего аккаунта.
(() => {
  const TAG = '__vo1kovYtsd';
  // Запасной ID «Моего супермикса», если не нашли его на главной
  const SUPERMIX_FALLBACK = 'RDTMAK5uy_kset8DisdE7LSD4TNjEVvrKRTmG7a56sY';
  const SUPERMIX_RE = /supermix|супермикс|супермікс|my mix|мой микс|мій мікс/i;
  let lastSent = '';
  let supermixId = null;

  // ---------- связь с bridge.js ----------
  function send(msg) {
    window.postMessage({ [TAG]: 'toExt', msg }, location.origin);
  }
  window.addEventListener('message', async (ev) => {
    if (ev.source !== window || !ev.data || ev.data[TAG] !== 'toPage') return;
    const msg = ev.data.msg;
    if (msg.type === 'connected') { lastSent = ''; pushState(true); return; }
    if (msg.type !== 'cmd') return;
    try {
      const data = await run(msg.cmd, msg.arg);
      send({ type: 'result', id: msg.id, ok: true, data });
    } catch (e) {
      console.warn('[YT Music → Stream Dock]', msg.cmd, e);
      const err = String(e && e.message || e);
      send({ type: 'result', id: msg.id, ok: false, code: /^[A-Z_]+$/.test(err) ? err : 'ERROR', error: err });
    }
    setTimeout(() => pushState(true), 400);
  });

  // ---------- состояние плеера ----------
  function player() { return document.getElementById('movie_player'); }
  function likeRenderer() { return document.querySelector('#like-button-renderer'); }

  function getTrack() {
    const p = player();
    const vd = p && p.getVideoData ? p.getVideoData() : null;
    if (!vd || !vd.video_id) return null;
    return {
      videoId: vd.video_id,
      title: vd.title || '',
      artist: vd.author || '',
      playing: p.getPlayerState ? p.getPlayerState() === 1 : false,
    };
  }

  function getLike() {
    const r = likeRenderer();
    const s = r && r.getAttribute('like-status');
    return s === 'LIKE' || s === 'DISLIKE' ? s : 'INDIFFERENT';
  }

  function pushState(force) {
    const track = getTrack();
    const state = { type: 'state', track, like: track ? getLike() : 'INDIFFERENT', focused: document.hasFocus() };
    const key = JSON.stringify(state);
    if (!force && key === lastSent) return;
    lastSent = key;
    send(state);
  }
  setInterval(() => pushState(false), 1000);

  // ---------- внутренний API youtubei ----------
  function cfg(k) { return window.ytcfg && window.ytcfg.get ? window.ytcfg.get(k) : undefined; }

  function cookie(name) {
    const m = document.cookie.match(new RegExp('(?:^|;\\s*)' + name.replace(/[$]/g, '\\$') + '=([^;]+)'));
    return m ? decodeURIComponent(m[1]) : null;
  }

  async function sha1hex(str) {
    const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(str));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  async function authHeader() {
    const sapisid = cookie('SAPISID') || cookie('__Secure-3PAPISID');
    if (!sapisid) throw new Error('NOT_SIGNED_IN');
    const ts = Math.floor(Date.now() / 1000);
    return `SAPISIDHASH ${ts}_${await sha1hex(`${ts} ${sapisid} ${location.origin}`)}`;
  }

  async function api(path, body) {
    const key = cfg('INNERTUBE_API_KEY');
    const context = cfg('INNERTUBE_CONTEXT');
    if (!context) throw new Error('NOT_READY');
    const headers = {
      'Content-Type': 'application/json',
      Authorization: await authHeader(),
      'X-Origin': location.origin,
      'X-Goog-AuthUser': String(cfg('SESSION_INDEX') || 0),
    };
    const visitor = cfg('VISITOR_DATA');
    if (visitor) headers['X-Goog-Visitor-Id'] = visitor;
    const clientName = cfg('INNERTUBE_CONTEXT_CLIENT_NAME');
    if (clientName) headers['X-Youtube-Client-Name'] = String(clientName);
    const clientVersion = cfg('INNERTUBE_CLIENT_VERSION');
    if (clientVersion) headers['X-Youtube-Client-Version'] = clientVersion;

    const url = `/youtubei/v1/${path}?prettyPrint=false${key ? '&key=' + key : ''}`;
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify({ context, ...body }),
    });
    if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
    return res.json();
  }

  // Обход JSON: собрать все объекты с ключом name
  function collect(obj, name, out = []) {
    if (!obj || typeof obj !== 'object') return out;
    if (Array.isArray(obj)) { for (const x of obj) collect(x, name, out); return out; }
    for (const k of Object.keys(obj)) {
      if (k === name) out.push(obj[k]);
      collect(obj[k], name, out);
    }
    return out;
  }
  function text(t) { return t ? (t.simpleText || (t.runs || []).map((r) => r.text).join('')) : ''; }

  // ---------- команды ----------
  async function run(cmd, arg) {
    switch (cmd) {
      case 'like': return clickLike('like');
      case 'dislike': return clickLike('dislike');
      case 'playlists': return getPlaylists();
      case 'addToPlaylist': return addToPlaylist(arg);
      case 'radio': return startRadio();
      case 'supermix': return startSupermix();
      default: throw new Error('UNKNOWN_COMMAND');
    }
  }

  async function clickLike(kind) {
    const r = likeRenderer();
    const btn = r && r.querySelector(`#button-shape-${kind} button`);
    if (btn) { btn.click(); return { like: null }; }
    // Запасной путь — через API (интерфейс обновится при следующем треке)
    const t = getTrack();
    if (!t) throw new Error('NOT_PLAYING');
    const cur = getLike();
    const want = kind === 'like' ? 'LIKE' : 'DISLIKE';
    const path = cur === want ? 'like/removelike' : kind === 'like' ? 'like/like' : 'like/dislike';
    await api(path, { target: { videoId: t.videoId } });
    if (r && r.updateLikeStatus) r.updateLikeStatus(cur === want ? 'INDIFFERENT' : want);
    return { like: cur === want ? 'INDIFFERENT' : want };
  }

  async function getPlaylists() {
    const t = getTrack();
    if (!t) throw new Error('NOT_PLAYING');
    const res = await api('playlist/get_add_to_playlist', { videoIds: [t.videoId], excludeWatchLater: true });
    const items = collect(res, 'playlistAddToOptionRenderer')
      .filter((p) => p.playlistId && p.playlistId !== 'LM' && p.playlistId !== 'WL')
      .map((p) => ({ id: p.playlistId, title: text(p.title), contains: p.containsSelectedVideos === 'ALL' }));
    try {
      const covers = await getCovers(items.map((i) => i.id));
      for (const i of items) i.thumb = covers[i.id] || null;
    } catch (e) {
      console.warn('[YT Music → Stream Dock] covers', e);
    }
    return { videoId: t.videoId, items };
  }

  // ---------- обложки плейлистов ----------
  const coverCache = {};
  let coverCacheAt = 0;

  function bestThumb(node) {
    const lists = collect(node, 'thumbnails').filter((a) => Array.isArray(a) && a.length);
    if (!lists.length) return null;
    const th = lists[0].slice().sort((a, b) => (b.width || 0) - (a.width || 0))[0];
    let url = th && th.url;
    if (!url) return null;
    if (url.startsWith('//')) url = 'https:' + url;
    // Картинки googleusercontent можно запросить нужного размера
    return url.replace(/=w\d+-h\d+[^/]*$/, '=w288-h288-l90-rj');
  }

  async function getCovers(ids) {
    if (Date.now() - coverCacheAt > 5 * 60 * 1000) {
      for (const k of Object.keys(coverCache)) delete coverCache[k];
      coverCacheAt = Date.now();
      // Библиотека плейлистов: тут обложки сразу у всех (первая страница)
      try {
        const lib = await api('browse', { browseId: 'FEmusic_liked_playlists' });
        for (const item of collect(lib, 'musicTwoRowItemRenderer')) {
          const b = collect(item.navigationEndpoint, 'browseEndpoint').map((e) => e.browseId).find((x) => x && x.startsWith('VL'));
          const url = bestThumb(item.thumbnailRenderer);
          if (b && url) coverCache[b.slice(2)] = url;
        }
      } catch (e) {
        console.warn('[YT Music → Stream Dock] library', e);
      }
    }
    // Чего нет в первой странице библиотеки — открываем сам плейлист
    const missing = ids.filter((id) => !(id in coverCache)).slice(0, 20);
    await Promise.all(missing.map(async (id) => {
      try {
        const pl = await api('browse', { browseId: 'VL' + id });
        const header = collect(pl, 'musicResponsiveHeaderRenderer')[0] || collect(pl, 'musicDetailHeaderRenderer')[0]
          || collect(pl, 'musicEditablePlaylistDetailHeaderRenderer')[0] || pl.header || pl;
        coverCache[id] = bestThumb(header);
      } catch {
        coverCache[id] = null;
      }
    }));
    const out = {};
    for (const id of ids) out[id] = coverCache[id] || null;
    return out;
  }

  async function addToPlaylist(playlistId) {
    const t = getTrack();
    if (!t) throw new Error('NOT_PLAYING');
    const res = await api('browse/edit_playlist', {
      playlistId,
      actions: [{ action: 'ACTION_ADD_VIDEO', addedVideoId: t.videoId, dedupeOption: 'DEDUPE_OPTION_SKIP' }],
    });
    if (res.status && res.status !== 'STATUS_SUCCEEDED') throw new Error(res.status);
    return { ok: true };
  }

  // Переход внутри приложения без перезагрузки; если не сработал — обычный переход
  function navigate(watchEndpoint) {
    const before = player() && player().getPlaylistId ? player().getPlaylistId() : null;
    const app = document.querySelector('ytmusic-app');
    const target = document.querySelector('ytmusic-player-bar') || app;
    if (target) {
      target.dispatchEvent(new CustomEvent('yt-navigate', {
        bubbles: true, composed: true,
        detail: { endpoint: { watchEndpoint } },
      }));
    }
    setTimeout(() => {
      const now = player() && player().getPlaylistId ? player().getPlaylistId() : null;
      if (now === watchEndpoint.playlistId || (now && now !== before)) return;
      const q = new URLSearchParams();
      if (watchEndpoint.videoId) q.set('v', watchEndpoint.videoId);
      q.set('list', watchEndpoint.playlistId);
      location.href = `/watch?${q}`;
    }, 2500);
  }

  async function startRadio() {
    const t = getTrack();
    if (!t) throw new Error('NOT_PLAYING');
    navigate({ videoId: t.videoId, playlistId: 'RDAMVM' + t.videoId, params: 'wAEB' });
    return { ok: true };
  }

  async function findSupermix() {
    if (supermixId) return supermixId;
    try {
      const home = await api('browse', { browseId: 'FEmusic_home' });
      for (const item of collect(home, 'musicTwoRowItemRenderer')) {
        if (!SUPERMIX_RE.test(text(item.title))) continue;
        const ids = [
          ...collect(item, 'watchPlaylistEndpoint'),
          ...collect(item, 'watchEndpoint'),
        ].map((e) => e.playlistId).filter(Boolean);
        if (ids.length) { supermixId = ids[0]; return supermixId; }
        const browse = collect(item, 'browseEndpoint').map((e) => e.browseId).find((b) => b && b.startsWith('VL'));
        if (browse) { supermixId = browse.slice(2); return supermixId; }
      }
    } catch (e) {
      console.warn('[YT Music → Stream Dock] supermix lookup', e);
    }
    return SUPERMIX_FALLBACK;
  }

  async function startSupermix() {
    const id = await findSupermix();
    navigate({ playlistId: id });
    return { playlistId: id };
  }
})();
