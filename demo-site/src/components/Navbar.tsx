'use client';

import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useState } from 'react';

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/90 backdrop-blur-md border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-2xl font-black tracking-tight">
              <span className="text-amber-400">TIFO</span>
              <span className="text-xs text-gray-500 ml-2 hidden sm:inline">2026 World Cup</span>
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link href="/map" className="text-sm text-gray-300 hover:text-amber-400 transition-colors font-medium">
                Map
              </Link>
              <Link href="/leaderboard" className="text-sm text-gray-300 hover:text-amber-400 transition-colors font-medium">
                Leaderboard
              </Link>
              <Link href="/me" className="text-sm text-gray-300 hover:text-amber-400 transition-colors font-medium">
                My Profile
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden text-gray-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            <Link href="/map" className="block text-sm text-gray-300 hover:text-amber-400 py-2" onClick={() => setMenuOpen(false)}>Map</Link>
            <Link href="/leaderboard" className="block text-sm text-gray-300 hover:text-amber-400 py-2" onClick={() => setMenuOpen(false)}>Leaderboard</Link>
            <Link href="/me" className="block text-sm text-gray-300 hover:text-amber-400 py-2" onClick={() => setMenuOpen(false)}>My Profile</Link>
          </div>
        )}
      </div>
    </nav>
  );
}
