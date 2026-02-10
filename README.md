# Basecamp Chatbot Plugin for OpenClaw

[![CI](https://github.com/claudia-6099/clawdbot-basecamp-plugin/actions/workflows/ci.yml/badge.svg)](https://github.com/claudia-6099/clawdbot-basecamp-plugin/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/claudia-6099/clawdbot-basecamp-plugin/branch/main/graph/badge.svg)](https://codecov.io/gh/claudia-6099/clawdbot-basecamp-plugin)

Integrate Basecamp 3 chatbots as a native OpenClaw messaging channel.

## Features

- ✅ **Webhook-based messaging** - Receives messages from Basecamp via webhooks
- ✅ **Session management** - Automatic per-user session handling (isolated per person per chat)
- ✅ **Rich HTML formatting** - Tables, details/summary, and standard HTML tags
- ✅ **Slash commands** - Full support for OpenClaw commands (`/new`, `/help`, etc.)
- ✅ **Chat type detection** - Automatically detects group campfires vs direct pings via Basecamp API
- ✅ **Thinking indicator** - Shows "Pensando..." feedback while the agent processes long requests
- ✅ **Block streaming** - Delivers each response block as it completes (no waiting for full response)
- ✅ **Progress reporting** - Custom tools for reporting progress during long operations
- ✅ **OAuth integration** - Optional OAuth setup for chat type detection and API features
- ✅ **Minimal configuration** - Works out of the box; OAuth and advanced features are optional

> **Note:** This plugin is designed to be installed locally from source.
> This provides more flexibility for customization and direct integration with your OpenClaw instance.

## Installation

### Prerequisites

- OpenClaw installed and configured
- Node.js 18+ and npm
- Public webhook URL (ngrok, cloudflare tunnel, or production domain)

### Step 1: Clone from GitHub

```bash
git clone https://github.com/claudia-6099/clawdbot-basecamp-plugin.git
cd clawdbot-basecamp-plugin
npm install --legacy-peer-deps
```

Or install via the OpenClaw CLI:
```bash
openclaw plugins install @openclaw/basecamp
```

### Step 2: Add to OpenClaw Configuration

Add the plugin path and channel configuration to your OpenClaw config:

```json
{
  "plugins": {
    "load": {
      "paths": [
        "/path/to/openclaw-basecamp-plugin"
      ]
    },
    "entries": {
      "basecamp": {
        "enabled": true,
        "config": {
          "enabled": true,
          "botName": "claudia",
          "webhookPath": "/basecamp/webhook",
          "port": 3000
        }
      }
    }
  }
}
```

**Important paths:**
- Use absolute path in `plugins.load.paths`
- Example: `"/Users/arturo/projects/openclaw-basecamp-plugin"`
- Or install via npm and skip `load.paths` entirely

### Step 3: Restart OpenClaw Gateway

```bash
openclaw gateway restart
```

### Step 4: Verify Installation

```bash
openclaw plugins list
```

You should see `basecamp` in the list of loaded plugins.

## Basecamp Setup

### 1. Get Your Account ID

Your Basecamp Account ID is in any Basecamp URL:
- Account ID: `https://3.basecamp.com/[ACCOUNT_ID]/...`

### 2. Create Chatbot Integration

For each Basecamp chat/campfire where you want the bot:

```bash
curl -X POST \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Claudia Bot",
    "command_url": "https://your-server.com/basecamp/webhook"
  }' \
  https://3.basecampapi.com/$ACCOUNT_ID/buckets/$BUCKET_ID/chats/$CHAT_ID/integrations.json
```

**Required:**
- `$ACCESS_TOKEN` - Your Basecamp OAuth token ([how to get it](https://github.com/basecamp/api/blob/master/sections/authentication.md))
- `$ACCOUNT_ID` - Your Basecamp account ID
- `$BUCKET_ID` - The project/bucket ID containing the chat
- `$CHAT_ID` - The specific chat/campfire ID
- `https://your-server.com/basecamp/webhook` - Your public webhook URL (where OpenClaw is accessible)

**Note:** The base URL `https://3.basecampapi.com/` is fixed - it's Basecamp's official API endpoint

### 3. Test the Integration

In your Basecamp chat, trigger the bot:
```
@claudia hello
```

The bot should respond via OpenClaw!

## Configuration

### Config Schema

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable/disable the plugin |
| `botName` | string | `"claudia"` | Bot trigger name in Basecamp |
| `webhookPath` | string | `"/basecamp/webhook"` | Webhook endpoint path |
| `port` | number | `3000` | Server port (usually gateway port) |
| `oauth.clientId` | string | — | Basecamp OAuth app client ID (optional) |
| `oauth.clientSecret` | string | — | Basecamp OAuth app client secret (optional) |
| `oauth.redirectUri` | string | — | OAuth redirect URI (optional) |
| `chatTypeCache.ttlDays` | number | `7` | How long to cache chat type detection results |

### Example Configurations

**Minimal (defaults):**
```json
{
  "plugins": {
    "entries": {
      "basecamp": {
        "enabled": true
      }
    }
  }
}
```

**With OAuth for chat type detection:**
```json
{
  "plugins": {
    "entries": {
      "basecamp": {
        "enabled": true,
        "config": {
          "botName": "claudia",
          "oauth": {
            "clientId": "your-client-id",
            "clientSecret": "your-client-secret",
            "redirectUri": "http://localhost:3000/basecamp/oauth/callback"
          },
          "chatTypeCache": {
            "ttlDays": 14
          }
        }
      }
    }
  }
}
```

**Custom bot name:**
```json
{
  "plugins": {
    "entries": {
      "basecamp": {
        "enabled": true,
        "config": {
          "botName": "assistant",
          "webhookPath": "/webhook/basecamp"
        }
      }
    }
  }
}
```

## How It Works

### Message Flow

1. **Basecamp → OpenClaw**
   - User mentions `@claudia` in Basecamp chat
   - Basecamp sends webhook to `https://your-server.com/basecamp/webhook`
   - Plugin receives webhook, validates callback URL domain, and applies rate limiting

2. **OpenClaw Processing**
   - Creates/resumes session for user (keyed by `callback_url + creator_id`)
   - Detects chat type (group campfire vs direct ping) via Basecamp API if OAuth is configured
   - Routes message to AI agent with full user context
   - If 3 seconds pass without a response, sends a "Pensando..." thinking indicator

3. **OpenClaw → Basecamp**
   - Each response block is delivered to Basecamp as it completes (streaming)
   - Message appears in Basecamp chat with HTML formatting preserved
   - Slash commands (`/new`, `/help`, etc.) are fully supported

### Session Management

- **Key:** `callback_url:user:creator_id` (unique per person per chat)
- **Isolation:** Each user maintains fully independent conversation context, even in group campfires
- **Lifecycle:** Auto-created on first message, cleaned up after 24h inactivity
- **Cleanup:** Automatic every 6 hours
- **Concurrent users:** Multiple users can interact with the bot simultaneously without interference

### Slash Commands

All OpenClaw slash commands work in Basecamp (e.g., `/new`, `/help`, `/status`). Commands are authorized automatically — Basecamp webhooks are inherently authenticated since the `creator` field is verified by Basecamp.

### Thinking Indicator

When a user sends a non-command message, the plugin waits 3 seconds. If the agent hasn't produced any response blocks yet, it sends an italic "Pensando..." message to Basecamp so the user knows the bot is working. The indicator is automatically cancelled if a response arrives within 3 seconds.

### Block Streaming

Instead of waiting for the entire agent response to complete, the plugin delivers each response block to Basecamp as soon as it's ready. This means users see responses appearing progressively rather than waiting for a potentially long generation to finish.

### Chat Type Detection

When OAuth is configured, the plugin automatically detects whether each conversation is a **group campfire** or a **direct ping**:

- **Group** (`ChatType: "group"`): Messages from project campfires. The chat name is included as `ChatName`.
- **Direct** (`ChatType: "direct"`): Messages from Basecamp pings (1-on-1 conversations).

Detection results are cached to disk (`~/.openclaw/cache/basecamp-chat-types.json`) with a configurable TTL (default 7 days).

**Without OAuth:** All chats default to `"direct"` type. This is the standard behavior and works fine for most use cases.

## Security

### Webhook Security

Since Basecamp does not provide webhook signature verification (unlike GitHub, Stripe, etc.), this plugin implements multiple security layers:

#### 1. Callback URL Domain Validation
- ✅ Only accepts webhooks with `callback_url` from `*.basecamp.com` domains
- ❌ Rejects spoofed requests with malicious callback URLs
- Returns `403 Forbidden` for invalid domains

#### 2. Rate Limiting
- **Limit:** 20 requests per minute per session (per user per chat)
- **Window:** 60-second sliding window
- **Response:** `429 Too Many Requests` with `Retry-After: 60` header
- **Cleanup:** Automatic memory cleanup every 5 minutes

#### 3. HTTPS Requirement
- Basecamp requires all webhook URLs to use HTTPS
- Ensures encrypted communication

#### 4. URL Secrecy
- The webhook URL itself acts as an authentication token
- Use a long, random path (e.g., `/webhook/basecamp/ai-ops-a8f3b9e2`)
- Keep webhook URLs secret and rotate if compromised

### Best Practices

1. **Use a reverse proxy** (nginx, caddy) with additional rate limiting
2. **Monitor logs** for suspicious activity patterns
3. **Rotate webhook URLs** periodically or after suspected compromise
4. **Use environment variables** for webhook paths in production
5. **Implement IP allowlisting** if Basecamp publishes webhook IP ranges

## Capabilities

### ✅ Supported

- Text messages (campfires and direct pings)
- HTML formatting (tables, bold, italic, links)
- `<details>` and `<summary>` tags (collapsible sections)
- Slash commands (`/new`, `/help`, `/status`, etc.)
- Block streaming (progressive response delivery)
- Thinking indicator (automatic "Pensando..." for slow responses)
- Chat type detection (group vs direct, with OAuth)
- Deferred responses (async processing)

### ❌ Not Supported

- Reactions (Basecamp API limitation)
- Message editing (Basecamp API limitation)
- Message deletion (Basecamp API limitation)
- File uploads (not implemented)

## OAuth Setup (Optional)

OAuth is **optional**. Without it, the plugin works normally — all chats are treated as direct conversations. OAuth enables chat type detection (group vs direct) via the Basecamp API.

### 1. Register a Basecamp OAuth App

1. Go to [https://launchpad.37signals.com/integrations](https://launchpad.37signals.com/integrations)
2. Click **Register an application**
3. Fill in:
   - **Name:** Your bot name (e.g., "Claudia Bot")
   - **Redirect URI:** Your redirect URI (e.g., `http://localhost:3000/basecamp/oauth/callback`)
4. Note the **Client ID** and **Client Secret**

### 2. Add OAuth to Config

```json
{
  "plugins": {
    "entries": {
      "basecamp": {
        "enabled": true,
        "config": {
          "oauth": {
            "clientId": "your-client-id",
            "clientSecret": "your-client-secret",
            "redirectUri": "http://localhost:3000/basecamp/oauth/callback"
          }
        }
      }
    }
  }
}
```

### 3. Authorize via Bot Commands

In any Basecamp chat where the bot is installed:

1. **Get the authorization URL:**
   ```
   @claudia /basecamp-auth
   ```
   The bot will reply with a URL. Open it in your browser and authorize the app.

2. **Submit the authorization code:**
   ```
   @claudia /basecamp-token AUTH_CODE_HERE
   ```
   The bot will exchange the code for access and refresh tokens, stored securely at `~/.openclaw/credentials/basecamp-oauth.json`.

3. **Verify status:**
   ```
   @claudia /basecamp-status
   ```
   Shows whether OAuth is configured, token validity, and cache statistics.

### Token Management

- Tokens are stored at `~/.openclaw/credentials/basecamp-oauth.json` with `chmod 600` permissions
- Refresh tokens are used automatically when access tokens expire
- If a refresh fails, credentials are cleared and you'll need to re-authorize

## Bot Commands

These commands are available via the Basecamp chat (prefix with `@botname`):

| Command | Description |
|---------|-------------|
| `/basecamp-auth` | Generate OAuth authorization URL |
| `/basecamp-token <code>` | Exchange authorization code for OAuth tokens |
| `/basecamp-status` | Show OAuth status and cache statistics |

In addition, all standard OpenClaw slash commands work (`/new`, `/help`, `/status`, etc.).

## Progress Reporting Tool

The Basecamp plugin provides custom tools that scripts and sub-agents can use to report progress during long-running operations.

### Available Actions

#### `report_progress`
Send intermediate progress updates back to the Basecamp chat while a task is running.

**Parameters:**
- `message` (string, required) - The progress message to send to Basecamp

**Example usage in agent tools:**

```typescript
// From within an OpenClaw agent tool or action
await handleAction({
  action: 'report_progress',
  params: {
    message: 'Step 1/3: Analyzing data...'
  },
  toolContext: context
});
```

**Example usage in bash scripts (if environment variables are exposed):**

```bash
# Hypothetical - depends on OpenClaw environment setup
openclaw action basecamp report_progress --message "Processing file 1 of 10..."
```

#### `send_to_basecamp`
Alias for `report_progress` - same functionality, alternative name.

### How It Works

1. **Context Storage:** When a webhook is received, the `callback_url` is stored in the session context as `BasecampCallbackUrl`
2. **Tool Context:** The `threading.buildToolContext` provides this URL to tools via `toolContext.basecampCallbackUrl`
3. **Action Handler:** The action handler uses the callback URL to send messages back to Basecamp

### Use Cases

- **Long data processing:** Report progress through multiple stages
- **File operations:** Update status while processing multiple files
- **External API calls:** Show progress for slow API operations
- **Background tasks:** Keep users informed during async operations

### Session Context Variables

The following fields are added to the OpenClaw context for each Basecamp message:

| Field | Description |
|-------|-------------|
| `From` | Session identifier (`callback_url:user:creator_id`) |
| `UserName` | Basecamp user's display name |
| `UserEmail` | Basecamp user's email address |
| `UserId` | Basecamp user ID (string) |
| `Body` | Message with user prefix (`[Name \| Email]: message`) |
| `RawBody` | Original message text |
| `CommandBody` | Original message text (for command parsing) |
| `Channel` | Always `"basecamp"` |
| `Provider` | Always `"basecamp"` |
| `Surface` | Always `"basecamp"` |
| `AccountId` | OpenClaw account ID |
| `CommandAuthorized` | Always `true` (enables slash commands) |
| `ChatType` | `"direct"` or `"group"` (detected via API or defaults to `"direct"`) |
| `ChatName` | Chat/campfire name (only for group chats with OAuth) |
| `BasecampCallbackUrl` | The Basecamp callback URL for sending responses |
| `To` | Standard target field (set to callback URL) |

These fields are accessible to scripts, tools, and sub-agents via OpenClaw's context system.

## Development

### Project Structure

```
openclaw-basecamp-plugin/
├── index.ts                 # Plugin entry point (object export with register)
├── openclaw.plugin.json     # Plugin manifest
├── package.json             # Dependencies + OpenClaw metadata
├── src/
│   ├── channel.ts          # Channel factory with actions & gateway webhook handling
│   ├── monitor.ts          # Webhook handler, dispatch, thinking indicator, block streaming
│   ├── send.ts             # Message formatting & sending to Basecamp
│   ├── chat-detection.ts   # Chat type detection (group vs direct) via Basecamp API
│   ├── oauth.ts            # OAuth token lifecycle (store, refresh, validate, exchange)
│   ├── config-schema.ts    # Config validation & defaults
│   ├── types.ts            # TypeScript interfaces
│   └── __tests__/          # Test files
└── README.md
```

### Run Tests

```bash
npm test                 # Run once
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
```

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

## Troubleshooting

### Plugin not loading

**Error:** `plugin manifest not found: openclaw.plugin.json`

**Solution:**
1. Verify `openclaw.plugin.json` exists in plugin root
2. Check `plugins.load.paths` uses absolute path
3. Restart OpenClaw gateway: `openclaw gateway restart`

### Channel not recognized

**Error:** `unknown channel id: basecamp`

**Solution:**
1. Verify `plugins.entries.basecamp` exists in config
2. Check plugin is enabled: `openclaw plugins list`
3. Verify `openclaw.channel` metadata in package.json

### Webhook not receiving messages

**Checklist:**
1. ✅ Webhook URL is publicly accessible
2. ✅ URL matches `webhookPath` in config (e.g., `/basecamp/webhook`)
3. ✅ Firewall allows incoming HTTP/HTTPS
4. ✅ SSL certificate valid (if using HTTPS)
5. ✅ Basecamp integration created with correct `command_url`

**Test webhook manually:**
```bash
curl -X POST http://localhost:3000/basecamp/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "command": "hello",
    "callback_url": "https://3.basecamp.com/test/callback"
  }'
```

### Bot not responding in Basecamp

**Common causes:**
1. Bot name mismatch (config: `claudia`, Basecamp trigger: `@assistant`)
2. Session creation failed (check OpenClaw logs)
3. Callback URL unreachable (Basecamp must reach your server)

**Debug:**
1. Check OpenClaw logs: `openclaw gateway logs`
2. Verify plugin loaded: `openclaw plugins info basecamp`
3. Test send manually using the callback URL

## Resources

- [OpenClaw Plugin Documentation](https://docs.openclaw.ai/plugin)
- [OpenClaw Channel Plugin Guide](https://docs.openclaw.ai/plugin#write-a-new-messaging-channel-step-by-step)
- [Basecamp API Documentation](https://github.com/basecamp/bc3-api)
- [Basecamp Chatbot Integration API](https://github.com/basecamp/bc3-api/blob/master/sections/chatbots.md)

## Support

- **Issues:** [GitHub Issues](https://github.com/claudia-6099/clawdbot-basecamp-plugin/issues)
- **OpenClaw Community:** [Discord](https://discord.com/invite/clawd)

## License

MIT
