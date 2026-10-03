'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  BridgePublicStatus,
  BridgeCondition,
  BridgeConditionType,
  FreshnessState,
  FreshnessStateType,
  ConnectionState,
  ConnectionStateType,
} from '@bridge/contracts';
import { apiClient } from '../../lib/api';
import { compareRevisions, calculateFreshness } from '@bridge/domain';

export interface UseBridgeStatusOptions {
  bridgeId: string;
  initialStatus?: BridgePublicStatus | null;
  pollingIntervalMs?: number;
}

export function useBridgeStatus({
  bridgeId,
  initialStatus = null,
  pollingIntervalMs = 10000,
}: UseBridgeStatusOptions) {
  const [status, setStatus] = useState<BridgePublicStatus | null>(initialStatus);
  const [connection, setConnection] = useState<ConnectionStateType>(
    initialStatus ? ConnectionState.LIVE : ConnectionState.CONNECTING
  );
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

  const activeBridgeIdRef = useRef(bridgeId);
  activeBridgeIdRef.current = bridgeId;

  const currentRevisionRef = useRef<string>(status?.statusRevision || '0');
  currentRevisionRef.current = status?.statusRevision || '0';

  const fetchLatest = useCallback(async () => {
    // Guard against empty bridgeId
    if (!bridgeId) return;

    try {
      const latest = await apiClient.getBridgeStatus(bridgeId);

      // Protect against out-of-order responses or switched bridge views
      if (activeBridgeIdRef.current !== bridgeId) return;

      setStatus((prev) => {
        if (!prev) return latest;
        const nextRev = latest.statusRevision || (latest as any).revision || '0';
        const prevRev = prev.statusRevision || (prev as any).revision || '0';
        // Monotonic revision check: only advance or refresh if newer or equal
        if (compareRevisions(nextRev, prevRev) >= 0) {
          return latest;
        }
        return prev;
      });

      setConnection(ConnectionState.LIVE);
      setLastSyncTime(new Date());
      setError(null);
    } catch (err) {
      if (activeBridgeIdRef.current !== bridgeId) return;
      setConnection(ConnectionState.POLLING);
      setError((err as Error).message);
    }
  }, [bridgeId]);

  // Initial fetch if needed
  useEffect(() => {
    if (bridgeId) {
      fetchLatest();
    }
  }, [fetchLatest, bridgeId]);

  // Polling fallback loop
  useEffect(() => {
    if (!bridgeId) return;
    const timer = setInterval(() => {
      fetchLatest();
    }, pollingIntervalMs);

    return () => clearInterval(timer);
  }, [fetchLatest, pollingIntervalMs, bridgeId]);

  // Window focus refetch
  useEffect(() => {
    if (!bridgeId) return;
    const handleFocus = () => {
      fetchLatest();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchLatest, bridgeId]);

  const freshness: FreshnessStateType = status
    ? calculateFreshness(status.condition, status.reportedAt)
    : FreshnessState.UNREPORTED;

  return {
    status,
    condition: status?.condition || BridgeCondition.UNKNOWN,
    freshness,
    connection,
    lastSyncTime,
    error,
    refetch: fetchLatest,
  };
}
