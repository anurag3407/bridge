'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../../../lib/api';
import {
  BridgeDetail,
  BridgeCondition,
  BridgeConditionType,
  BridgeHistoryItem,
} from '@bridge/contracts';
import { StatusBanner } from '../../../../../features/bridge-status/StatusBanner';
import {
  Shield,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  Clock,
  Loader2,
  RefreshCw,
  Send,
  Lock,
} from 'lucide-react';

export default function OperatorReportClient() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const bridgeId = (params?.id as string) || '11111111-1111-1111-1111-111111111111';

  // 1. Fetch Bridge and Current Status
  const {
    data: bridge,
    isLoading: isBridgeLoading,
    error: bridgeError,
    refetch: refetchBridge,
  } = useQuery<BridgeDetail>({
    queryKey: ['operator', 'bridge', bridgeId],
    queryFn: async () => {
      const bridges = await apiClient.getMyBridges();
      const match = bridges.find((b) => b.id === bridgeId);
      if (!match) throw new Error('Bridge not found in your assigned sector');
      return apiClient.getBridgeBySlug(match.slug);
    },
  });

  // 2. Fetch History
  const {
    data: history,
    isLoading: isHistoryLoading,
    refetch: refetchHistory,
  } = useQuery<BridgeHistoryItem[]>({
    queryKey: ['operator', 'bridge-history', bridgeId],
    queryFn: () => apiClient.getBridgeHistory(bridgeId),
  });

  // Form State
  const [selectedCondition, setSelectedCondition] = useState<BridgeConditionType>('NORMAL');
  const [reason, setReason] = useState('');
  const [publicNote, setPublicNote] = useState('');
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Submit Report Mutation
  const reportMutation = useMutation({
    mutationFn: async () => {
      if (!bridge) throw new Error('Bridge data missing');

      const idempotencyKey = `report-${bridgeId}-${Date.now()}`;
      return apiClient.submitReport(
        bridgeId,
        {
          condition: selectedCondition,
          reason,
          publicNote: publicNote.trim() ? publicNote.trim() : null,
          expectedRevision: bridge.statusRevision,
        },
        idempotencyKey
      );
    },
    onSuccess: () => {
      setSubmitSuccess(true);
      setConflictMessage(null);
      setReason('');
      setPublicNote('');
      queryClient.invalidateQueries({ queryKey: ['operator', 'bridge', bridgeId] });
      queryClient.invalidateQueries({ queryKey: ['operator', 'bridge-history', bridgeId] });
      queryClient.invalidateQueries({ queryKey: ['bridge'] });
      setTimeout(() => setSubmitSuccess(false), 4000);
    },
    onError: (err: any) => {
      if (err.statusCode === 409 || err.message?.includes('revision')) {
        setConflictMessage(
          'Conflict: A concurrent report has modified this bridge revision. Please review the updated status and confirm your report.'
        );
        refetchBridge();
      } else {
        setConflictMessage(err.message || 'Failed to submit report');
      }
    },
  });

  if (isBridgeLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-sky-400 mb-3" />
        <p className="text-sm">Loading assigned bridge details...</p>
      </div>
    );
  }

  if (bridgeError || !bridge) {
    return (
      <div className="max-w-xl mx-auto my-20 p-8 rounded-xl bg-rose-950/30 border border-rose-800/50 text-center">
        <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-rose-200">Assignment Error</h2>
        <p className="text-sm text-slate-400 mt-2">
          {bridgeError ? (bridgeError as Error).message : 'Access denied or bridge missing.'}
        </p>
        <button
          onClick={() => router.push('/operator')}
          className="mt-5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const isReasonRequired =
    selectedCondition === 'BROKEN' ||
    selectedCondition === 'DANGER' ||
    ((bridge.currentCondition === 'BROKEN' || bridge.currentCondition === 'DANGER') &&
      selectedCondition === 'NORMAL');

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/operator')}
          className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Assigned Bridges</span>
        </button>

        <div className="text-xs text-slate-400 font-mono">
          Bridge ID: <span className="text-slate-300">{bridge.id}</span> • Rev: {bridge.statusRevision}
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">{bridge.displayName}</h1>
        <p className="text-xs text-slate-400 mt-1">
          {bridge.locationLabel || 'Assigned Operational Sector'}
        </p>
      </div>

      {/* Current Canonical Status Banner */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          Current Server Status
        </h3>
        <StatusBanner
          condition={bridge.currentCondition}
          freshness={bridge.freshness}
          connection="live"
          reportedAt={bridge.reportedAt}
          publicNote={bridge.publicNote}
          onRefresh={() => refetchBridge()}
        />
      </div>

      {/* Conflict / Error Alert */}
      {conflictMessage && (
        <div className="p-4 rounded-xl bg-amber-950/50 border border-amber-500/60 text-amber-200 text-sm flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{conflictMessage}</p>
            <button
              onClick={() => {
                setConflictMessage(null);
                refetchBridge();
              }}
              className="mt-2 text-xs font-bold text-amber-300 underline"
            >
              Refresh Latest Server Revision & Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {submitSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-500/60 text-emerald-200 text-sm flex items-center space-x-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="font-semibold">
            Condition report successfully recorded in PostgreSQL and published! Monotonic revision updated.
          </p>
        </div>
      )}

      {/* Condition Report Form */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
        <div>
          <h2 className="text-base font-bold text-white">Submit Road Condition Report</h2>
          <p className="text-xs text-slate-400 mt-1">
            Updates will atomically update the canonical database, status projection, and public 3D viewer.
          </p>
        </div>

        {/* Condition Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Inspected Road Condition
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* NORMAL */}
            <button
              type="button"
              onClick={() => setSelectedCondition('NORMAL')}
              className={`p-4 rounded-xl border text-left flex items-start space-x-3 transition ${
                selectedCondition === 'NORMAL'
                  ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/20'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
              <div>
                <div className="font-bold text-sm text-white">NORMAL</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Reported normal; safe flow</div>
              </div>
            </button>

            {/* BROKEN */}
            <button
              type="button"
              onClick={() => setSelectedCondition('BROKEN')}
              className={`p-4 rounded-xl border text-left flex items-start space-x-3 transition ${
                selectedCondition === 'BROKEN'
                  ? 'bg-amber-950/40 border-amber-500 text-amber-300 ring-2 ring-amber-500/20'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
              <div>
                <div className="font-bold text-sm text-white">BROKEN</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Surface / deck damage</div>
              </div>
            </button>

            {/* DANGER */}
            <button
              type="button"
              onClick={() => setSelectedCondition('DANGER')}
              className={`p-4 rounded-xl border text-left flex items-start space-x-3 transition ${
                selectedCondition === 'DANGER'
                  ? 'bg-rose-950/50 border-rose-500 text-rose-300 ring-2 ring-rose-500/20'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <AlertOctagon className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
              <div>
                <div className="font-bold text-sm text-white">DANGER</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Severe road hazard</div>
              </div>
            </button>
          </div>
        </div>

        {/* Private Reason Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span className="flex items-center space-x-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Private Observation Reason</span>
            </span>
            {isReasonRequired ? (
              <span className="text-amber-400 text-[10px] font-bold">REQUIRED FOR THIS REPORT</span>
            ) : (
              <span className="text-slate-500 text-[10px]">Optional for regular re-inspections</span>
            )}
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Details of physical inspection, damage observed, or repairs completed (stored in private history, not shown to public)..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 placeholder-slate-500 focus:border-sky-500 focus:outline-none transition"
          />
        </div>

        {/* Public Note Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Public Operational Note (Optional)
          </label>
          <p className="text-[11px] text-slate-400 mb-2">
            ⚠️ <strong className="text-slate-300">Notice:</strong> Public notes are displayed directly on public bridge pages. Do NOT include personal information, internal incident numbers, or contractor names.
          </p>
          <input
            type="text"
            value={publicNote}
            onChange={(e) => setPublicNote(e.target.value)}
            placeholder="e.g., Single lane reduction near northbound tower due to resurfacing."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:border-sky-500 focus:outline-none transition"
          />
        </div>

        {/* Live Public Preview */}
        <div className="pt-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Live Preview of Public Banner
          </div>
          <StatusBanner
            condition={selectedCondition}
            freshness="fresh"
            connection="live"
            reportedAt={new Date().toISOString()}
            publicNote={publicNote.trim() ? publicNote : null}
          />
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            disabled={reportMutation.isPending || (isReasonRequired && !reason.trim())}
            onClick={() => reportMutation.mutate()}
            className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold text-sm transition shadow-lg shadow-sky-600/20"
          >
            {reportMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>{reportMutation.isPending ? 'Committing Report...' : 'Commit Report to PostgreSQL'}</span>
          </button>
        </div>
      </div>

      {/* Immutable History Table */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white">Immutable Report History</h2>
          <button
            onClick={() => refetchHistory()}
            className="flex items-center space-x-1 text-xs text-slate-400 hover:text-white transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {isHistoryLoading ? (
          <div className="py-8 text-center text-slate-400 text-xs">Loading history logs...</div>
        ) : history && history.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">No prior reports in history.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400 font-semibold uppercase">
                <tr>
                  <th className="py-2.5 px-3">Revision</th>
                  <th className="py-2.5 px-3">Transition</th>
                  <th className="py-2.5 px-3">Private Reason</th>
                  <th className="py-2.5 px-3">Public Note</th>
                  <th className="py-2.5 px-3">Inspector</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {history?.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-3 font-mono font-bold text-sky-400">
                      {h.oldRevision} → {h.newRevision}
                    </td>
                    <td className="py-3 px-3 font-semibold">
                      <span className="text-slate-400">{h.oldCondition}</span>
                      <span className="mx-1 text-slate-600">→</span>
                      <span
                        className={
                          h.newCondition === 'NORMAL'
                            ? 'text-emerald-400'
                            : h.newCondition === 'BROKEN'
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }
                      >
                        {h.newCondition}
                      </span>
                    </td>
                    <td className="py-3 px-3 max-w-xs truncate" title={h.privateReason}>
                      {h.privateReason}
                    </td>
                    <td className="py-3 px-3 max-w-xs truncate text-slate-400" title={h.publicNote || ''}>
                      {h.publicNote || '—'}
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {h.actorDisplayName || h.actorId.substring(0, 8)}
                    </td>
                    <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                      {new Date(h.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
