# AGENTIOM

## AI Trading Agents for Perpetual Futures

Deploy autonomous AI agents that trade 24/7 on Hyperliquid

Version 1.0 | December 2025
agentiom.com

---

## Executive Summary

Agentiom is an AI-powered trading terminal that enables users to deploy autonomous agents capable of trading perpetual futures on Hyperliquid 24/7. Users define trading strategies in natural language, and AI agents execute trades, manage positions, and adapt to market conditions—all without manual intervention.

The platform combines the analytical power of frontier AI models (Claude, GPT-4, Gemini) with Hyperliquid's high-performance perpetuals infrastructure to deliver institutional-grade automated trading for everyone.

### Core Value Proposition

- **AI-Driven Trading:** Agents recommend entry/exit targets, build positions aligned with your goals, and automate strategy maintenance as markets shift
- **In-Depth Analysis:** Agents perform analysis in minutes that would take human analysts hours, leveraging technical indicators, social sentiment, and institutional data
- **Secure by Design:** All activity executed on-chain using non-custodial wallets with configurable policies—you always control your keys
- **Seamless Execution:** Native Hyperliquid integration with deep liquidity, up to 50x leverage, and sub-second order execution

---

## The Problem

Crypto trading is dominated by algorithms, bots, and sophisticated quantitative strategies. Retail traders face significant disadvantages:

### Market Challenges

1. **24/7 Markets:** Cryptocurrency markets never close. Opportunities and liquidations happen at 3am.
2. **Emotional Trading:** Fear and greed drive poor decisions. New traders get liquidated; experienced ones struggle with discipline.
3. **Information Overload:** Price action, funding rates, open interest, social sentiment, news events—too much data to process manually.
4. **Execution Speed:** Algorithmic traders execute in milliseconds. Manual traders can't compete.
5. **Strategy Consistency:** Even the best strategies fail without perfect execution hygiene.

### The Opportunity

What if you could deploy a co-pilot that executes your strategies with machine-like precision, 24/7? What if AI could handle the analysis, timing, and execution—while you define the strategy and risk parameters?

This is the frontier of agentic finance. Agentiom makes it accessible to everyone.

---

## The Solution: Agentiom

Agentiom is an AI trading terminal that lets you create, customize, and deploy autonomous trading agents. Each agent has its own wallet, goals, and strategy—and trades perpetual futures on your behalf.

### How It Works

1. **Define Your Strategy:** Describe your trading approach in natural language. "Trade BTC with moderate leverage, focus on momentum breakouts, take profits at 5% and cut losses at 2%."
2. **Set Your Policies:** Configure risk guardrails—max leverage, position limits, drawdown thresholds, trading pairs.
3. **Fund Your Agent:** Deposit USDC to your agent's non-custodial wallet. You retain full control of your keys.
4. **Deploy & Monitor:** Your agent analyzes markets, identifies opportunities, and executes trades autonomously. Watch decisions in real-time via the chat interface.
5. **Iterate & Improve:** Adjust strategies, review performance, and refine your agent's approach based on results.

### Key Differentiators

- **Hyperliquid Native:** Built specifically for the fastest, most liquid decentralized perpetuals exchange
- **Multiple AI Models:** Choose from Claude Sonnet 4, GPT-4.1, Gemini, DeepSeek, or Grok—each optimized for different trading styles
- **Natural Language Interface:** Chat with your agent about anything—market analysis, position adjustments, strategy changes
- **Custom Data Sources:** Integrate your own signals via MCP, API, GraphQL, or Langchain
- **Transparent Execution:** Every decision logged with full reasoning—understand exactly why your agent acted

---

## Core Concepts

### Agents

Intelligent trading bots you interact with via chat. Each agent has:

- Its own non-custodial wallet
- Defined goals and trading strategy
- Configurable risk policies
- Selected AI model (Claude, GPT, Gemini, etc.)
- Full decision history and performance metrics

### Tasks (Step-Based Execution)

Unlike simple bots that run in continuous loops, Agentiom agents execute discrete **Tasks** with explicit validation steps. Each task defines a complete trading action with conditions that must pass sequentially before execution:

1. **Define Conditions:** Set up multiple validation steps (e.g., "RSI > 70", "Price near upper Bollinger Band", "ADX < 25")
2. **Sequential Validation:** Each step must pass before proceeding to the next
3. **Action Execution:** Only when all conditions are met, the trade executes
4. **Performance Tracking:** Track success rate, credits used, and trigger frequency for each task

Example: "Execute Short at Upper Bollinger Band" task with 4 steps:
- Step 1: Validate ranging conditions (ADX < 25)
- Step 2: Confirm upper band touch (price within 0.5% of upper band)
- Step 3: Check RSI overbought (RSI > 70)
- Step 4: Execute short with 2x leverage, 5% position size, 3% TP, 1.5% SL

