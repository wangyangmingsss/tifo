'use client';

import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 bg-gray-950/70 backdrop-blur-xl border-b border-gray-800/60">
      {/* Logo */}
      <Link
        href="/"
        className="text-xl font-extrabold tracking-widest text-white select-none"
      >
        <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
          TIFO
        </span>
      </Link>

      {/* Nav links */}
      <div className="hidden sm:flex items-center gap-6 text-sm font-medium text-gray-400">
        <Link href="/map" className="transition-colors hover:text-white">
          Map
        </Link>
        <Link href="/leaderboard" className="transition-colors hover:text-white">
          Leaderboard
        </Link>
        <Link href="/me" className="transition-colors hover:text-white">
          My Profile
        </Link>
      </div>

      {/* Wallet */}
      <div className="flex items-center">
        <ConnectButton
          chainStatus="icon"
          accountStatus="avatar"
          showBalance={false}
        />
      </div>
    </nav>
  );
}
