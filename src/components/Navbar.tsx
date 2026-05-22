'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMenu = () => setMobileOpen(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/70 backdrop-blur-xl border-b border-gray-800/60">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Logo */}
        <Link
          href="/"
          className="text-xl font-extrabold tracking-widest text-white select-none"
        >
          <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
            TIFO
          </span>
        </Link>

        {/* Nav links (desktop) */}
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

        {/* Right side: wallet + hamburger */}
        <div className="flex items-center gap-3">
          <ConnectButton
            chainStatus="icon"
            accountStatus="avatar"
            showBalance={false}
          />

          {/* Hamburger button (mobile only) */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="sm:hidden p-2 rounded-lg hover:bg-gray-800/60 transition-colors text-gray-400 hover:text-white"
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="sm:hidden animate-slide-down border-t border-gray-800/60 bg-gray-950/95 backdrop-blur-xl">
          <div className="flex flex-col px-6 py-4 gap-4 text-sm font-medium text-gray-400">
            <Link href="/map" onClick={closeMenu} className="transition-colors hover:text-white py-2">
              Map
            </Link>
            <Link href="/leaderboard" onClick={closeMenu} className="transition-colors hover:text-white py-2">
              Leaderboard
            </Link>
            <Link href="/me" onClick={closeMenu} className="transition-colors hover:text-white py-2">
              My Profile
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