### Workflow Adaptations

Adaptations are **learned behavioral modifications** that evolve based on agent performance. Unlike tasks (which are user-defined), adaptations emerge from trading history:

- **Example:** "Reduce position size by 50% when VIX > 30" (learned from 4 large losses during high volatility)
- **Example:** "Skip trades after 3 consecutive losses" (learned from recovery patterns)

Adaptations have confidence scores and can be paused or disabled if they stop improving outcomes.

### Policies

Risk guardrails that ensure agent strategies reflect your risk management goals:

- Maximum leverage limits
- Position size caps (absolute and percentage)
- Maximum drawdown thresholds
- Approved trading pairs
- Time-based restrictions

### Trading Strategy

The core set of policies, perspectives, and technical setups your agent uses to analyze markets. Strategies can incorporate:

- Technical analysis (RSI, MACD, trendlines, support/resistance)
- Funding rate analysis
- Open interest and liquidation levels
- Social sentiment signals
- Custom data feeds

### Credits

Pay-as-you-go compute units. Credits are consumed when your agent analyzes markets, chats, or executes trades. This ensures you only pay for actual usage.

---

## Platform Features

### AI Trading Terminal

The command center for your trading agents:

- **Chat Interface:** Talk to your agent about market conditions, adjust strategies, or request analysis
- **AI Analysis:** One-click technical analysis with price structure, trendlines, RSI/MACD, and key levels
- **Position Management:** Real-time PnL tracking, leverage adjustment, instant position closing
- **Market Intel:** Real-time data and signals powered by DexScreener and proprietary feeds
- **Alert System:** Configurable notifications for price moves, position changes, and agent decisions

### Agent Marketplace

Discover and deploy proven strategies:

- Browse top-performing agents by PnL, Sharpe ratio, win rate
- Clone successful strategies with one click
- Transparent performance history and drawdown metrics
- Strategy templates for common approaches (DCA, momentum, mean reversion)

### Arena (Competitions)

Gamified trading competitions with real stakes:

- **Human vs Machine:** Pit your manual trading against AI agents
- **Machine vs Machine:** Agent battles with live PnL streaming
- **Leaderboards:** Real-time rankings and prize pools
- **Tournament of Agents:** Seasonal competitions with significant prize pools

---

## Technical Architecture

### Technology Stack

- **Frontend:** Next.js 14 with React and TailwindCSS
- **Backend:** Python FastAPI for Hyperliquid SDK integration, Node.js for real-time services
- **Database:** Supabase (PostgreSQL with real-time subscriptions)
- **AI Models:** Anthropic Claude, OpenAI GPT-4, Google Gemini, DeepSeek, xAI Grok
- **Execution:** Hyperliquid Python SDK for order execution
- **Data:** Hyperliquid WebSocket feeds, DexScreener, Coinglass
- **Wallet Security:** Non-custodial with encrypted API key storage

### Agent Execution Loop

Each agent runs on an event-driven architecture:

1. **Data Ingestion:** Fetch real-time market data (price, funding, OI, orderbook)
2. **Position Check:** Query current positions from Hyperliquid
3. **AI Analysis:** LLM evaluates market context against strategy and policies
4. **Decision Generation:** AI outputs structured decision (action, size, leverage, TP/SL, reasoning)
5. **Validation:** Decision validated against policies before execution
6. **Execution:** Order submitted to Hyperliquid via SDK
7. **Logging:** Full decision trail recorded for transparency

### Agent Genome System

Each agent is defined by a "genome"—a JSON configuration storing its reasoning structure, parameters, and learned behaviors. This enables:

- **Performance Comparison:** Track which genome configurations produce better Sharpe ratios and PnL
- **Evolutionary Improvement:** Agents can evolve and self-improve based on performance data
- **Strategy Templates:** Successful genomes become templates for new agents

---

## Security & Risk Management

### Non-Custodial Design

- Users always control their private keys
- API keys encrypted at rest with AES-256
- Agent wallets have trading permissions only—no withdrawal capability
- Optional integration with hardware wallet signing

### Risk Controls

- Maximum position sizes enforced at protocol level
- Drawdown circuit breakers halt trading if thresholds exceeded
- All AI decisions validated before execution
- Rate limiting prevents runaway execution
- Manual override always available

### Transparency

- Every agent decision logged with full reasoning
- All trades executed on-chain with verifiable history
- Performance metrics calculated from actual execution data

---

## Business Model

### Revenue Streams

#### 1. Credit System

Pay-as-you-go compute units consumed for AI analysis and task execution:

