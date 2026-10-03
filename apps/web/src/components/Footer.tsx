import React from 'react';
import { AlertCircle, ShieldAlert } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 mt-auto text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start space-x-2.5 max-w-2xl">
          <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <p>
            <strong className="text-slate-300">Operational Disclaimer:</strong> This platform displays{' '}
            <span className="text-slate-200">operator-reported road surface conditions</span> for awareness only. It is not an engineering structural safety assessment or certified guarantee of travel safety. Always heed official road authority directives, local emergency notices, and posted road signage.
          </p>
        </div>
        <div className="text-slate-500 text-right shrink-0">
          <div>Bridge Operations Platform v1.0</div>
          <div>PostgreSQL Canonical Authority • Zero-Trust Access</div>
        </div>
      </div>
    </footer>
  );
}
