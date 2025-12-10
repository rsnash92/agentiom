'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Logo } from '@/components/ui/Logo';

export default function Home() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#080808] text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-[#080808]/90 backdrop-blur-xl border-b border-white/5' : ''}`}>
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <div className="flex items-center gap-12">
              <Link href="/" className="flex items-center">
                <Logo height={14} />
              </Link>
              <div className="hidden lg:flex items-center gap-8">
                <Link href="#features" className="text-[#9ca3af] hover:text-white text-sm font-medium transition-colors">
                  Features
                </Link>
                <Link href="#integrations" className="text-[#9ca3af] hover:text-white text-sm font-medium transition-colors">
                  Integrations
                </Link>
                <Link href="/docs" className="text-[#9ca3af] hover:text-white text-sm font-medium transition-colors">
                  Docs
                </Link>
                <Link href="#" className="text-[#9ca3af] hover:text-white text-sm font-medium transition-colors">
                  Blog
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/agents"
                className="hidden sm:inline-flex px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-[#ff770f] to-[#e43501] rounded-lg hover:opacity-90 transition-opacity"
              >
                Launch App
              </Link>
              <button className="lg:hidden p-2 text-white">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 lg:pt-40 pb-20 lg:pb-32 px-6 lg:px-8 overflow-hidden">
        {/* Background gradient effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#ff770f]/10 rounded-full blur-[150px]" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-[#00ffb2]/5 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-[1400px] mx-auto relative">
          {/* Badge */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm">
              <span className="w-2 h-2 rounded-full bg-[#00ffb2] animate-pulse" />
              <span className="text-[#9ca3af]">Now live on</span>
              <span className="text-white font-medium">Hyperliquid</span>
            </div>
          </div>

          {/* Main headline */}
          <div className="text-center max-w-5xl mx-auto">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight mb-6">
              <span className="text-white">AI Trading Agents.</span>
              <br />
              <span className="bg-gradient-to-r from-[#ff770f] via-[#f56e0f] to-[#e43501] bg-clip-text text-transparent">
                Autonomous Execution.
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-[#9ca3af] max-w-3xl mx-auto mb-10 leading-relaxed">
              Deploy intelligent AI agents that trade perpetual futures 24/7 on Hyperliquid.
              Define your strategy in natural language. Let AI execute with institutional-grade precision.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
              <Link
                href="/agents/new"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-black bg-gradient-to-r from-[#ff770f] to-[#e43501] rounded-xl hover:opacity-90 transition-all shadow-[0_0_30px_rgba(255,119,15,0.3)]"
              >
                Create Agent
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all"
              >
                Learn More
              </Link>
            </div>

            <p className="text-sm text-[#6b7280]">
              Start with $5,000 demo balance. No credit card required.
            </p>
          </div>

          {/* Hero Image/UI Preview */}
          <div className="mt-16 lg:mt-24 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-transparent to-transparent z-10 pointer-events-none" />
            <div className="relative rounded-2xl border border-white/10 bg-[#0d0d0d] overflow-hidden shadow-2xl">
              <div className="p-1">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                    <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                    <div className="w-3 h-3 rounded-full bg-[#28ca42]" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="px-4 py-1 bg-white/5 rounded-md text-xs text-[#6b7280]">
                      agentiom.com/agents
                    </div>
                  </div>
                </div>
                {/* Placeholder for app screenshot - shows a trading interface mockup */}
                <div className="aspect-[16/9] bg-gradient-to-br from-[#0d0d0d] to-[#121212] flex items-center justify-center">
                  <div className="grid grid-cols-3 gap-4 w-full max-w-4xl p-8">
                    {/* Left panel - Agent list */}
                    <div className="col-span-1 space-y-3">
                      <div className="h-8 bg-white/5 rounded-lg w-3/4" />
                      <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="p-3 bg-white/5 rounded-lg border border-white/5">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-2 h-2 rounded-full bg-[#00ffb2]" />
                              <div className="h-3 bg-white/20 rounded w-20" />
                            </div>
                            <div className="h-2 bg-white/10 rounded w-full mb-1" />
                            <div className="h-2 bg-white/10 rounded w-2/3" />
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Center - Chart */}
                    <div className="col-span-2 bg-white/5 rounded-lg border border-white/5 p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="h-4 bg-white/20 rounded w-16" />
                          <div className="h-4 bg-[#00ffb2]/20 text-[#00ffb2] text-xs px-2 py-0.5 rounded">+12.4%</div>
                        </div>
                        <div className="h-6 bg-white/10 rounded w-24" />
                      </div>
                      {/* Chart lines */}
                      <div className="h-40 flex items-end gap-1">
                        {[40, 55, 35, 65, 45, 70, 50, 80, 60, 75, 85, 70, 90, 78, 95].map((h, i) => (
                          <div key={i} className="flex-1 bg-gradient-to-t from-[#ff770f]/20 to-[#ff770f]/5 rounded-t" style={{ height: `${h}%` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations Bar */}
      <section id="integrations" className="py-12 border-y border-white/5 bg-[#0a0a0a]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <p className="text-center text-sm text-[#6b7280] mb-8">Integrated with leading exchanges</p>
          <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-16">
            {['Hyperliquid', 'Bybit', 'Binance', 'dYdX', 'GMX'].map((name) => (
              <div key={name} className="text-xl lg:text-2xl font-bold text-[#3f3f46] hover:text-[#6b7280] transition-colors cursor-default">
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 lg:py-28">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-[#ff770f] to-[#e43501] bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-[#6b7280] text-sm lg:text-base">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 lg:py-28">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="text-center mb-16 lg:mb-20">
            <p className="text-[#ff770f] text-sm font-semibold uppercase tracking-wider mb-4">Features</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
              Everything you need to
              <br />
              <span className="bg-gradient-to-r from-[#ff770f] to-[#e43501] bg-clip-text text-transparent">trade smarter</span>
            </h2>
            <p className="text-[#9ca3af] text-lg max-w-2xl mx-auto">
              Powerful AI-driven features designed for both beginners and professional traders.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="group p-6 lg:p-8 rounded-2xl bg-gradient-to-b from-white/[0.03] to-transparent border border-white/5 hover:border-[#ff770f]/30 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${
                  index % 3 === 0 ? 'bg-[#ff770f]/10 text-[#ff770f]' :
                  index % 3 === 1 ? 'bg-[#00ffb2]/10 text-[#00ffb2]' :
                  'bg-white/10 text-white'
                }`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg lg:text-xl font-semibold mb-3 text-white group-hover:text-[#ff770f] transition-colors">
                  {feature.title}
                </h3>
                <p className="text-[#9ca3af] leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 lg:py-28 bg-gradient-to-b from-[#0a0a0a] to-[#080808]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="text-center mb-16 lg:mb-20">
            <p className="text-[#00ffb2] text-sm font-semibold uppercase tracking-wider mb-4">How It Works</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
              Get started in minutes
            </h2>
            <p className="text-[#9ca3af] text-lg max-w-2xl mx-auto">
              No coding required. Define your strategy in plain English and let AI handle the rest.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={step.title} className="relative">
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-[60%] w-full h-px bg-gradient-to-r from-white/20 to-transparent" />
                )}
                <div className="text-6xl lg:text-7xl font-bold text-white/5 mb-4">
                  {String(index + 1).padStart(2, '0')}
                </div>
                <h3 className="text-lg font-semibold mb-2 text-white">{step.title}</h3>
                <p className="text-[#9ca3af] text-sm leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Strategy Section */}
      <section className="py-20 lg:py-28">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <p className="text-[#ff770f] text-sm font-semibold uppercase tracking-wider mb-4">AI-Powered</p>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
                Complex strategies.
                <br />
                <span className="bg-gradient-to-r from-[#ff770f] to-[#e43501] bg-clip-text text-transparent">Simple interface.</span>
              </h2>
              <p className="text-[#9ca3af] text-lg mb-8 leading-relaxed">
                Describe your trading approach in natural language. Our AI understands momentum trading, mean reversion,
                trend following, and more. You focus on the &quot;what&quot; and &quot;when&quot; — our engine handles the &quot;how&quot;.
              </p>
              <ul className="space-y-4">
                {[
                  'Natural language strategy definition',
                  'AI-powered market analysis',
                  'Automatic risk management',
                  'Real-time decision logging',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-[#9ca3af]">
                    <div className="w-5 h-5 rounded-full bg-[#00ffb2]/10 flex items-center justify-center">
                      <CheckIcon className="w-3 h-3 text-[#00ffb2]" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-[#ff770f]/20 to-[#00ffb2]/20 rounded-3xl blur-[80px]" />
              <div className="relative rounded-2xl border border-white/10 bg-[#0d0d0d] p-6 lg:p-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[#ff770f]/10 flex items-center justify-center">
                    <BotIcon className="w-4 h-4 text-[#ff770f]" />
                  </div>
                  <span className="text-sm font-medium">Strategy Prompt</span>
                </div>
                <div className="bg-[#080808] rounded-lg p-4 font-mono text-sm text-[#9ca3af] leading-relaxed">
                  <span className="text-[#00ffb2]">&quot;</span>
                  Trade BTC and ETH perpetuals. Look for momentum breakouts on the 4h timeframe.
                  Enter long when price breaks above 20-period high with increasing volume.
                  Use 3x leverage max. Stop loss at 2% below entry. Take profit at 1.5:1 risk-reward.
                  <span className="text-[#00ffb2]">&quot;</span>
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm text-[#6b7280]">
                  <div className="w-2 h-2 rounded-full bg-[#00ffb2] animate-pulse" />
                  Agent analyzing market conditions...
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Real-time Tracking Section */}
      <section className="py-20 lg:py-28 bg-gradient-to-b from-[#080808] to-[#0a0a0a]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="order-2 lg:order-1">
              <div className="relative rounded-2xl border border-white/10 bg-[#0d0d0d] overflow-hidden">
                <div className="p-4 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#00ffb2]" />
                    <span className="text-sm font-medium">Live Order Tracking</span>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  {[
                    { symbol: 'BTC-PERP', side: 'LONG', size: '$2,500', pnl: '+$127.40', pnlPct: '+5.1%' },
                    { symbol: 'ETH-PERP', side: 'LONG', size: '$1,800', pnl: '+$89.20', pnlPct: '+4.9%' },
                    { symbol: 'SOL-PERP', side: 'SHORT', size: '$1,200', pnl: '-$24.60', pnlPct: '-2.1%' },
                  ].map((trade) => (
                    <div key={trade.symbol} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                          trade.side === 'LONG' ? 'bg-[#00ffb2]/10 text-[#00ffb2]' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {trade.side}
                        </span>
                        <span className="text-sm font-medium">{trade.symbol}</span>
                        <span className="text-xs text-[#6b7280]">{trade.size}</span>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-semibold ${trade.pnl.startsWith('+') ? 'text-[#00ffb2]' : 'text-red-400'}`}>
                          {trade.pnl}
                        </div>
                        <div className={`text-xs ${trade.pnlPct.startsWith('+') ? 'text-[#00ffb2]/70' : 'text-red-400/70'}`}>
                          {trade.pnlPct}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <p className="text-[#00ffb2] text-sm font-semibold uppercase tracking-wider mb-4">Full Transparency</p>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
                Track every trade.
                <br />
                <span className="bg-gradient-to-r from-[#00ffb2] to-[#00cc8e] bg-clip-text text-transparent">In real-time.</span>
              </h2>
              <p className="text-[#9ca3af] text-lg mb-8 leading-relaxed">
                Monitor your agent&apos;s positions, orders, and performance in real-time.
                Every decision is logged with reasoning so you understand exactly why your agent made each trade.
              </p>
              <ul className="space-y-4">
                {[
                  'Real-time position monitoring',
                  'Complete decision audit trail',
                  'Performance analytics dashboard',
                  'Transaction cost analysis',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-[#9ca3af]">
                    <div className="w-5 h-5 rounded-full bg-[#00ffb2]/10 flex items-center justify-center">
                      <CheckIcon className="w-3 h-3 text-[#00ffb2]" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-28">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="relative rounded-3xl overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#ff770f]/20 via-[#e43501]/10 to-[#ff770f]/20" />
            <div className="absolute inset-0 bg-[#0d0d0d]" style={{ opacity: 0.9 }} />

            <div className="relative px-8 py-16 lg:px-16 lg:py-24 text-center">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
                Ready to automate your trading?
              </h2>
              <p className="text-[#9ca3af] text-lg max-w-2xl mx-auto mb-10">
                Join traders using AI agents to trade perpetual futures on Hyperliquid.
                Start with a free demo account.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/agents/new"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-black bg-gradient-to-r from-[#ff770f] to-[#e43501] rounded-xl hover:opacity-90 transition-all shadow-[0_0_30px_rgba(255,119,15,0.3)]"
                >
                  Start Trading Now
                  <ArrowRightIcon className="w-4 h-4" />
                </Link>
                <Link
                  href="/docs"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all"
                >
                  Read Documentation
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-16 lg:py-20">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12">
            <div className="col-span-2 md:col-span-4 lg:col-span-1 mb-8 lg:mb-0">
              <Logo height={12} />
              <p className="text-[#6b7280] text-sm mt-4 max-w-xs">
                AI-powered trading agents for perpetual futures on Hyperliquid.
              </p>
              <div className="flex gap-4 mt-6">
                <a href="#" className="text-[#6b7280] hover:text-white transition-colors">
                  <TwitterIcon className="w-5 h-5" />
                </a>
                <a href="#" className="text-[#6b7280] hover:text-white transition-colors">
                  <DiscordIcon className="w-5 h-5" />
                </a>
                <a href="#" className="text-[#6b7280] hover:text-white transition-colors">
                  <GithubIcon className="w-5 h-5" />
                </a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-3 text-[#6b7280] text-sm">
                <li><Link href="#features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Marketplace</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">API</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Resources</h4>
              <ul className="space-y-3 text-[#6b7280] text-sm">
                <li><Link href="/docs" className="hover:text-white transition-colors">Documentation</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Support</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Status</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-3 text-[#6b7280] text-sm">
                <li><Link href="#" className="hover:text-white transition-colors">About</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Careers</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-3 text-[#6b7280] text-sm">
                <li><Link href="#" className="hover:text-white transition-colors">Privacy</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Terms</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Risk Disclosure</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/5 mt-12 pt-8 text-center text-[#6b7280] text-sm">
            <p className="mb-2">Trading perpetual futures involves substantial risk. Only trade with funds you can afford to lose.</p>
            <p>&copy; {new Date().getFullYear()} Agentiom. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Icons
const ArrowRightIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
  </svg>
);

const BotIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const ChartIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
  </svg>
);

const ShieldIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const ChatIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const ZapIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const LayersIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
);

const TwitterIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const DiscordIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

const GithubIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

const stats = [
  { label: 'Active Agents', value: '2,400+' },
  { label: 'Total Volume', value: '$124M+' },
  { label: 'Avg Win Rate', value: '67%' },
  { label: 'Uptime', value: '99.9%' },
];

const features = [
  {
    icon: BotIcon,
    title: 'Autonomous AI Agents',
    description: 'Deploy intelligent trading bots that analyze markets and execute trades 24/7 without manual intervention.',
  },
  {
    icon: ChatIcon,
    title: 'Natural Language Strategies',
    description: 'Define your trading approach in plain English. No coding required—just describe what you want.',
  },
  {
    icon: ShieldIcon,
    title: 'Risk Policies',
    description: 'Set strict guardrails on leverage, position sizes, and drawdowns. Your agent never exceeds your limits.',
  },
  {
    icon: ChartIcon,
    title: 'Real-Time Analysis',
    description: 'AI analyzes price action, funding rates, open interest, and sentiment to find optimal entry and exit points.',
  },
  {
    icon: ZapIcon,
    title: 'Instant Execution',
    description: 'Native Hyperliquid integration with sub-second order execution. Never miss a trade again.',
  },
  {
    icon: LayersIcon,
    title: 'Full Transparency',
    description: 'Every decision logged with reasoning. Understand exactly why your agent made each trade.',
  },
];

const steps = [
  {
    title: 'Connect Wallet',
    description: 'Sign in with your wallet. Non-custodial—you always control your keys.',
  },
  {
    title: 'Define Strategy',
    description: 'Describe your trading approach in natural language. Set risk policies and goals.',
  },
  {
    title: 'Fund Agent',
    description: 'Start with demo funds or deposit USDC to your agent\'s wallet on Hyperliquid.',
  },
  {
    title: 'Monitor & Iterate',
    description: 'Watch your agent trade in real-time. Adjust strategies based on performance.',
  },
];
