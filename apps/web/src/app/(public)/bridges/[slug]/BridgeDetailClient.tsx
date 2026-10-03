'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../../lib/api';
import { StatusBanner } from '../../../../features/bridge-status/StatusBanner';
import { useBridgeStatus } from '../../../../features/bridge-status/useBridgeStatus';
import { BridgeDetail } from '@bridge/contracts';
import { ChevronRight, MapPin, Loader2, AlertCircle } from 'lucide-react';

const Viewer = dynamic(
  () => import('../../../../features/bridge-viewer/Viewer').then((mod) => mod.Viewer),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[520px] bg-slate-950 rounded-xl flex flex-col items-center justify-center border border-slate-800 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-sky-400 mb-3" />
        <p className="text-sm">Initializing 3D Viewer & Loading Model...</p>
      </div>
    ),
  }
);

export default function BridgeDetailClient() {
  const params = useParams();
  const slug = (params?.slug as string) || 'river-gorge-bridge';

  const {
    data: bridge,
    isLoading: isBridgeLoading,
    error: bridgeError,
  } = useQuery<BridgeDetail>({
    queryKey: ['bridge', slug],
    queryFn: () => apiClient.getBridgeBySlug(slug),
  });

  const {
    status,
    condition,
    freshness,
    connection,
    refetch: refetchStatus,
  } = useBridgeStatus({
    bridgeId: bridge?.id || '',
    initialStatus: bridge
      ? {
          bridgeId: bridge.id,
          condition: bridge.currentCondition,
          statusRevision: bridge.statusRevision || '0',
          publicRevision: bridge.publicRevision || '0',
          reportedAt: bridge.reportedAt || new Date().toISOString(),
          publicNote: bridge.publicNote || null,
          isPublished: bridge.lifecycle === 'published',
          freshness: bridge.freshness || 'fresh',
          observedAt: bridge.reportedAt || new Date().toISOString(),
        }
      : null,
    pollingIntervalMs: 10000,
  });

  if (isBridgeLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-32 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-sky-400 mb-3" />
        <p className="text-sm">Loading bridge details...</p>
      </div>
    );
  }

  if (bridgeError || !bridge) {
    return (
      <div className="max-w-2xl mx-auto my-20 p-8 rounded-xl bg-rose-950/30 border border-rose-800/50 text-center">
        <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-rose-200">Bridge Not Found or Unavailable</h2>
        <p className="text-sm text-slate-400 mt-2">
          {bridgeError ? (bridgeError as Error).message : 'The requested bridge could not be found.'}
        </p>
        <Link
          href="/bridges"
          className="inline-block mt-5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition"
        >
          Return to Directory
        </Link>
      </div>
    );
  }

  const asset = bridge.asset;
  const viewerConfig = asset?.viewerConfig;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center space-x-2 text-xs text-slate-400" aria-label="Breadcrumb">
        <Link href="/bridges" className="hover:text-white transition">
          Bridge Directory
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
        <span className="text-slate-200 font-medium">{bridge.displayName}</span>
      </nav>

      {/* Bridge Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">{bridge.displayName}</h1>
          {bridge.locationLabel && (
            <div className="flex items-center text-sm text-slate-400 mt-1.5">
              <MapPin className="w-4 h-4 mr-1 text-slate-500 shrink-0" />
              <span>{bridge.locationLabel}</span>
            </div>
          )}
        </div>
      </div>

      {/* Authoritative Operational Status Banner */}
      <StatusBanner
        condition={condition}
        freshness={freshness}
        connection={connection}
        reportedAt={status?.reportedAt || bridge.reportedAt}
        publicNote={status?.publicNote ?? bridge.publicNote}
        onRefresh={refetchStatus}
      />

      {/* 3D Model Viewer */}
      {asset && viewerConfig ? (
        <Viewer
          modelUrl={asset.modelUrl}
          condition={condition}
          viewerConfig={viewerConfig}
        />
      ) : (
        <div className="w-full h-80 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center p-6 text-center text-slate-400">
          <p className="text-sm font-medium text-slate-300">No 3D Model Published For This Bridge</p>
          <p className="text-xs text-slate-500 mt-1">
            Operational status is monitored above. 3D geometry is awaiting ingestion.
          </p>
        </div>
      )}

      {/* Bridge Description and Details */}
      {bridge.description && (
        <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Bridge Overview
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">{bridge.description}</p>
        </div>
      )}
    </div>
  );
}
