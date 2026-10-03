'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { apiClient, getStoredToken, setStoredToken } from '../lib/api';
import { UserProfile } from '@bridge/contracts';
import { Shield, Layers, UserCheck, LogIn, LogOut, Activity } from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    apiClient
      .getMe()
      .then((profile) => setUser(profile))
      .catch(() => {
        setStoredToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [pathname]);

  const handleLogout = () => {
    setStoredToken(null);
    setUser(null);
    router.push('/login');
  };

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <Link href="/bridges" className="flex items-center space-x-2 text-white font-bold text-lg hover:text-sky-400 transition">
            <Activity className="w-6 h-6 text-sky-400" />
            <span>Bridge Operations</span>
          </Link>

          <nav className="hidden md:flex items-center space-x-1" aria-label="Main Navigation">
            <Link
              href="/bridges"
              className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                pathname.startsWith('/bridges')
                  ? 'bg-slate-800 text-sky-400'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              Bridge Directory
            </Link>

            {user && (
              <Link
                href="/operator"
                className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                  pathname.startsWith('/operator')
                    ? 'bg-slate-800 text-sky-400'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                Operator Console
              </Link>
            )}

            {user?.roles.includes('super_admin') && (
              <Link
                href="/admin"
                className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                  pathname.startsWith('/admin')
                    ? 'bg-slate-800 text-sky-400'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                Administration
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          {!loading && user ? (
            <div className="flex items-center space-x-3">
              <div className="text-right hidden sm:block">
                <div className="text-xs text-slate-400">Signed in as</div>
                <div className="text-sm font-medium text-slate-200">
                  {user.displayName}
                  {user.roles.includes('super_admin') && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-purple-900/60 text-purple-300 border border-purple-700 font-semibold">
                      Admin
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-md border border-slate-700 transition"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          ) : !loading ? (
            <Link
              href="/login"
              className="flex items-center space-x-1.5 px-3.5 py-1.5 text-sm font-medium text-white bg-sky-600 hover:bg-sky-500 rounded-md shadow-sm transition"
            >
              <LogIn className="w-4 h-4" />
              <span>Operator Login</span>
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
