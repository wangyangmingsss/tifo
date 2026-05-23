'use client';

import { useEffect, useRef, useState } from 'react';

interface StatsCounterProps {
  label: string;
  value: number;
  icon: string;
}

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export default function StatsCounter({ label, value, icon }: StatsCounterProps) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || hasAnimated.current) return;
        hasAnimated.current = true;

        const duration = 2000;
        const start = performance.now();

        const animate = (now: number) => {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased = easeOutExpo(progress);
          setDisplay(Math.floor(eased * value));
          if (progress < 1) requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
      },
      { threshold: 0.3 },
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div
      ref={ref}
      className="relative group flex flex-col items-center gap-2 rounded-xl border border-gray-800 bg-gray-900/60 backdrop-blur-sm px-6 py-5 transition-all duration-300 hover:border-amber-500/40 hover:shadow-[0_0_24px_rgba(245,158,11,0.08)]"
    >
      {/* glow accent */}
      <div className="absolute -inset-px rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-b from-amber-500/10 to-transparent pointer-events-none" />

      <span className="text-2xl">{icon}</span>
      <span className="text-3xl font-bold tracking-tight text-white tabular-nums">
        {display.toLocaleString()}
      </span>
      <span className="text-xs font-medium uppercase tracking-widest text-gray-400">
        {label}
      </span>
    </div>
  );
}
