import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/Logo';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Logo height={24} />
            </div>
            <div className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-foreground-muted hover:text-foreground transition-colors">
                Features
              </Link>
              <Link href="#how-it-works" className="text-foreground-muted hover:text-foreground transition-colors">
                How It Works
              </Link>
              <Link href="#pricing" className="text-foreground-muted hover:text-foreground transition-colors">
                Pricing
              </Link>
              <Link href="/docs" className="text-foreground-muted hover:text-foreground transition-colors">
                Docs
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost">Sign In</Button>
              <Button>Launch App</Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm mb-8">
            <span className="w-2 h-2 rounded-full bg-primary" />
            Now live on Hyperliquid
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="text-gradient">AI Trading Agents</span>
            <br />
            for Perpetual Futures
          </h1>
          <p className="text-xl text-foreground-muted max-w-2xl mx-auto mb-10 leading-relaxed">
            Deploy autonomous AI agents that trade 24/7 on Hyperliquid. Define your strategy in
            natural language. Let AI execute with machine-like precision.
          </p>
          <div className="flex flex-row gap-4 justify-center flex-wrap">
            <Button size="lg" className="text-base">
              Get Started Free
            </Button>
            <Button size="lg" variant="secondary" className="text-base">
              Watch Demo
            </Button>
          </div>
          <p className="text-sm text-foreground-subtle mt-4">
            100 free credits to start. No credit card required.
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-y border-border">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: 'Active Agents', value: '2,400+' },
              { label: 'Total Volume', value: '$124M+' },
              { label: 'Avg Win Rate', value: '67%' },
              { label: 'Uptime', value: '99.9%' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-gradient mb-2">
                  {stat.value}
                </div>
                <div className="text-foreground-muted">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything you need to trade smarter
            </h2>
            <p className="text-foreground-muted text-lg max-w-2xl mx-auto">
              Powerful features designed for both beginners and advanced traders.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div key={feature.title} className="p-6 border border-border rounded-xl bg-card hover:border-primary/50 transition-colors">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-foreground-muted">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4 bg-background-secondary">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How it works</h2>
            <p className="text-foreground-muted text-lg max-w-2xl mx-auto">
              Get started in minutes. No coding required.
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={step.title} className="relative">
                <div className="text-6xl font-bold text-primary/20 mb-4">
                  {String(index + 1).padStart(2, '0')}
                </div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-foreground-muted">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to automate your trading?
          </h2>
          <p className="text-foreground-muted text-lg mb-8">
            Join thousands of traders using AI agents to trade perpetual futures on Hyperliquid.
          </p>
          <Button size="lg" className="text-base">
            Start Trading Now
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="mb-4">
                <Logo height={20} />
              </div>
              <p className="text-foreground-muted text-sm">
                AI-powered trading agents for Hyperliquid perpetual futures.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-foreground-muted text-sm">
                <li><Link href="#">Features</Link></li>
                <li><Link href="#">Pricing</Link></li>
                <li><Link href="#">Marketplace</Link></li>
                <li><Link href="#">Arena</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-foreground-muted text-sm">
                <li><Link href="#">Documentation</Link></li>
                <li><Link href="#">API</Link></li>
                <li><Link href="#">Blog</Link></li>
                <li><Link href="#">Support</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-foreground-muted text-sm">
                <li><Link href="#">Privacy Policy</Link></li>
                <li><Link href="#">Terms of Service</Link></li>
                <li><Link href="#">Risk Disclosure</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-12 pt-8 text-center text-foreground-subtle text-sm">
            <p>Trading perpetual futures involves substantial risk. Only trade with funds you can afford to lose.</p>
            <p className="mt-2">&copy; {new Date().getFullYear()} Agentiom. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Feature icons (using simple SVG components)
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

const features = [
  {
    icon: BotIcon,
    title: 'Autonomous AI Agents',
    description:
      'Deploy intelligent trading bots that analyze markets and execute trades 24/7 without manual intervention.',
  },
  {
    icon: ChatIcon,
    title: 'Natural Language Strategies',
    description:
      'Define your trading approach in plain English. No coding required—just describe what you want.',
  },
  {
    icon: ShieldIcon,
    title: 'Risk Policies',
    description:
      'Set strict guardrails on leverage, position sizes, and drawdowns. Your agent never exceeds your limits.',
  },
  {
    icon: ChartIcon,
    title: 'Real-Time Analysis',
    description:
      'AI analyzes price action, funding rates, open interest, and sentiment to find optimal entry and exit points.',
  },
  {
    icon: ZapIcon,
    title: 'Instant Execution',
    description:
      'Native Hyperliquid integration with sub-second order execution. Never miss a trade again.',
  },
  {
    icon: LayersIcon,
    title: 'Full Transparency',
    description:
      'Every decision logged with reasoning. Understand exactly why your agent made each trade.',
  },
];

const steps = [
  {
    title: 'Connect Wallet',
    description: 'Sign in with your Ethereum wallet. Non-custodial—you always control your keys.',
  },
  {
    title: 'Define Strategy',
    description: 'Describe your trading approach in natural language. Set risk policies and goals.',
  },
  {
    title: 'Fund Agent',
    description: 'Deposit USDC to your agent\'s wallet on Hyperliquid. Start with any amount.',
  },
  {
    title: 'Monitor & Iterate',
    description: 'Watch your agent trade in real-time. Adjust strategies based on performance.',
  },
];
