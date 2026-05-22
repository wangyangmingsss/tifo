'use client';

import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Navbar from '@/components/Navbar';
import WorldMapPreview from '@/components/WorldMapPreview';
import StatsCounter from '@/components/StatsCounter';

const STATS = [
  { label: 'Total Rallies', value: 12847, icon: '\u{1F525}' },
  { label: 'Territory Captures', value: 3291, icon: '\u{2694}\uFE0F' },
  { label: 'Active Factions', value: 48, icon: '\u{1F3F3}\uFE0F' },
  { label: 'On-Chain Txns', value: 28445, icon: '\u{26D3}\uFE0F' },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />

      {/* === HERO === */}
      <section className="relative flex flex-col items-center pt-28 pb-12 px-4 overflow-hidden">
        {/* Background radial glow */}
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-amber-500/[0.04] blur-[120px]" />

        {/* Badge */}
        <div className="relative mb-6 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-amber-400">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
          World Cup 2026 &middot; X Layer
        </div>

        {/* Title */}
        <h1 className="relative text-center">
          <span className="block text-6xl sm:text-8xl font-black tracking-tighter bg-gradient-to-b from-white via-gray-200 to-gray-500 bg-clip-text text-transparent">
            TIFO
          </span>
          <span className="mt-3 block text-base sm:text-lg font-medium text-gray-400 tracking-wide">
            48 Factions. One Map. Zero-Sum Territory War.
          </span>
        </h1>

        {/* Map preview */}
        <div className="relative mt-10 w-full max-w-3xl">
          <WorldMapPreview />
        </div>

        {/* CTAs */}
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/map"
            className="relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-8 py-4 text-lg font-bold text-gray-950 shadow-lg shadow-amber-500/20 transition-all duration-300 hover:shadow-amber-500/40 hover:scale-[1.03] active:scale-[0.98]"
          >
            <span className="text-xl">{'\u{1F30D}'}</span>
            Choose Your Country
          </Link>

          <div className="rounded-xl border border-gray-700 bg-gray-900/60 px-2 py-1 transition-colors hover:border-gray-600">
            <ConnectButton
              chainStatus="icon"
              accountStatus="address"
              showBalance={false}
            />
          </div>
        </div>
      </section>

      {/* === STATS BAR === */}
      <section className="relative py-16 px-4">
        <div className="mx-auto max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <StatsCounter
              key={s.label}
              label={s.label}
              value={s.value}
              icon={s.icon}
            />
          ))}
        </div>
      </section>

      {/* === HOW IT WORKS (brief) === */}
      <section className="py-16 px-4">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-bold tracking-tight text-white mb-10">
            How It Works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                title: 'Pick a Faction',
                desc: 'Choose one of 48 national teams. Your loyalty is on-chain.',
              },
              {
                step: '02',
                title: 'Rally Territory',
                desc: 'Stake USDT to rally regions. Strength accumulates over time.',
              },
              {
                step: '03',
                title: 'Capture & Earn',
                desc: 'When your faction captures territory, the war chest rewards flow.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-xl border border-gray-800 bg-gray-900/40 p-6 transition-colors hover:border-gray-700"
              >
                <span className="text-xs font-bold tracking-widest text-amber-500">
                  STEP {item.step}
                </span>
                <h3 className="mt-2 text-lg font-semibold text-white">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === FOOTER === */}
      <footer className="border-t border-gray-800/60 py-8 px-4">
        <div className="mx-auto max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <span>
            Built on{' '}
            <span className="font-semibold text-gray-400">X Layer</span>{' '}
            &middot; Powered by{' '}
            <span className="font-semibold text-gray-400">OKX</span>
          </span>
          <span className="text-gray-600">
            TIFO &copy; 2026. All transactions are on-chain and verifiable.
          </span>
        </div>
      </footer>
    </div>
  );
}
