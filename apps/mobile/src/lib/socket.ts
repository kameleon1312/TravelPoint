import { io, type Socket } from 'socket.io-client';

const BASE_URL = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:4000';

class SocketManager {
  private _socket: Socket | null = null;
  private _listeners: Map<string, ((...args: unknown[]) => void)[]> = new Map();

  connect(token: string): Socket {
    if (this._socket?.connected) return this._socket;

    // Disconnect stale instance before reconnecting with fresh token
    this._socket?.disconnect();

    this._socket = io(BASE_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    // Re-attach persistent listeners after reconnect
    this._socket.on('connect', () => {
      this._listeners.forEach((handlers, event) => {
        handlers.forEach((fn) => this._socket?.on(event, fn));
      });
    });

    return this._socket;
  }

  disconnect(): void {
    this._socket?.disconnect();
    this._socket = null;
    this._listeners.clear();
  }

  on(event: string, handler: (...args: unknown[]) => void): void {
    if (!this._listeners.has(event)) this._listeners.set(event, []);
    this._listeners.get(event)!.push(handler);
    this._socket?.on(event, handler);
  }

  off(event: string, handler: (...args: unknown[]) => void): void {
    const handlers = this._listeners.get(event) ?? [];
    this._listeners.set(event, handlers.filter((h) => h !== handler));
    this._socket?.off(event, handler);
  }

  emit(event: string, ...args: unknown[]): void {
    this._socket?.emit(event, ...args);
  }

  get isConnected(): boolean {
    return this._socket?.connected ?? false;
  }

  get socket(): Socket | null {
    return this._socket;
  }
}

export const socketManager = new SocketManager();
