import React from 'react';
import Link from 'next/link';
import { Activity, Shield, ArrowRight, Eye, CheckCircle2 } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex-1 flex flex-col justify-center max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-sky-950/60 border border-sky-800/60 text-sky-400 text-xs font-semibold uppercase tracking-wider mb-6">
          <Activity className="w-3.5 h-3.5" />
          <span>Real-Time Operational Infrastructure</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Bridge Operations & 3D Road Inspection
        </h1>

        <p className="mt-6 text-lg text-slate-300 leading-relaxed">
          High-fidelity WebGL 3D inspection models paired with authoritative operator-reported road conditions. Built with PostgreSQL canonical transactions, monotonic revisions, and zero-trust authorization.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/bridges"
            className="flex items-center space-x-2 px-6 py-3.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm shadow-lg shadow-sky-600/20 transition"
          >
            <Eye className="w-4 h-4" />
            <span>Browse Bridge Directory</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>

          <Link
            href="/operator"
            className="flex items-center space-x-2 px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-sm transition"
          >
            <Shield className="w-4 h-4 text-sky-400" />
            <span>Operator Console</span>
          </Link>
        </div>
      </div>

      {/* Feature Pillars */}
      <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4">
            <Activity className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Monotonic Revisions</h3>
          <p className="text-sm text-slate-400">
            Guaranteed atomic state transitions in PostgreSQL. Condition history is append-only, and concurrent updates prevent lost reports via compare-and-swap locking.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4">
            <Eye className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Interactive 3D Digital Twin</h3>
          <p className="text-sm text-slate-400">
            Responsive Three.js viewer with bounded camera fitting, orbit controls, road deck highlighting, and floating warning markers for reported damage or hazards.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Sanitized Public Projections</h3>
          <p className="text-sm text-slate-400">
            Public real-time streams expose only approved metadata. Private reasons, internal audit trails, and operator personal information remain isolated behind strict RLS.
          </p>
        </div>
      </div>
    </div>
  );
}
