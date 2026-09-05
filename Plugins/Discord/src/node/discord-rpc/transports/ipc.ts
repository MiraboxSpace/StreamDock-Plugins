import net from 'node:net';
import EventEmitter from 'node:events';
import { uuid } from '../util.js';

const OPCodes = {
  HANDSHAKE: 0,
  FRAME: 1,
  CLOSE: 2,
  PING: 3,
  PONG: 4,
} as const;

type OPCode = (typeof OPCodes)[keyof typeof OPCodes];

function getIPCPath(id: number): string {
  if (process.platform === 'win32') {
    return `\\\\?\\pipe\\discord-ipc-${id}`;
  }
  const { env } = process;
  const { XDG_RUNTIME_DIR, TMPDIR, TMP, TEMP } = env;
  const prefix = XDG_RUNTIME_DIR || TMPDIR || TMP || TEMP || '/tmp';
  return `${prefix.replace(/\/$/, '')}/discord-ipc-${id}`;
}

function getIPC(id = 0): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    const path = getIPCPath(id);
    const onerror = () => {
      if (id < 10) {
        resolve(getIPC(id + 1));
      } else {
        reject(new Error('Could not connect'));
      }
    };
    const sock = net.createConnection(path, () => {
      sock.removeListener('error', onerror);
      resolve(sock);
    });
    sock.once('error', onerror);
  });
}

async function findEndpoint(tries = 0): Promise<string> {
  if (tries > 30) {
    throw new Error('Could not find endpoint');
  }
  const endpoint = `http://127.0.0.1:${6463 + (tries % 10)}`;
  try {
    const r = await fetch(endpoint);
    if (r.status === 404) {
      return endpoint;
    }
    return findEndpoint(tries + 1);
  } catch {
    return findEndpoint(tries + 1);
  }
}

export function encode(op: OPCode, data: unknown): Buffer {
  const str = JSON.stringify(data);
  const len = Buffer.byteLength(str);
  const packet = Buffer.alloc(8 + len);
  packet.writeInt32LE(op, 0);
  packet.writeInt32LE(len, 4);
  packet.write(str, 8, len);
  return packet;
}

interface Working {
  full: string;
  op: number | undefined;
}

const working: Working = {
  full: '',
  op: undefined,
};

interface IPCTransportClient {
  clientId: string | null;
  fetch: { endpoint: string };
  request: {
    (cmd: string, args?: unknown, evt?: string): Promise<unknown>;
    endpoint: string;
  };
  emit(event: string, ...args: unknown[]): void;
}

type DecodeCallback = (payload: { op: OPCode; data: unknown }) => void;

export function decode(socket: net.Socket, callback: DecodeCallback, temp = false): void {
  if (temp === false) {
    working.full = '';
  }
  const packet = socket.read();
  if (!packet) {
    return;
  }

  let { op } = working;
  let raw: string | Buffer;
  if (working.full === '') {
    op = working.op = packet.readInt32LE(0);
    const len = packet.readInt32LE(4);
    raw = packet.slice(8, len + 8);
  } else {
    raw = packet.toString();
  }

  try {
    const data = JSON.parse(working.full + raw);
    callback({ op: op! as OPCode, data });
    working.full = '';
    working.op = undefined;
  } catch {
    working.full += raw;
  }

  decode(socket, callback, true);
}

export default class IPCTransport extends EventEmitter {
  client: IPCTransportClient;
  socket: net.Socket | null = null;
  private closed = false;

  constructor(client: IPCTransportClient) {
    super();
    this.client = client;
  }

  async connect(): Promise<void> {
    this.closed = false;
    const socket = (this.socket = await getIPC());
    socket.on('close', this.onClose.bind(this));
    socket.on('error', this.onClose.bind(this));
    this.emit('open');
    socket.write(
      encode(OPCodes.HANDSHAKE, {
        v: 1,
        client_id: this.client.clientId,
      }),
    );
    socket.pause();
    socket.on('readable', () => {
      decode(socket, ({ op, data }) => {
        switch (op) {
          case OPCodes.PING:
            this.send(data, OPCodes.PONG);
            break;
          case OPCodes.FRAME:
            if (!data) {
              return;
            }
            if ((data as any).cmd === 'AUTHORIZE' && (data as any).evt !== 'ERROR') {
              findEndpoint()
                .then((endpoint) => {
                  this.client.request.endpoint = endpoint;
                })
                .catch((e) => {
                  this.client.emit('error', e);
                });
            }
            this.emit('message', data);
            break;
          case OPCodes.CLOSE:
            this.emit('close', data);
            break;
          default:
            break;
        }
      });
    });
  }

  onClose(e: Error): void {
    if (this.closed) return;
    this.closed = true;
    this.socket = null;
    this.emit('close', e);
  }

  send(data: unknown, op: OPCode = OPCodes.FRAME): void {
    if (!this.socket || this.socket.destroyed || !this.socket.writable) return;
    this.socket.write(encode(op, data));
  }

  async close(): Promise<void> {
    if (!this.socket || this.closed) {
      this.socket = null;
      this.closed = true;
      return;
    }
    const socket = this.socket;
    this.closed = true;
    this.socket = null;
    return new Promise((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        resolve();
      };
      const timeout = setTimeout(done, 1000);
      timeout.unref?.();
      socket.once('close', done);
      try {
        if (!socket.destroyed && socket.writable) socket.write(encode(OPCodes.CLOSE, {}));
        socket.end();
      } catch {
        socket.destroy();
        done();
      }
    });
  }

  ping(): void {
    this.send(uuid(), OPCodes.PING);
  }
}
