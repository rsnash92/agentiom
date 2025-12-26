# @agentiom/cli

Deploy and manage stateful AI agents with Agentiom.

## Installation

```bash
npm install -g @agentiom/cli
```

## Quick Start

```bash
# Login to your account
agentiom login

# Create a new agent project
agentiom init my-agent

# Deploy to the cloud
cd my-agent
agentiom deploy
```

## Commands

| Command | Description |
|---------|-------------|
| `agentiom login` | Authenticate with Agentiom |
| `agentiom logout` | Clear stored credentials |
| `agentiom init <name>` | Create a new agent project |
| `agentiom deploy` | Deploy agent from current directory |
| `agentiom list` | List all your agents |
| `agentiom status [name]` | Show agent status |
| `agentiom start [name]` | Start a stopped agent |
| `agentiom stop [name]` | Stop a running agent |
| `agentiom logs [name]` | View agent logs |
| `agentiom destroy [name]` | Destroy an agent |

## Documentation

Visit [agentiom.com/docs](https://agentiom.com/docs) for full documentation.

## License

AGPL-3.0
