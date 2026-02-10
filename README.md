# Basecamp Chatbot Plugin for OpenClaw

[![CI](https://github.com/claudia-6099/clawdbot-basecamp-plugin/actions/workflows/ci.yml/badge.svg)](https://github.com/claudia-6099/clawdbot-basecamp-plugin/actions/workflows/ci.yml)

Integrate Basecamp 4 chatbots as a native OpenClaw messaging channel.

> **Note:** Basecamp 4 uses the same API endpoints as Basecamp 3 (`3.basecamp.com`, `3.basecampapi.com`). The "3" in the URLs is the API version, not the product version.

## Features

- 🪝 **Webhook-based messaging** — Receives messages from Basecamp via webhooks
- 👤 **Session management** — Automatic per-user session handling (isolated per person per chat)
- 🎨 **Rich HTML formatting** — Tables, details/summary, and standard HTML tags
- ⚡ **Slash commands** — Full support for OpenClaw commands (`/new`, `/help`, etc.)
- 🔍 **Chat type detection** — Automatically detects Campfires (group) vs Pings (direct) via Basecamp API
- 🧠 **Thinking indicator** — Shows "Thinking..." feedback while the agent processes long requests
- 🌊 **Block streaming** — Delivers each response block as it completes (no waiting for full response)
- 📊 **Progress reporting** — Custom tools for reporting progress during long operations
- 🔐 **OAuth integration** — Optional OAuth setup for chat type detection
- ⚙️ **Minimal configuration** — Works out of the box; OAuth and advanced features are optional

> **Note:** This is a community plugin and is **not available** in the official OpenClaw plugin registry.
> The only way to install it is by cloning the repository from source.

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/claudia-6099/clawdbot-basecamp-plugin.git
cd clawdbot-basecamp-plugin
npm install --legacy-peer-deps
```

### 2. Add to OpenClaw config

```json
{
  "plugins": {
    "load": {
      "paths": ["/path/to/clawdbot-basecamp-plugin"]
    },
    "entries": {
      "basecamp": {
        "enabled": true,
        "config": {
          "botName": "handy",
          "webhookPath": "/basecamp/webhook"
        }
      }
    }
  }
}
```

### 3. Restart and verify

```bash
openclaw gateway restart
openclaw plugins list
```

### 4. Create a chatbot integration in Basecamp and test

```
!handy hello
```

See [Basecamp Setup](docs/basecamp-setup.md) for detailed instructions.

## Documentation

| Document | Description |
|----------|-------------|
| [Basecamp Setup](docs/basecamp-setup.md) | Chatbot integration, OAuth authentication (optional) |
| [Configuration](docs/configuration.md) | Config schema, examples, session context variables |
| [How It Works](docs/how-it-works.md) | Message flow, sessions, streaming, chat detection, progress reporting |
| [Security](docs/security.md) | Webhook security, rate limiting, best practices |
| [Capabilities](docs/capabilities.md) | Supported and unsupported features |
| [Bot Commands](docs/bot-commands.md) | Plugin-specific and OpenClaw slash commands |
| [Development](docs/development.md) | Project structure, tests, linting |
| [Troubleshooting](docs/troubleshooting.md) | Common issues and solutions |

## Resources

- [OpenClaw Plugin Documentation](https://docs.openclaw.ai/plugin)
- [OpenClaw Channel Plugin Guide](https://docs.openclaw.ai/plugin#write-a-new-messaging-channel-step-by-step)
- [Basecamp API Documentation](https://github.com/basecamp/bc3-api)
- [Basecamp Chatbot Integration API](https://github.com/basecamp/bc3-api/blob/master/sections/chatbots.md)

## Author

Created by [arturo-ojeda](https://github.com/arturo-ojeda)

## License

MIT
