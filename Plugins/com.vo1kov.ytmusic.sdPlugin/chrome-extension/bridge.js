// Изолированный контент-скрипт: связывает page.js (мир страницы)
// с фоновой частью расширения, которая держит соединение с плагином.
(() => {
  const TAG = '__vo1kovYtsd';
  let port = null;

  function toPage(msg) {
    window.postMessage({ [TAG]: 'toPage', msg }, location.origin);
  }

  function connect() {
    try {
      port = chrome.runtime.connect({ name: 'vo1kov-ytsd' });
    } catch {
      // Расширение обновили/выключили — эта страница больше не может с ним говорить
      port = null;
      return;
    }
    port.onMessage.addListener(toPage);
    // Фон перезапустился (Chrome усыпил его) — переподключаемся
    port.onDisconnect.addListener(() => { port = null; setTimeout(connect, 1000); });
  }

  window.addEventListener('message', (ev) => {
    if (ev.source !== window || !ev.data || ev.data[TAG] !== 'toExt') return;
    if (port) { try { port.postMessage(ev.data.msg); } catch {} }
  });

  connect();
})();
