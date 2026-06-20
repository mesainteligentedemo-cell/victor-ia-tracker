/**
 * ==========================================
 * WEBSOCKET CLIENT — Real-time Data Sync
 * ==========================================
 * Conecta los dashboards al API server via WebSocket
 * Recibe updates en tiempo real sin polling
 */

class TrackerWebSocketClient {
  constructor(url = null) {
    this.url = url || this.getWebSocketURL();
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
    this.listeners = {};
    this.cachedData = {};

    this.init();
  }

  getWebSocketURL() {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host.replace('tracker.victor-ia.xyz', 'localhost:3456');
    return `${proto}//${host}`;
  }

  init() {
    this.connect();
  }

  connect() {
    if (this.isConnected) return;

    console.log(`[WS-CLIENT] Connecting to ${this.url}...`);

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => this.onOpen();
      this.ws.onmessage = (event) => this.onMessage(event);
      this.ws.onerror = (error) => this.onError(error);
      this.ws.onclose = () => this.onClose();
    } catch (err) {
      console.error('[WS-CLIENT] Connection error:', err);
      this.scheduleReconnect();
    }
  }

  onOpen() {
    console.log('[WS-CLIENT] Connected!');
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.emit('connected', this.cachedData);
  }

  onMessage(event) {
    try {
      const message = JSON.parse(event.data);

      // Cache all data
      if (message.data) {
        this.cachedData = { ...this.cachedData, ...message.data };
      }

      console.log(`[WS-CLIENT] Received:`, message.type);

      // Emit specific events
      if (message.type === 'data-update') {
        this.emit('data-update', message.data);
        this.emit('loops', message.data.loops);
        this.emit('context', message.data.context);
        this.emit('projects', message.data.projects);
      } else if (message.type === 'alert') {
        this.emit('alert', message.data);
      } else if (message.type === 'connected') {
        this.emit('init-data', message.data);
      } else {
        this.emit(message.type, message.data);
      }
    } catch (err) {
      console.error('[WS-CLIENT] Parse error:', err);
    }
  }

  onError(error) {
    console.error('[WS-CLIENT] Error:', error);
  }

  onClose() {
    console.log('[WS-CLIENT] Disconnected');
    this.isConnected = false;
    this.scheduleReconnect();
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WS-CLIENT] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;
    console.log(`[WS-CLIENT] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => this.connect(), delay);
  }

  send(message) {
    if (!this.isConnected) {
      console.warn('[WS-CLIENT] Not connected, queueing message');
      return false;
    }

    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (err) {
      console.error('[WS-CLIENT] Send error:', err);
      return false;
    }
  }

  // Event emitter pattern
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event, data) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(callback => {
      try {
        callback(data);
      } catch (err) {
        console.error(`[WS-CLIENT] Error in listener for ${event}:`, err);
      }
    });
  }

  // Helper: Get cached data
  getData(key) {
    return this.cachedData[key];
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Global instance
window.TrackerWS = null;

// Auto-init on page load
window.addEventListener('DOMContentLoaded', () => {
  if (!window.TrackerWS) {
    window.TrackerWS = new TrackerWebSocketClient();
    console.log('[WS-CLIENT] Global instance created');
  }
});

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TrackerWebSocketClient;
}