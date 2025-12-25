<div align="center">

# ⚡ Agentiom

**Deploy stateful AI agents in seconds**

Persistent storage. Wake on triggers. Zero cold starts.

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](LICENSE)
[![Build in Public](https://img.shields.io/badge/Build-In%20Public-orange.svg)](https://twitter.com/agentiom)

[Website](https://agentiom.com) • [Documentation](https://docs.agentiom.com) • [Discord](https://discord.gg/agentiom) • [Twitter](https://twitter.com/agentiom)

</div>

---

## Quick Start
```bash
npx agentiom init my-agent
cd my-agent
npx agentiom deploy
```

Your agent is live at `https://my-agent.agentiom.dev` ✨

---

## Why Agentiom?

Serverless functions forget everything. Your agents shouldn't.

| Serverless Functions | Agentiom |
|---------------------|----------|
| ❌ Stateless — forgets everything | ✅ Persistent memory & storage |
| ❌ Cold starts kill UX | ✅ Instant wake on triggers |
| ❌ Complex infra to manage | ✅ One command deploy |
| ❌ No filesystem access | ✅ Full Linux environment |

## Features

- **Persistent Storage** — Real filesystem that survives restarts
- **Wake on Trigger** — Email, webhook, cron, or API call
- **Isolated Runtime** — Each agent gets its own container
- **Sleep/Wake** — Auto-stop when idle, instant resume
- **CLI-First** — Deploy from your terminal in seconds

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| [Hono](https://hono.dev) | API Framework |
| [Turborepo](https://turbo.build) | Build System |
| [Bun](https://bun.sh) | Runtime |
| [Drizzle](https://orm.drizzle.team) | ORM |
| [Turso](https://turso.tech) | Database |
| [Fly.io](https://fly.io) | Compute & Storage |

*More integrations coming — see [ROADMAP.md](ROADMAP.md)*

---

## Project Structure
```
agentiom/
├── apps/
│   ├── api/          # Control Plane API (Hono)
│   ├── cli/          # CLI Tool
│   ├── app/          # Dashboard (coming soon)
│   └── web/          # Marketing Site (coming soon)
│
├── packages/
│   ├── providers/    # Infrastructure abstraction (Fly.io, etc.)
│   ├── db/           # Database schema (Drizzle + Turso)
│   ├── shared/       # Types & validation schemas
│   └── logger/       # Logging
│
└── tooling/          # Shared TypeScript configs
```

---

## Self-Hosting
```bash
# Clone
git clone https://github.com/Agentiom/Agentiom.git
cd Agentiom

# Install
bun install

# Configure
cp apps/api/.env.example apps/api/.env
# Edit .env with your Fly.io and Turso credentials

# Run migrations
bun db:migrate

# Start
bun dev
```

### Requirements

- [Bun](https://bun.sh) v1.1+
- [Fly.io](https://fly.io) account
- [Turso](https://turso.tech) account

---

## Roadmap

- [x] **Phase 1:** CLI, API, Deploy to Fly.io
- [ ] **Phase 2:** Sleep/Wake, Email triggers
- [ ] **Phase 3:** Cron, Webhooks, Browser automation
- [ ] **Phase 4:** Dashboard, Billing
- [ ] **Phase 5:** Agent templates, Marketplace

See [ROADMAP.md](ROADMAP.md) for details.

---

## Build in Public

We're building Agentiom in the open. Follow along:

- **GitHub** — You're here! Star the repo ⭐
- **Twitter** — [@agentiom](https://twitter.com/agentiom) for daily updates
- **Discord** — [Join the community](https://discord.gg/agentiom)

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.
```bash
# Development workflow
git checkout -b feature/my-feature
bun test
bun lint
git commit -m "feat: add new feature"
```

---

## License

[AGPL-3.0](LICENSE)

If you run Agentiom as a service, you must open source your modifications.

For commercial licensing: hello@agentiom.com

---

<div align="center">

**Built with ❤️ for the agent economy**

[⬆ Back to top](#-agentiom)

</div>