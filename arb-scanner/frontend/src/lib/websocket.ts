const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

function getWsUrl(): string {
  return API_BASE.replace(/^https/, "wss").replace(/^http(?!s)/, "ws") + "/ws";
}

export interface PriceUpdate {
  match_id: number;
  poly_yes: number;
  poly_no: number;
  kalshi_yes: number;
  kalshi_no: number;
  last_updated: string;
}

type PriceCallback = (update: PriceUpdate) => void;

class WSManager {
  private ws: WebSocket | null = null;
  private listeners: Map<number, Set<PriceCallback>> = new Map();
  private subscribedIds: Set<number> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1_000;
  private intentionalClose = false;

  private connect(): void {
    if (
      this.ws !== null &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.intentionalClose = false;
    const ws = new WebSocket(getWsUrl());
    this.ws = ws;

    ws.onopen = () => {
      this.reconnectDelay = 1_000; // reset backoff on successful connect
      // Re-subscribe all active IDs (handles reconnect case)
      const ids = Array.from(this.subscribedIds);
      if (ids.length > 0) {
        this.send({ action: "subscribe", match_ids: ids });
      }
    };

    ws.onmessage = (event: MessageEvent) => {
      this.onMessage(event);
    };

    ws.onclose = () => {
      this.ws = null;
      if (!this.intentionalClose && this.listeners.size > 0) {
        this.scheduleReconnect();
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer !== null) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30_000);
      this.connect();
    }, this.reconnectDelay);
  }

  disconnect(): void {
    this.intentionalClose = true;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }

  subscribe(matchId: number, cb: PriceCallback): () => void {
    // Ensure listener set exists
    if (!this.listeners.has(matchId)) {
      this.listeners.set(matchId, new Set());
    }
    this.listeners.get(matchId)!.add(cb);

    // Lazy connect on first subscription
    if (this.ws === null || this.ws.readyState === WebSocket.CLOSED) {
      this.connect();
    }

    // Send subscribe message if this is a new matchId
    if (!this.subscribedIds.has(matchId)) {
      this.subscribedIds.add(matchId);
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ action: "subscribe", match_ids: [matchId] });
      }
      // If connecting, onopen will batch-subscribe all subscribedIds
    }

    return () => {
      const set = this.listeners.get(matchId);
      if (set) {
        set.delete(cb);
        if (set.size === 0) {
          this.listeners.delete(matchId);
          this.subscribedIds.delete(matchId);
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.send({ action: "unsubscribe", match_ids: [matchId] });
          }
        }
      }
      // Disconnect when all listeners are gone
      if (this.listeners.size === 0) {
        this.disconnect();
      }
    };
  }

  private send(msg: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private onMessage(event: MessageEvent): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let data: any;
    try {
      data = JSON.parse(event.data as string);
    } catch {
      return;
    }

    if (data.type === "price_update" && typeof data.match_id === "number") {
      const update: PriceUpdate = {
        match_id: data.match_id,
        poly_yes: data.poly_yes,
        poly_no: data.poly_no,
        kalshi_yes: data.kalshi_yes,
        kalshi_no: data.kalshi_no,
        last_updated: data.last_updated,
      };
      const cbs = this.listeners.get(update.match_id);
      if (cbs) {
        cbs.forEach((cb) => cb(update));
      }
    }
  }
}

export const wsManager = new WSManager();
