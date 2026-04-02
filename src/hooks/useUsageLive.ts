"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { SSEEvent } from "@/types/usage";

interface UsageLiveState {
  committed: number;
  reserved: number;
  connected: boolean;
  error: string | null;
}

const MAX_BACKOFF_MS = 30_000;
const BASE_BACKOFF_MS = 1_000;
const MAX_RETRIES = 20;

export function useUsageLive(userId: number): UsageLiveState {
  const [state, setState] = useState<UsageLiveState>({
    committed: 0,
    reserved: 0,
    connected: false,
    error: null,
  });

  const retriesRef = useRef(0);
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    // EventSource does not support custom headers, so we pass userId
    // as a query param. In production, auth would come from cookies/session.
    const es = new EventSource(`/api/usage/live?userId=${userId}`);

    esRef.current = es;

    es.onopen = () => {
      retriesRef.current = 0;
      setState((prev) => ({ ...prev, connected: true, error: null }));
    };

    es.onmessage = (event) => {
      try {
        const data: SSEEvent = JSON.parse(event.data);
        if (data.type === "update") {
          setState((prev) => ({
            ...prev,
            committed: data.committed,
            reserved: data.reserved,
          }));
        } else if (data.type === "error") {
          setState((prev) => ({ ...prev, error: data.message }));
        }
      } catch {
        // Ignore malformed messages
      }
    };

    es.onerror = () => {
      es.close();
      setState((prev) => ({
        ...prev,
        connected: false,
        error: "Connection lost",
      }));

      // Stop retrying after MAX_RETRIES to avoid burning resources
      if (retriesRef.current >= MAX_RETRIES) {
        setState((prev) => ({
          ...prev,
          error: "Connection lost — max retries exceeded",
        }));
        return;
      }

      // Exponential backoff reconnect
      const delay = Math.min(
        BASE_BACKOFF_MS * 2 ** retriesRef.current,
        MAX_BACKOFF_MS
      );
      retriesRef.current++;
      reconnectTimerRef.current = setTimeout(connect, delay);
    };
  }, [userId]);

  useEffect(() => {
    connect();
    return () => {
      // Clear pending reconnect timer so we don't reconnect after unmount
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      esRef.current?.close();
    };
  }, [connect]);

  return state;
}
