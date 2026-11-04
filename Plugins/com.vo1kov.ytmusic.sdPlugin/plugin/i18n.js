// Надписи на клавишах. Язык берётся из настроек Stream Dock (application.language).
const I18N = {
  en: {
    offline: 'not linked', offlineHint: 'press for setup', like: 'Like', liked: 'Liked', dislike: 'Dislike', disliked: 'Disliked',
    radio: 'Radio', mix: 'Supermix', playlist: 'Add to playlist', playlists: 'Playlists', pressAdd: 'press to add',
    hasIt: '✓ already in', added: 'Added', already: 'Already in', none: 'No playlists',
    NOT_PLAYING: 'Nothing playing', NOT_SIGNED_IN: 'Sign in', NOT_READY: 'Wait…', NO_REPLY: 'No reply', NO_TAB: 'Open YT Music', ERROR: 'Error',
  },
  ru: {
    offline: 'нет связи', offlineHint: 'жми: настройка', like: 'Лайк', liked: 'Нравится', dislike: 'Дизлайк', disliked: 'Не нравится',
    radio: 'Радио', mix: 'Супермикс', playlist: 'В плейлист', playlists: 'Плейлисты', pressAdd: 'жми — добавить',
    hasIt: '✓ уже там', added: 'Добавлено', already: 'Уже там', none: 'Нет плейлистов',
    NOT_PLAYING: 'Ничего не играет', NOT_SIGNED_IN: 'Войди в аккаунт', NOT_READY: 'Секунду…', NO_REPLY: 'Нет ответа', NO_TAB: 'Открой YT Music', ERROR: 'Ошибка',
  },
  de: {
    offline: 'nicht verbunden', offlineHint: 'drücken: Setup', like: 'Like', liked: 'Gefällt', dislike: 'Dislike', disliked: 'Gefällt nicht',
    radio: 'Radio', mix: 'Supermix', playlist: 'Zur Playlist', playlists: 'Playlists', pressAdd: 'drücken: hinzufügen',
    hasIt: '✓ schon drin', added: 'Hinzugefügt', already: 'Schon drin', none: 'Keine Playlists',
    NOT_PLAYING: 'Nichts läuft', NOT_SIGNED_IN: 'Anmelden', NOT_READY: 'Moment…', NO_REPLY: 'Keine Antwort', NO_TAB: 'YT Music öffnen', ERROR: 'Fehler',
  },
  fr: {
    offline: 'non connecté', offlineHint: 'appuyer: config', like: 'J’aime', liked: 'Aimé', dislike: 'Je n’aime pas', disliked: 'Pas aimé',
    radio: 'Radio', mix: 'Supermix', playlist: 'Ajouter', playlists: 'Playlists', pressAdd: 'appuyer: ajouter',
    hasIt: '✓ déjà dedans', added: 'Ajouté', already: 'Déjà dedans', none: 'Aucune playlist',
    NOT_PLAYING: 'Rien en lecture', NOT_SIGNED_IN: 'Connectez-vous', NOT_READY: 'Un instant…', NO_REPLY: 'Pas de réponse', NO_TAB: 'Ouvrir YT Music', ERROR: 'Erreur',
  },
  es: {
    offline: 'sin conexión', offlineHint: 'pulsa: configurar', like: 'Me gusta', liked: 'Te gusta', dislike: 'No me gusta', disliked: 'No te gusta',
    radio: 'Radio', mix: 'Supermix', playlist: 'A playlist', playlists: 'Playlists', pressAdd: 'pulsa: añadir',
    hasIt: '✓ ya está', added: 'Añadido', already: 'Ya está', none: 'Sin playlists',
    NOT_PLAYING: 'Nada sonando', NOT_SIGNED_IN: 'Inicia sesión', NOT_READY: 'Un momento…', NO_REPLY: 'Sin respuesta', NO_TAB: 'Abre YT Music', ERROR: 'Error',
  },
  zh: {
    offline: '未连接', offlineHint: '按下查看设置', like: '喜欢', liked: '已喜欢', dislike: '不喜欢', disliked: '已标记不喜欢',
    radio: '电台', mix: '超级合辑', playlist: '加入歌单', playlists: '歌单', pressAdd: '按下添加',
    hasIt: '✓ 已在歌单', added: '已添加', already: '已在歌单', none: '没有歌单',
    NOT_PLAYING: '未在播放', NOT_SIGNED_IN: '请登录', NOT_READY: '请稍候…', NO_REPLY: '无响应', NO_TAB: '打开 YT Music', ERROR: '错误',
  },
  ja: {
    offline: '未接続', offlineHint: '押して設定', like: '高評価', liked: '高評価済み', dislike: '低評価', disliked: '低評価済み',
    radio: 'ラジオ', mix: 'スーパーミックス', playlist: 'リストに追加', playlists: 'プレイリスト', pressAdd: '押して追加',
    hasIt: '✓ 追加済み', added: '追加しました', already: '追加済み', none: 'リストなし',
    NOT_PLAYING: '再生していません', NOT_SIGNED_IN: 'ログイン', NOT_READY: 'お待ちください', NO_REPLY: '応答なし', NO_TAB: 'YT Musicを開く', ERROR: 'エラー',
  },
  ko: {
    offline: '연결 안 됨', offlineHint: '눌러서 설정', like: '좋아요', liked: '좋아요 함', dislike: '싫어요', disliked: '싫어요 함',
    radio: '라디오', mix: '슈퍼믹스', playlist: '재생목록에 추가', playlists: '재생목록', pressAdd: '눌러서 추가',
    hasIt: '✓ 이미 있음', added: '추가됨', already: '이미 있음', none: '재생목록 없음',
    NOT_PLAYING: '재생 중 아님', NOT_SIGNED_IN: '로그인 필요', NOT_READY: '잠시만요…', NO_REPLY: '응답 없음', NO_TAB: 'YT Music 열기', ERROR: '오류',
  },
};

function pickLang(code) {
  const c = String(code || '').toLowerCase();
  if (c.startsWith('ru') || c.startsWith('uk') || c.startsWith('be')) return I18N.ru;
  for (const k of ['zh', 'ja', 'ko', 'de', 'fr', 'es']) if (c.startsWith(k)) return I18N[k];
  return I18N.en;
}

module.exports = { I18N, pickLang };
