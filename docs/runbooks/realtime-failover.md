# Runbook: Real-Time Failover and Polling Fallback

## Context
When web socket connections to Supabase Realtime or network partitions disrupt event streaming, the platform switches to authoritative polling.

### Automated Client Behavior
- The `useBridgeStatus` hook detects subscription or socket stalls.
- If realtime events are not received or connection fails, the connection indicator transitions from `LIVE` to `POLLING`.
- Authoritative snapshot polling triggers against `/api/v1/bridges/:bridgeId/status` every 10 seconds.
- Revision monotonicity ensures out-of-order polling responses never regress displayed condition.

### Manual Verification
1. Open the bridge page in two browser tabs or windows.
2. In tab A, submit a report (e.g., transition `NORMAL` to `BROKEN`).
3. In tab B, observe the condition banner transition to `BROKEN` with the warning pin appearing within 2 seconds (or within 10 seconds under polling fallback).
