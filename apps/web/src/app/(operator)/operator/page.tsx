'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api';
import { BridgeSummary } from '@bridge/contracts';
import { Shield, MapPin, Clock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export default function OperatorDashboardPage() {
  const {
    data: bridges,
    isLoading,
    error,
  } = useQuery<BridgeSummary[]>({
    queryKey: ['operator', 'my-bridges'],
    queryFn: () => apiClient.getMyBridges(),
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      <div className="mb-8">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-sky-950/60 border border-sky-800/60 text-sky-400 text-xs font-semibold uppercase tracking-wider mb-2">
          <Shield className="w-3.5 h-3.5" />
          <span>Operator Console</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Your Assigned Bridges</h1>
        <p className="text-sm text-slate-400 mt-1">
          Select an assigned bridge below to submit inspected road conditions, record observations, or view condition history.
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-sky-400 mb-3" />
          <p className="text-sm">Loading your assignments...</p>
        </div>
      ) : error ? (
        <div className="p-8 rounded-xl bg-rose-950/30 border border-rose-800/50 text-center max-w-lg mx-auto">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-rose-200">Unable to load assigned bridges</h3>
          <p className="text-xs text-slate-400 mt-1">{(error as Error).message}</p>
        </div>
      ) : bridges && bridges.length === 0 ? (
        <div className="p-12 rounded-xl bg-slate-900 border border-slate-800 text-center max-w-md mx-auto">
          <Shield className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No Assigned Bridges</h3>
          <p className="text-xs text-slate-400 mt-2">
            You do not currently have any bridges assigned to your account. Contact a super administrator for operational sector assignments.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bridges?.map((b) => (
            <div
              key={b.id}
              className="p-6 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      b.currentCondition === 'NORMAL'
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60'
                        : b.currentCondition === 'BROKEN'
                        ? 'bg-amber-950/60 text-amber-300 border-amber-700/60'
                        : b.currentCondition === 'DANGER'
                        ? 'bg-rose-950/60 text-rose-300 border-rose-700/60'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {b.currentCondition}
                  </span>
                  <span className="text-xs text-slate-500 uppercase font-mono">{b.lifecycle}</span>
                </div>

                <h3 className="text-lg font-bold text-white">{b.displayName}</h3>
                {b.locationLabel && (
                  <div className="flex items-center text-xs text-slate-400 mt-1">
                    <MapPin className="w-3.5 h-3.5 mr-1 text-slate-500" />
                    <span>{b.locationLabel}</span>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  {b.reportedAt ? `Last: ${new Date(b.reportedAt).toLocaleDateString()}` : 'No reports yet'}
                </div>
                <Link
                  href={`/operator/bridges/${b.id}`}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition"
                >
                  <span>Report Status</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
