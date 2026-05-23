'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { WorldMap } from '@/components/WorldMap';
import { fetchStats, fetchMapState } from '@/lib/api';

/* ── Animated counter ── */
function AnimatedNumber({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);

  useEffect(() => {
    const start = prev.current;
    const diff = value - start;
    if (diff === 0) return;
    const startTime = performance.now();
    let raf: number;
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) raf = requestAnimationFrame(step);
      else prev.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{display.toLocaleString()}</>;
}

/* ── Types ── */
interface Stats {
  totalRallies: number;
  totalCaptures: number;
  activeFactions: number;
  uniqueUsers: number;
}

interface MapRegion {
  regionId: number;
  ownerFaction: number;
  captureCount: number;
}

interface MapStateResponse {
  regionCount: number;
  regions: MapRegion[];
}

/* ── Page ── */
export default function Home() {
  // -- Stats polling --
  const [stats, setStats] = useState<Stats>({
    totalRallies: 0,
    totalCaptures: 0,
    activeFactions: 0,
    uniqueUsers: 0,
  });

  // -- Map state --
  const [mapOwners, setMapOwners] = useState<number[]>(() => new Array(200).fill(255));

  const loadStats = useCallback(async () => {
    try {
      const data = await fetchStats();
      if (data) {
        setStats({
          totalRallies: data.totalRallies ?? 0,
          totalCaptures: data.totalCaptures ?? 0,
          activeFactions: data.activeFactions ?? 0,
          uniqueUsers: data.uniqueUsers ?? 0,
        });
      }
    } catch { /* silent */ }
  }, []);

  const loadMap = useCallback(async () => {
    try {
      const data: MapStateResponse | null = await fetchMapState();
      if (data && data.regions) {
        const owners = new Array(200).fill(255);
        data.regions.forEach((r) => {
          if (r.regionId >= 0 && r.regionId < 200) {
            owners[r.regionId] = r.ownerFaction ?? 255;
          }
        });
        setMapOwners(owners);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    loadStats();
    loadMap();
    const interval = setInterval(loadStats, 30_000);
    return () => clearInterval(interval);
  }, [loadStats, loadMap]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background effects */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-amber-500/5 blur-3xl" />
        <div className="absolute -bottom-60 -right-40 h-[500px] w-[500px] rounded-full bg-amber-400/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[800px] w-[800px] rounded-full bg-amber-500/[0.02] blur-3xl" />
      </div>

      {/* ════════ HERO ════════ */}
      <HeroSection mapOwners={mapOwners} />

      {/* ════════ LIVE STATS ════════ */}
      <StatsSection stats={stats} />

      {/* ════════ HOW IT WORKS ════════ */}
      <HowItWorksSection />

      {/* ════════ GAME MECHANICS ════════ */}
      <MechanicsSection />

      {/* ════════ FOOTER ════════ */}
      <FooterSection />
    </div>
  );
}

/* ───────────────────────────── Sub-sections ───────────────────────────── */

function HeroSection({ mapOwners }: { mapOwners: number[] }) {
  return (
    <section className="relative z-10 pt-28 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto text-center">
        {/* Title */}
        <h1 className="text-7xl sm:text-8xl md:text-9xl font-black tracking-tighter leading-none mb-4 select-none">
          <span className="bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 bg-clip-text text-transparent drop-shadow-lg">
            TIFO
          </span>
        </h1>
        <p className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-200 mb-2 tracking-wide">
          2026 World Cup On-Chain Territory War
        </p>
        <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          48 nations. 200 regions. One map. Every rally is an on-chain transaction.
        </p>

        {/* Mini map */}
        <div className="relative mx-auto max-w-4xl mb-10 rounded-2xl border border-gray-800/60 bg-gray-900/50 backdrop-blur-sm p-4 shadow-2xl shadow-amber-500/5">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-amber-500/5 to-transparent pointer-events-none" />
          <WorldMap mapState={mapOwners} mini onRegionClick={() => {}} />
          <div className="absolute bottom-3 right-4 text-[10px] text-gray-600 font-mono tracking-wider uppercase">
            Live Map Preview
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/map"
            className="group relative inline-flex items-center justify-center px-8 py-3.5 text-base font-bold text-gray-950 bg-gradient-to-r from-amber-400 to-amber-500 rounded-xl shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.03] transition-all duration-200"
          >
            <span className="mr-2">Choose Your Nation</span>
            <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
          <Link
            href="/leaderboard"
            className="inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-amber-400 border border-amber-500/30 rounded-xl hover:bg-amber-500/10 hover:border-amber-500/50 transition-all duration-200"
          >
            View Leaderboard
          </Link>
        </div>
      </div>
    </section>
  );
}

function StatsSection({ stats }: { stats: Stats }) {
  const items = [
    { label: 'Total Rallies', value: stats.totalRallies, icon: 'M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z' },
    { label: 'Total Captures', value: stats.totalCaptures, icon: 'M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5' },
    { label: 'Active Factions', value: stats.activeFactions, icon: 'M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z' },
    { label: 'Unique Users', value: stats.uniqueUsers, icon: 'M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z' },
  ];

  return (
    <section className="relative z-10 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-center text-xs font-bold uppercase tracking-[0.3em] text-amber-500/70 mb-10">
          Live Battlefield Stats
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {items.map((item) => (
            <div
              key={item.label}
              className="relative group rounded-2xl border border-gray-800/60 bg-gray-900/40 backdrop-blur-sm p-6 text-center hover:border-amber-500/30 transition-colors duration-300"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <svg className="w-6 h-6 mx-auto mb-3 text-amber-500/60" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              <div className="text-3xl sm:text-4xl font-black text-white mb-1 font-mono tabular-nums">
                <AnimatedNumber value={item.value} />
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      num: '01',
      title: 'Connect & Choose',
      desc: 'Connect OKX Wallet & choose your nation',
      icon: 'M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3',
    },
    {
      num: '02',
      title: 'Rally',
      desc: 'Commit mUSDT to push your faction\'s power in a region',
      icon: 'M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z',
    },
    {
      num: '03',
      title: 'Conquer',
      desc: 'Flip territories when your power exceeds the owner\'s',
      icon: 'M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5',
    },
    {
      num: '04',
      title: 'Defect',
      desc: 'Betray your old faction for strategic advantage',
      icon: 'M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5',
    },
  ];

  return (
    <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-center text-3xl sm:text-4xl font-black mb-3 tracking-tight">
          How It <span className="text-amber-400">Works</span>
        </h2>
        <p className="text-center text-gray-500 text-sm mb-14 max-w-xl mx-auto">
          Four moves. Infinite strategy. Every action is recorded on-chain.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step) => (
            <div
              key={step.num}
              className="group relative rounded-2xl border border-gray-800/60 bg-gray-900/30 p-6 hover:border-amber-500/30 transition-all duration-300"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <span className="text-[10px] font-bold text-amber-500/40 tracking-widest">
                  STEP {step.num}
                </span>
                <div className="mt-3 mb-4 w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d={step.icon} />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-1">{step.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MechanicsSection() {
  const mechanics = [
    {
      title: 'Decay',
      desc: 'Idle territories lose power over time. Stay active or lose ground.',
      gradient: 'from-red-500/20 to-red-500/5',
      borderColor: 'hover:border-red-500/30',
      iconColor: 'text-red-400',
      icon: 'M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
    },
    {
      title: 'Underdog Bonus',
      desc: 'Losing factions get boosted rallies. The comeback is always possible.',
      gradient: 'from-emerald-500/20 to-emerald-500/5',
      borderColor: 'hover:border-emerald-500/30',
      iconColor: 'text-emerald-400',
      icon: 'M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941',
    },
    {
      title: 'Defection',
      desc: 'Switch sides and convert old contributions. Betrayal is a valid strategy.',
      gradient: 'from-purple-500/20 to-purple-500/5',
      borderColor: 'hover:border-purple-500/30',
      iconColor: 'text-purple-400',
      icon: 'M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5',
    },
  ];

  return (
    <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-center text-3xl sm:text-4xl font-black mb-3 tracking-tight">
          Game <span className="text-amber-400">Mechanics</span>
        </h2>
        <p className="text-center text-gray-500 text-sm mb-14 max-w-xl mx-auto">
          Asymmetric warfare meets on-chain economics. No faction is ever truly safe.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {mechanics.map((m) => (
            <div
              key={m.title}
              className={`group relative rounded-2xl border border-gray-800/60 bg-gray-900/30 p-8 ${m.borderColor} transition-all duration-300`}
            >
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-b ${m.gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />
              <div className="relative">
                <div className="mb-5 w-14 h-14 rounded-2xl bg-gray-800/50 border border-gray-700/50 flex items-center justify-center group-hover:border-gray-600/50 transition-colors">
                  <svg className={`w-7 h-7 ${m.iconColor}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d={m.icon} />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{m.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{m.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FooterSection() {
  return (
    <footer className="relative z-10 border-t border-gray-800/60 mt-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
          {/* Brand */}
          <div>
            <div className="text-2xl font-black tracking-tight mb-2">
              <span className="text-amber-400">TIFO</span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
              2026 World Cup On-Chain Territory War. 48 factions battle for supremacy on X Layer Testnet.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-4">Navigate</h4>
            <ul className="space-y-2">
              <li><Link href="/map" className="text-sm text-gray-400 hover:text-amber-400 transition-colors">World Map</Link></li>
              <li><Link href="/leaderboard" className="text-sm text-gray-400 hover:text-amber-400 transition-colors">Leaderboard</Link></li>
              <li><Link href="/me" className="text-sm text-gray-400 hover:text-amber-400 transition-colors">My Profile</Link></li>
            </ul>
          </div>

          {/* Built on */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-4">Powered By</h4>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-800 bg-gray-900/50 text-sm">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-gray-300 font-medium">Built on X Layer</span>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800/60 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-600">
            TIFO - Hackathon Project 2026
          </p>
          <p className="text-xs text-gray-600">
            All transactions on X Layer Testnet
          </p>
        </div>
      </div>
    </footer>
  );
}
