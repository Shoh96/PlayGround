export class ArenaClient {
  constructor() {
    this.ws = null;
    this.status = 'idle';
    this.handlers = new Map();
    this.room = null;
    this.playerId = null;
    this.retries = 0;
    this.manualClose = false;
    this.pingTimer = null;
    this.clientId = this.loadClientId();
  }

  loadClientId() {
    try {
      let id = localStorage.getItem('scripture-showdown.client-id');
      if (!id) {
        id = crypto.randomUUID ? crypto.randomUUID() : `guest-${Math.random().toString(36).slice(2)}`;
        localStorage.setItem('scripture-showdown.client-id', id);
      }
      return id;
    } catch {
      return `guest-${Math.random().toString(36).slice(2)}`;
    }
  }

  on(type, handler) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type).add(handler);
    return () => this.handlers.get(type)?.delete(handler);
  }

  emit(type, detail) {
    for (const handler of this.handlers.get(type) || []) {
      try { handler(detail); } catch (error) { console.error(error); }
    }
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    this.manualClose = false;
    this.status = 'connecting';
    this.emit('status', { status: 'connecting' });
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${protocol}://${location.host}/ws`);
    this.ws = ws;

    ws.addEventListener('open', () => {
      this.status = 'online';
      this.retries = 0;
      this.emit('status', { status: 'online' });
      this.pingTimer = setInterval(() => this.send({ type: 'ping' }), 20000);
    });

    ws.addEventListener('message', event => {
      let data;
      try { data = JSON.parse(event.data); } catch { return; }
      if (data.type === 'hello') {
        this.emit('hello', data);
        return;
      }
      if (data.type === 'joined') {
        this.room = data.room;
        this.playerId = data.playerId;
        this.emit('joined', data);
      }
      if (data.type === 'room') {
        this.room = data.room;
      }
      this.emit(data.type, data);
    });

    ws.addEventListener('close', () => {
      this.status = 'offline';
      clearInterval(this.pingTimer);
      this.emit('status', { status: 'offline' });
      if (!this.manualClose && this.retries < 3) {
        this.retries += 1;
        setTimeout(() => this.connect(), 1000 * this.retries);
      }
    });

    ws.addEventListener('error', () => {
      this.emit('socketError', { message: 'The arena connection was interrupted.' });
    });
  }

  send(payload) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.emit('sendError', { message: 'You are not connected to the arena.' });
      return false;
    }
    this.ws.send(JSON.stringify(payload));
    return true;
  }

  create({ name, avatar, settings }) {
    return this.send({ type: 'create', name, avatar, settings, clientId: this.clientId });
  }

  quick({ name, avatar, settings }) {
    return this.send({ type: 'quick', name, avatar, settings, clientId: this.clientId });
  }

  join({ code, name, avatar }) {
    return this.send({ type: 'join', code, name, avatar, clientId: this.clientId });
  }

  updateSettings(settings) {
    return this.send({ type: 'settings', settings });
  }

  start() {
    return this.send({ type: 'start' });
  }

  answer(choice, remainingMs) {
    return this.send({ type: 'answer', choice, remainingMs });
  }

  react(emoji) {
    return this.send({ type: 'react', emoji });
  }

  rematch() {
    return this.send({ type: 'rematch' });
  }

  addBot() {
    return this.send({ type: 'addBot' });
  }

  removeBot(botId) {
    return this.send({ type: 'removeBot', botId });
  }

  leave() {
    this.send({ type: 'leave' });
    this.room = null;
    this.playerId = null;
  }

  disconnect() {
    this.manualClose = true;
    clearInterval(this.pingTimer);
    if (this.ws) this.ws.close();
    this.ws = null;
    this.status = 'offline';
  }
}

export function isOnlineSupported() {
  return typeof WebSocket !== 'undefined';
}
