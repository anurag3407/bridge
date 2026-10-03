'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setStoredToken, API_BASE_URL } from '../../../lib/api';
import { Shield, KeyRound, AlertCircle, Loader2, UserCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('operator-a@bridge.local');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (loginEmail?: string) => {
    const targetEmail = loginEmail || email;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Login failed');
      }

      setStoredToken(data.token);

      if (data.user?.roles?.includes('super_admin')) {
        router.push('/admin');
      } else {
        router.push('/operator');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 py-16">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Operator & Admin Sign In</h1>
            <p className="text-xs text-slate-400">Authenticated access for road operations</p>
          </div>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:border-sky-500 focus:outline-none transition"
              placeholder="operator@bridge.local"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:border-sky-500 focus:outline-none transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold text-sm transition shadow-md shadow-sky-600/20"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
          </button>
        </form>

        {/* Quick-Fill Personas for Testing & Review */}
        <div className="mt-8 pt-6 border-t border-slate-800">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Quick Persona Switching (Test Environment)
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => {
                setEmail('admin@bridge.local');
                handleLogin('admin@bridge.local');
              }}
              className="p-2.5 rounded-lg bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/50 text-purple-300 text-left transition font-medium"
            >
              <div className="font-semibold text-white">Super Admin</div>
              <div className="text-[10px] text-purple-400">All Bridges</div>
            </button>

            <button
              onClick={() => {
                setEmail('operator-a@bridge.local');
                handleLogin('operator-a@bridge.local');
              }}
              className="p-2.5 rounded-lg bg-sky-950/40 hover:bg-sky-900/60 border border-sky-800/50 text-sky-300 text-left transition font-medium"
            >
              <div className="font-semibold text-white">Operator Alice</div>
              <div className="text-[10px] text-sky-400">River Gorge Bridge</div>
            </button>

            <button
              onClick={() => {
                setEmail('operator-b@bridge.local');
                handleLogin('operator-b@bridge.local');
              }}
              className="p-2.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/50 text-emerald-300 text-left transition font-medium"
            >
              <div className="font-semibold text-white">Operator Bob</div>
              <div className="text-[10px] text-emerald-400">Coastal Causeway</div>
            </button>

            <button
              onClick={() => {
                setEmail('disabled@bridge.local');
                handleLogin('disabled@bridge.local');
              }}
              className="p-2.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 text-rose-300 text-left transition font-medium"
            >
              <div className="font-semibold text-white">Disabled Operator</div>
              <div className="text-[10px] text-rose-400">Access Denied</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
