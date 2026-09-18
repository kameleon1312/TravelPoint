import { io, type Socket } from 'socket.io-client';

const BASE_URL = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:4000';

export type SocketStatus = 'connected' | 'disconnected' | 'reconnecting';
type StatusHandler = (status: SocketStatus) => void;

class SocketManager {
  private _socket: Socket | null = null;
  private _listeners: Map<string, ((...args: unknown[]) => void)[]> = new Map();
  private _statusHandlers: Set<StatusHandler> = new Set();
  private _status: SocketStatus = 'disconnected';

  private _setStatus(s: SocketStatus) {
    this._status = s;
    this._statusHandlers.forEach((h) => h(s));
  }

  connect(token: string): Socket {
    if (this._socket?.connected) return this._socket;

    // Disconnect stale instance before reconnecting with fresh token
    this._socket?.disconnect();

    this._socket = io(BASE_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: 10,
      timeout: 10000,
    });

    // Re-attach persistent listeners after reconnect
    this._socket.on('connect', () => {
      this._setStatus('connected');
      this._listeners.forEach((handlers, event) => {
        handlers.forEach((fn) => this._socket?.on(event, fn));
      });
    });

    this._socket.on('disconnect', () => this._setStatus('disconnected'));
    this._socket.io.on('reconnect_attempt', () => this._setStatus('reconnecting'));
    this._socket.io.on('reconnect', () => this._setStatus('connected'));

    return this._socket;
  }

  onStatusChange(handler: StatusHandler): () => void {
    this._statusHandlers.add(handler);
    return () => this._statusHandlers.delete(handler);
  }

  get status(): SocketStatus { return this._status; }

  disconnect(): void {
    this._socket?.disconnect();
    this._socket = null;
    this._listeners.clear();
    this._setStatus('disconnected');
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
