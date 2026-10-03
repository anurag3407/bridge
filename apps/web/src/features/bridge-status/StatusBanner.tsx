'use client';

import React from 'react';
import {
  BridgeConditionType,
  FreshnessStateType,
  ConnectionStateType,
} from '@bridge/contracts';
import {
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  HelpCircle,
  Radio,
  Clock,
  RefreshCw,
} from 'lucide-react';

interface StatusBannerProps {
  condition: BridgeConditionType;
  freshness: FreshnessStateType;
  connection: ConnectionStateType;
  reportedAt?: string | null;
  publicNote?: string | null;
  onRefresh?: () => void;
}

export function StatusBanner({
  condition,
  freshness,
  connection,
  reportedAt,
  publicNote,
  onRefresh,
}: StatusBannerProps) {
  const getConditionConfig = () => {
    switch (condition) {
      case 'NORMAL':
        return {
          title: 'Reported Normal',
          description: 'Latest operator report indicates the road surface is clear of reported hazards.',
          bg: 'bg-emerald-950/40 border-emerald-500/40',
          text: 'text-emerald-400',
          icon: CheckCircle2,
          badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        };
      case 'BROKEN':
        return {
          title: 'Road Damage Reported',
          description: 'Structural or road surface damage has been reported. Exercise extreme caution.',
          bg: 'bg-amber-950/40 border-amber-500/50',
          text: 'text-amber-400',
          icon: AlertTriangle,
          badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        };
      case 'DANGER':
        return {
          title: 'Hazard / Danger Reported',
          description: 'Critical road hazard reported by operations team. Proceed only under emergency directives.',
          bg: 'bg-rose-950/50 border-rose-500/60 shadow-lg shadow-rose-950/30',
          text: 'text-rose-400',
          icon: AlertOctagon,
          badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/50',
        };
      case 'UNKNOWN':
      default:
        return {
          title: 'Unassessed Condition',
          description: 'No verified operator report has been submitted yet for this bridge.',
          bg: 'bg-slate-900/60 border-slate-700/60',
          text: 'text-slate-300',
          icon: HelpCircle,
          badgeBg: 'bg-slate-800 text-slate-300 border-slate-700',
        };
    }
  };

  const config = getConditionConfig();
  const Icon = config.icon;

  const formatReportedTime = (isoString?: string | null) => {
    if (!isoString) return 'Never reported';
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  };

  return (
    <div
      className={`rounded-xl border p-4 sm:p-5 backdrop-blur transition-all ${config.bg}`}
      role="region"
      aria-label="Bridge Operational Road Condition"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Main Condition Indicator */}
        <div className="flex items-start space-x-3.5">
          <div className={`p-2 rounded-lg ${config.badgeBg} shrink-0 mt-0.5`}>
            <Icon className={`w-6 h-6 ${config.text}`} />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <span className={`text-lg font-bold tracking-tight ${config.text}`}>
                {config.title}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium border uppercase tracking-wider ${config.badgeBg}`}
              >
                {condition}
              </span>
            </div>
            <p className="text-sm text-slate-300 mt-0.5">{config.description}</p>
          </div>
        </div>

        {/* Operational Metadata & Connection Pill */}
        <div className="flex flex-wrap sm:flex-col items-start sm:items-end justify-between w-full sm:w-auto gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
          <div className="flex items-center space-x-2 text-xs">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${
                freshness === 'fresh'
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/50'
                  : freshness === 'stale'
                  ? 'bg-amber-950/60 text-amber-300 border-amber-700/50'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              <Clock className="w-3 h-3 mr-1" />
              {freshness.toUpperCase()}
            </span>

            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${
                connection === 'live'
                  ? 'bg-sky-950/60 text-sky-300 border-sky-700/50'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              <Radio className="w-3 h-3 mr-1 animate-pulse text-sky-400" />
              {connection.toUpperCase()}
            </span>

            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
                title="Refresh status snapshot"
                aria-label="Refresh status"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="text-xs text-slate-400">
            Reported: <span className="text-slate-200">{formatReportedTime(reportedAt)}</span>
          </div>
        </div>
      </div>

      {/* Public Note if present */}
      {publicNote && (
        <div className="mt-3.5 pt-3 border-t border-slate-800/80 text-xs text-slate-300 flex items-start space-x-2">
          <span className="font-semibold text-sky-300 shrink-0">Operator Note:</span>
          <span className="italic">{publicNote}</span>
        </div>
      )}
    </div>
  );
}
