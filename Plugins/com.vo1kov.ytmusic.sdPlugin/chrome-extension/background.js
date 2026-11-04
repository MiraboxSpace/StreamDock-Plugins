// Фоновая часть расширения: держит WebSocket к плагину Stream Dock.
// Соединение идёт отсюда, а не со страницы: Chrome не пускает сайты к 127.0.0.1
// (Local Network Access), а расширению с разрешением на 127.0.0.1 можно.
const PORT = 39871;

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'vo1kov-ytsd') return;
  let ws = null;
  let retry = null;
  let alive = true;

  function connect() {
    clearTimeout(retry);
    if (!alive) return;
    try {
      ws = new WebSocket(`ws://127.0.0.1:${PORT}`);
    } catch {
      retry = setTimeout(connect, 3000);
      return;
    }
    ws.onopen = () => safePost({ type: 'connected' });
    ws.onmessage = (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.type === 'ping') return; // плагин пингует, чтобы фон не засыпал
      safePost(msg);
    };
    ws.onclose = () => { ws = null; if (alive) retry = setTimeout(connect, 3000); };
    ws.onerror = () => { try { ws.close(); } catch {} };
  }

  function safePost(msg) {
    try { port.postMessage(msg); } catch {}
  }

  port.onMessage.addListener((msg) => {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  });

  port.onDisconnect.addListener(() => {
    alive = false;
    clearTimeout(retry);
    if (ws) { try { ws.close(); } catch {} }
  });

  connect();
});
