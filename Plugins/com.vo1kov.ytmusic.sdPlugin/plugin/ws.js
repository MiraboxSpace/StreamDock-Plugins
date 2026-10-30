// Минимальный WebSocket (RFC 6455) без зависимостей: клиент к Stream Dock и сервер для расширения.
const net = require('net');
const http = require('http');
const crypto = require('crypto');
const { EventEmitter } = require('events');

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

class Conn extends EventEmitter {
  constructor(socket, maskOutgoing) {
    super();
    this.socket = socket;
    this.mask = maskOutgoing;
    this.buf = Buffer.alloc(0);
    this.frags = [];
    this.open = true;
    socket.on('data', (d) => { this.buf = Buffer.concat([this.buf, d]); this._parse(); });
    socket.on('close', () => this._closed());
    socket.on('error', () => this._closed());
  }

  _closed() {
    if (!this.open) return;
    this.open = false;
    this.emit('close');
  }

  _parse() {
    while (this.buf.length >= 2) {
      const b0 = this.buf[0], b1 = this.buf[1];
      const fin = (b0 & 0x80) !== 0, op = b0 & 0x0f, masked = (b1 & 0x80) !== 0;
      let len = b1 & 0x7f, off = 2;
      if (len === 126) { if (this.buf.length < 4) return; len = this.buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (this.buf.length < 10) return; len = Number(this.buf.readBigUInt64BE(2)); off = 10; }
      const need = off + (masked ? 4 : 0) + len;
      if (this.buf.length < need) return;
      let payload = this.buf.subarray(off + (masked ? 4 : 0), need);
      if (masked) {
        const key = this.buf.subarray(off, off + 4);
        payload = Buffer.from(payload);
        for (let i = 0; i < payload.length; i++) payload[i] ^= key[i & 3];
      }
      this.buf = this.buf.subarray(need);

      if (op === 0x8) { this._write(0x8, Buffer.alloc(0)); this.socket.end(); this._closed(); return; }
      if (op === 0x9) { this._write(0xA, payload); continue; }
      if (op === 0xA) continue;
      if (op === 0x1 || op === 0x2 || op === 0x0) {
        this.frags.push(Buffer.from(payload));
        if (fin) {
          const all = Buffer.concat(this.frags);
          this.frags = [];
          this.emit('message', all.toString('utf8'));
        }
      }
    }
  }

  _write(op, data) {
    if (!this.open) return;
    const len = data.length;
    let head;
    if (len < 126) { head = Buffer.alloc(2); head[1] = len; }
    else if (len < 65536) { head = Buffer.alloc(4); head[1] = 126; head.writeUInt16BE(len, 2); }
    else { head = Buffer.alloc(10); head[1] = 127; head.writeBigUInt64BE(BigInt(len), 2); }
    head[0] = 0x80 | op;
    if (this.mask) {
      head[1] |= 0x80;
      const key = crypto.randomBytes(4);
      const out = Buffer.from(data);
      for (let i = 0; i < out.length; i++) out[i] ^= key[i & 3];
      this.socket.write(Buffer.concat([head, key, out]));
    } else {
      this.socket.write(Buffer.concat([head, data]));
    }
  }

  send(str) { this._write(0x1, Buffer.from(str, 'utf8')); }
  close() { try { this._write(0x8, Buffer.alloc(0)); this.socket.end(); } catch {} this._closed(); }
}

function connect(port, onOpen) {
  const key = crypto.randomBytes(16).toString('base64');
  const socket = net.connect(port, '127.0.0.1');
  const holder = new EventEmitter();
  let head = Buffer.alloc(0);
  const onData = (d) => {
    head = Buffer.concat([head, d]);
    const end = head.indexOf('\r\n\r\n');
    if (end < 0) return;
    socket.removeListener('data', onData);
    const conn = new Conn(socket, true);
    holder.conn = conn;
    conn.on('message', (m) => holder.emit('message', m));
    conn.on('close', () => holder.emit('close'));
    const rest = head.subarray(end + 4);
    if (rest.length) socket.emit('data', rest);
    onOpen(conn);
  };
  socket.on('data', onData);
  socket.on('error', () => holder.emit('close'));
  socket.on('connect', () => {
    socket.write(
      `GET / HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n` +
      `Sec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`
    );
  });
  return holder;
}

function createServer(port, onConn, onError) {
  const server = http.createServer((req, res) => { res.writeHead(426); res.end('WebSocket only'); });
  server.on('upgrade', (req, socket) => {
    const origin = req.headers.origin || '';
    // Пускаем только страницы YouTube Music (и расширения Chrome)
    if (origin && origin !== 'https://music.youtube.com' && !origin.startsWith('chrome-extension://')) {
      socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');
      return;
    }
    const key = req.headers['sec-websocket-key'];
    if (!key) { socket.destroy(); return; }
    const accept = crypto.createHash('sha1').update(key + GUID).digest('base64');
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
    );
    socket.setNoDelay(true);
    onConn(new Conn(socket, false), origin);
  });
  server.on('error', onError);
  server.listen(port, '127.0.0.1');
  return server;
}

module.exports = { connect, createServer };
