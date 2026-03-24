import { getWebSocketUrl } from './api';

type SocketCallback = (data: any) => void;

class SocketManager {
  private socket: WebSocket | null = null;
  private listeners: Map<string, Set<SocketCallback>> = new Map();
  private reconnectTimeout: any = null;

  constructor() {
    this.connect();
  }

  private connect() {
    // Use env var in production so WS goes to Railway, not Vercel
    const wsUrl = import.meta.env.VITE_WS_URL ?? 
      `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}`;
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      console.log("WS: Connected to server");
    };

    this.socket.onmessage = (event) => {
      try {
        const { type, payload } = JSON.parse(event.data);
        const typeListeners = this.listeners.get(type);
        if (typeListeners) {
          typeListeners.forEach((callback) => callback(payload));
        }
      } catch (e) {
        console.error("WS: Failed to parse message", e);
      }
    };

    this.socket.onclose = () => {
      console.log("WS: Disconnected from server, reconnecting...");
      if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = setTimeout(() => this.connect(), 3000);
    };

    this.socket.onerror = (error) => {
      console.error("WS: Socket error", error);
    };
  }

  on(type: string, callback: SocketCallback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);
    return () => this.off(type, callback);
  }

  off(type: string, callback: SocketCallback) {
    const typeListeners = this.listeners.get(type);
    if (typeListeners) {
      typeListeners.delete(callback);
    }
  }
}

export const socket = new SocketManager();