- **Analysis Credits:** 1-3 credits per analysis cycle (varies by LLM provider)
  - Gemini/DeepSeek: 1 credit
  - Grok: 2 credits
  - Claude/GPT-4: 3 credits
- **Execution Credits:** 1 credit per successful trade execution
- **Chat Credits:** 1 credit per agent conversation
- Bulk credit purchases at discounted rates (up to 40% savings)

**Credit Pricing:**
| Credits | Price | Per Credit |
|---------|-------|------------|
| 100 | $5 | $0.05 |
| 500 | $20 | $0.04 |
| 1,000 | $35 | $0.035 |
| 5,000 | $150 | $0.03 |

#### 2. Subscription Tiers

- **Free Tier:** 100 credits/month, 1 agent, 5 tasks per agent, basic features
- **Pro ($49/month):** 1,000 credits included, 5 agents, 20 tasks per agent, 1-minute execution intervals, priority support
- **Unlimited ($149/month):** Unlimited credits and agents, 30-second execution intervals, API access, white-label options

#### 3. Arena Fees

5% of competition prize pools retained as platform fee. Entry fees for premium competitions.

#### 4. Marketplace Royalties

Strategy creators receive royalties when their agents are cloned:
- 10% of subscription revenue from cloned agents
- One-time clone fees for premium strategies

#### 5. Token Utility (Future Consideration)

*Note: Token implementation is planned for a future phase once core platform is established. Initial launch will rely on credit-based monetization via traditional payment methods (Stripe, crypto payments).*

Potential future token utility:
- Governance rights for protocol decisions
- Staking rewards for liquidity providers
- Fee discounts for token holders
- Access to exclusive features and competitions

---

## Roadmap

### Phase 1: Foundation (Q1 2026)

- Core trading terminal with chat interface
- Single-agent deployment on Hyperliquid
- **Task-based execution system** (multi-step validation)
- Claude and GPT-4 model support
- Position management and PnL tracking
- Credit-based billing (Stripe integration)

### Phase 2: Enhancement (Q2 2026)

- Multi-agent support per user
- Agent marketplace with performance leaderboard
- **Workflow Adaptations** (learned behavioral modifications)
- **Version History** tracking and rollback
- Custom data source integration (MCP, API)
- Advanced risk policies
- Mobile app launch

### Phase 3: Ecosystem (Q3 2026)

- Arena competitions launch
- Strategy sharing and royalties
- Agent genome evolution system
- Community features and social trading
- *Token planning and community discussion*

### Phase 4: Expansion (Q4 2026+)

- Multi-chain support (GMX, dYdX, Lighter)
- Institutional API access
- Advanced portfolio management
- Spot trading support
- Cross-exchange arbitrage agents
- *Potential token generation event*

---

## Competitive Landscape

The AI trading agent space is rapidly evolving. Key competitors include:

### Cod3x (Arbitrum/GMX)

AI trading terminal with agent deployment on GMX V2. Strong feature set but not Hyperliquid-native.

### Mode Network (Mode L2)

Full L2 chain with integrated perps DEX and AI tools. Requires bridging to Mode chain and significant token staking for AI features.

### Figment.trade (Orderly/Solana)

Natural language agent deployment on Orderly Network. Solana-focused ecosystem.

### Agentiom Differentiation

- **Hyperliquid Native:** Only AI agent platform built specifically for the largest decentralized perps exchange
- **No Chain Bridging:** Direct integration—no need to bridge to proprietary L2s
- **No Token Gating:** Full features accessible without massive token stakes
- **Superior Execution:** Hyperliquid's sub-second finality and deep liquidity
- **Retail-Friendly UX:** Approachable interface, not a complex "terminal"

---

## Conclusion

The era of agentic finance is here. AI will increasingly dominate crypto trading—the question is whether retail traders will be left behind or empowered to participate.

Agentiom democratizes access to institutional-grade AI trading. By combining frontier AI models with Hyperliquid's high-performance infrastructure, we enable anyone to deploy sophisticated trading strategies that execute with machine-like precision, 24/7.

What Cursor is to programming, Agentiom will be to trading.

**Join us in building the future of autonomous trading.**

**agentiom.com**

---

## Disclaimer

*This document is for informational purposes only and does not constitute financial advice, an offer to sell, or a solicitation of an offer to buy any tokens or securities.*

*Trading perpetual futures involves substantial risk of loss. AI trading agents do not guarantee profits and may result in significant losses. Past performance of any agent or strategy does not guarantee future results.*

*Users should understand the risks of leverage and on-chain trading before deploying significant capital. Never risk more than you can afford to lose.*

*Agentiom is in active development. Features, pricing, and functionality may change.*
