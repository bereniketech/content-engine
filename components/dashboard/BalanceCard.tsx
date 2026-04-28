'use client';
import { useEffect, useState, useRef } from 'react';

export default function BalanceCard({ balance }: { balance: number }) {
  const [displayed, setDisplayed] = useState(0);
  const rafRef = useRef<number>();
  const prefersReduced = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  useEffect(() => {
    if (prefersReduced) { setDisplayed(balance); return; }
    const duration = 400;
    const startTime = performance.now();
    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setDisplayed(Math.floor(progress * balance));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [balance, prefersReduced]);

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-6" aria-label={`Credit balance: ${balance}`}>
      <p className="text-sm text-gray-400">Credit Balance</p>
      <p className="mt-1 text-4xl font-bold text-white" aria-live="polite">{displayed.toLocaleString()}</p>
      <p className="mt-1 text-xs text-gray-500">credits remaining</p>
    </div>
  );
}
