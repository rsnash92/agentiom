'use client';

import Link from 'next/link';
import Image from 'next/image';
import { PixelBackground } from './pixel-background';
import { AnimatedTerminal } from './animated-terminal';

export function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[#0a0a0a] text-white overflow-hidden">
      {/* Pixel Background */}
      <PixelBackground />

      {/* Content overlay */}
      <div className="relative z-10">
        {/* Navigation */}
        <nav className="flex items-center justify-between px-6 py-4">
          <Link href="/">
            <Image
              src="/logo.png"
              alt="Agentiom"
              width={150}
              height={17}
              className="h-4 w-auto"
              priority
            />
          </Link>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm px-4 py-2 bg-white text-black font-bold uppercase tracking-wide hover:bg-gray-100 transition-colors"
          >
            <span className="font-mono text-base">&gt;_</span>
            Dashboard
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </nav>

        {/* Hero Section */}
        <main className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4">
          <div className="max-w-4xl mx-auto text-center">
            {/* Main Headline */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              <span className="text-white">Build Agents,</span>{' '}
              <span className="text-gray-500">Not Infrastructure</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
              Create and{' '}
              <span className="bg-white text-black px-1 py-0.5">deploy</span>{' '}
              AI agents in one command. Open source. Zero lock-in.
            </p>

            {/* Terminal Commands */}
            <div className="mb-12 space-y-2">
              {/* First command - one liner */}
              <div className="inline-flex items-center gap-3 bg-[#1a1a1a] border border-gray-800 px-4 py-2 rounded font-mono text-sm">
                <span className="text-gray-400">$</span>
                <span className="text-gray-200">npx agentiom create my-agent</span>
                <button
                  onClick={() => navigator.clipboard.writeText('npx agentiom create my-agent')}
                  className="ml-4 text-gray-500 hover:text-gray-300 transition-colors"
                  title="Copy to clipboard"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="9" y="9" width="13" height="13" rx="2" strokeWidth="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" strokeWidth="2" />
                  </svg>
                </button>
              </div>

              {/* Terminal window */}
              <AnimatedTerminal />
            </div>

            {/* CTA Buttons */}
            <div className="flex items-center justify-center gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center gap-3 bg-white hover:bg-gray-100 text-black font-bold px-6 py-3 transition-colors uppercase tracking-wide text-sm"
              >
                <span className="font-mono text-lg">&gt;_</span>
                Initialize Tools
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                href="https://github.com/agentiom/agentiom-starter"
                target="_blank"
                className="inline-flex items-center gap-2 bg-black border-2 border-white hover:bg-white hover:text-black text-white font-bold px-6 py-3 transition-colors uppercase tracking-wide text-sm"
              >
                Docs
              </Link>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-gray-500 animate-bounce">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </main>
      </div>
    </div>
  );
}
