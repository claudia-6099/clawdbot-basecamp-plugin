# Basecamp Chatbot Plugin for OpenClaw

[![CI](https://github.com/claudia-6099/clawdbot-basecamp-plugin/actions/workflows/ci.yml/badge.svg)](https://github.com/claudia-6099/clawdbot-basecamp-plugin/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/claudia-6099/clawdbot-basecamp-plugin/branch/main/graph/badge.svg)](https://codecov.io/gh/claudia-6099/clawdbot-basecamp-plugin)

Integrate Basecamp 3 chatbots as a native OpenClaw messaging channel.

## Features

✅ **Webhook-based messaging** - Receives messages from Basecamp via webhooks
✅ **Session management** - Automatic session handling per chat/campfire
✅ **Rich HTML formatting** - Tables, details/summary, and standard HTML tags
✅ **Deferred responses** - Reliable async response delivery
✅ **Progress reporting** - Custom tools for reporting progress during long operations
✅ **Minimal configuration** - Just enable and configure webhook path  

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
   - Plugin receives webhook and extracts message

2. **OpenClaw Processing**
   - Creates/resumes session for chat (keyed by `callback_url`)
   - Routes message to AI agent
   - Agent generates response

3. **OpenClaw → Basecamp**
   - Plugin sends response to `callback_url` from webhook
   - Message appears in Basecamp chat
   - HTML formatting preserved (tables, bold, links, etc.)

### Session Management

- **Key:** `callback_url:user:creator_id` (unique per person per chat)
- **Lifecycle:** Auto-created on first message, cleaned up after 24h inactivity
- **Cleanup:** Automatic every 6 hours
- **State:** Each user maintains independent conversation context

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

- Text messages
- HTML formatting (tables, bold, italic, links)
- `<details>` and `<summary>` tags (collapsible sections)
- Deferred responses (async processing)

### ❌ Not Supported

- Reactions (Basecamp API limitation)
- Message editing (Basecamp API limitation)
- Message deletion (Basecamp API limitation)
- File uploads (not implemented)
- Direct messages (chatbots work in campfires only)

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

The following custom fields are added to the OpenClaw context for each Basecamp message:

- `BasecampCallbackUrl` - The Basecamp callback URL for sending responses
- `To` - Standard target field (set to callback URL)
- `From` - Session identifier (callback URL + creator ID)
- `UserName` - Basecamp user's display name
- `UserEmail` - Basecamp user's email address
- `UserId` - Basecamp user ID

These fields may be accessible to scripts and sub-agents depending on OpenClaw's environment configuration.

## Development

### Project Structure

```
openclaw-basecamp-plugin/
├── index.ts                 # Plugin entry point (object export with register)
├── openclaw.plugin.json     # Plugin manifest
├── package.json             # Dependencies + OpenClaw metadata
├── src/
│   ├── channel.ts          # Channel factory with gateway webhook handling
│   ├── webhook.ts          # Webhook payload parsing & session management
│   ├── send.ts             # Message formatting & sending
│   ├── config-schema.ts    # Config validation & defaults
│   └── types.ts            # TypeScript interfaces
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
