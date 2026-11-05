'use client';
import { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
export default function PeriodAccessRefresh() {
  useEffect(() => {
    let disposed = false;
    const check = async () => {
      if (document.visibilityState !== 'visible') return;
      try { const response = await fetch('/api/auth/enrollment?area=client', { cache: 'no-store' }); if (!disposed && response.ok) window.location.replace('/clearance'); } catch {}
    };
    const interval = setInterval(check, 15000);
    window.addEventListener('focus', check);
    return () => { disposed = true; clearInterval(interval); window.removeEventListener('focus', check); };
  }, []);
  return <button type="button" onClick={() => window.location.reload()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/10 transition-colors hover:from-amber-400 hover:to-amber-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"><RefreshCw className="h-3.5 w-3.5" />Refresh access</button>;
}
