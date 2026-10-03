'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api';
import { BridgeSummary } from '@bridge/contracts';
import { Search, MapPin, Clock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export default function BridgeDirectoryPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: bridges, isLoading, error, refetch } = useQuery<BridgeSummary[]>({
    queryKey: ['bridges', 'directory'],
    queryFn: () => apiClient.getBridges(),
  });

  const filteredBridges = (bridges || []).filter((b) =>
    b.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.locationLabel && b.locationLabel.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getConditionBadge = (condition: string) => {
    switch (condition) {
      case 'NORMAL':
        return 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60';
      case 'BROKEN':
        return 'bg-amber-950/60 text-amber-300 border-amber-700/60';
      case 'DANGER':
        return 'bg-rose-950/60 text-rose-300 border-rose-700/60';
      case 'UNKNOWN':
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getConditionLabel = (condition: string) => {
    switch (condition) {
      case 'NORMAL':
        return 'Reported normal';
      case 'BROKEN':
        return 'Damage reported';
      case 'DANGER':
        return 'Danger reported';
      case 'UNKNOWN':
      default:
        return 'Unassessed';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Public Bridge Directory</h1>
          <p className="text-sm text-slate-400 mt-1">
            Browse published bridges, inspect 3D models, and monitor latest operator-reported road conditions.
          </p>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search bridges or locations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-sky-500 focus:outline-none transition"
          />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-sky-400 mb-3" />
          <p className="text-sm">Loading bridges...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-950/30 border border-rose-800/50 rounded-xl p-8 text-center max-w-lg mx-auto">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-rose-200">Unable to load bridge directory</h3>
          <p className="text-sm text-slate-400 mt-1">{(error as Error).message}</p>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg border border-slate-700 transition"
          >
            Retry Connection
          </button>
        </div>
      ) : filteredBridges.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/40 rounded-xl border border-slate-800">
          <p className="text-slate-400 text-sm">No bridges found matching your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBridges.map((bridge) => (
            <Link
              key={bridge.id}
              href={`/bridges/${bridge.slug}`}
              className="group flex flex-col rounded-xl bg-slate-900/70 border border-slate-800 hover:border-sky-600/50 hover:shadow-xl hover:shadow-sky-950/20 transition overflow-hidden"
            >
              {/* Card Poster Preview (No WebGL canvas to preserve memory) */}
              <div className="relative h-44 bg-slate-950 flex items-center justify-center border-b border-slate-800/80 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent opacity-80 z-10" />
                <div className="text-slate-600 flex flex-col items-center justify-center z-0">
                  <div className="text-3xl font-black tracking-widest text-slate-700 group-hover:text-slate-600 transition">
                    3D MODEL
                  </div>
                  <div className="text-xs uppercase tracking-wider text-slate-500 mt-1">
                    Interactive WebGL
                  </div>
                </div>

                {/* Condition Pill */}
                <div className="absolute top-3 right-3 z-20">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border backdrop-blur ${getConditionBadge(
                      bridge.currentCondition
                    )}`}
                  >
                    {getConditionLabel(bridge.currentCondition)}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white group-hover:text-sky-400 transition">
                    {bridge.displayName}
                  </h2>

                  {bridge.locationLabel && (
                    <div className="flex items-center text-xs text-slate-400 mt-1.5">
                      <MapPin className="w-3.5 h-3.5 mr-1 text-slate-500 shrink-0" />
                      <span>{bridge.locationLabel}</span>
                    </div>
                  )}

                  {bridge.description && (
                    <p className="text-xs text-slate-400 mt-2.5 line-clamp-2 leading-relaxed">
                      {bridge.description}
                    </p>
                  )}
                </div>

                <div className="mt-5 pt-3.5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>
                      {bridge.reportedAt
                        ? `Reported ${new Date(bridge.reportedAt).toLocaleDateString()}`
                        : 'Unreported'}
                    </span>
                  </div>

                  <span className="flex items-center space-x-1 text-sky-400 font-medium group-hover:translate-x-0.5 transition-transform">
                    <span>Inspect</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
