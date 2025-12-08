import type { Metadata } from 'next';
import { IBM_Plex_Mono } from 'next/font/google';
import { Providers } from '@/components/providers';
import './globals.css';

const ibmPlexMono = IBM_Plex_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Agentiom - AI Trading Agents for Hyperliquid',
  description:
    'Deploy autonomous AI agents that trade perpetual futures 24/7 on Hyperliquid. Define strategies in natural language, let AI execute with precision.',
  keywords: [
    'AI trading',
    'Hyperliquid',
    'perpetual futures',
    'trading bot',
    'autonomous agents',
    'crypto trading',
    'algorithmic trading',
  ],
  authors: [{ name: 'Agentiom' }],
  openGraph: {
    title: 'Agentiom - AI Trading Agents for Hyperliquid',
    description:
      'Deploy autonomous AI agents that trade perpetual futures 24/7 on Hyperliquid.',
    url: 'https://agentiom.com',
    siteName: 'Agentiom',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Agentiom - AI Trading Agents for Hyperliquid',
    description:
      'Deploy autonomous AI agents that trade perpetual futures 24/7 on Hyperliquid.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${ibmPlexMono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
