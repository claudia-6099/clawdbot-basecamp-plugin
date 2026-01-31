# Basecamp Chatbot Plugin for Clawdbot

[![CI](https://github.com/claudia-6099/clawdbot-basecamp-plugin/actions/workflows/ci.yml/badge.svg)](https://github.com/claudia-6099/clawdbot-basecamp-plugin/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/claudia-6099/clawdbot-basecamp-plugin/branch/main/graph/badge.svg)](https://codecov.io/gh/claudia-6099/clawdbot-basecamp-plugin)

Integrate Basecamp 3 chatbots as a native Clawdbot messaging channel.

## Features

✅ **Webhook-based messaging** - Receives messages from Basecamp via webhooks  
✅ **Session management** - Automatic session handling per chat/campfire  
✅ **Rich HTML formatting** - Tables, details/summary, and standard HTML tags  
✅ **Deferred responses** - Reliable async response delivery  
✅ **Minimal configuration** - Just enable and configure webhook path  

> **Note:** This plugin is not published to npm. It's designed to be installed locally from source.
> This provides more flexibility for customization and direct integration with your Clawdbot instance.

## Installation

### Option 1: Clone from GitHub (Recommended)

1. Clone the repository:
```bash
git clone https://github.com/claudia-6099/clawdbot-basecamp-plugin.git
cd clawdbot-basecamp-plugin
npm install --legacy-peer-deps
```

2. Add to your Clawdbot configuration:
```json
{
  "plugins": {
    "load": {
      "paths": [
        "/path/to/clawdbot-basecamp-plugin"
      ]
    }
  },
  "channels": {
    "basecamp": {
      "enabled": true,
      "botName": "claudia",
      "webhookPath": "/basecamp/webhook",
      "port": 3000
    }
  }
}
```

3. Restart Clawdbot gateway

### Option 2: Local Directory

If you already have the plugin code locally:

1. Place the plugin directory anywhere on your system
2. Add the path to your Clawdbot config:
```json
{
  "plugins": {
    "load": {
      "paths": [
        "/your/custom/path/clawdbot-basecamp-plugin"
      ]
    }
  }
}
```

**Note:** This plugin is not published to npm. Install it locally using one of the methods above.

## Basecamp Setup

### 1. Get your Basecamp Account ID and Project/Chat IDs

Find these in your Basecamp URLs:
- Account ID: `https://3.basecamp.com/[ACCOUNT_ID]/...`
- Bucket ID (Project): `.../buckets/[BUCKET_ID]/...`
- Chat ID (Campfire): `.../chats/[CHAT_ID]`

### 2. Create a Chatbot in Basecamp

Use the Basecamp API to create the chatbot:

```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "service_name": "claudia",
    "command_url": "https://your-server.com/basecamp/webhook"
  }' \
  https://3.basecampapi.com/ACCOUNT_ID/buckets/BUCKET_ID/chats/CHAT_ID/integrations.json
```

**Important:** Replace:
- `YOUR_ACCESS_TOKEN` - Get from Basecamp OAuth
- `ACCOUNT_ID` - Your Basecamp account ID
- `BUCKET_ID` - Your project/bucket ID
- `CHAT_ID` - Your chat/campfire ID
- `https://your-server.com/basecamp/webhook` - Your public webhook URL

### 3. Expose Webhook Endpoint

Your Clawdbot instance needs to be accessible from the internet. Use:
- **Caddy2** (recommended) - Reverse proxy with automatic HTTPS
- **ngrok** - For testing
- **AWS EC2** - Configure security groups to allow HTTPS traffic

Example Caddy2 configuration:
```
your-domain.com {
    reverse_proxy localhost:3000
}
```

## Usage

### In Basecamp Campfires

Mention the bot to interact:
```
@claudia What's the weather today?
```

### Direct Pings

Send a direct ping/message to the bot in Basecamp for private conversations.

## How It Works

1. **User mentions bot** in Basecamp → Basecamp sends webhook to your server
2. **Plugin receives webhook** → Extracts message and callback URL
3. **Routes to Clawdbot** → Processes message through AI
4. **Sends response** → POSTs formatted HTML back to Basecamp

## Session Management

- Each chat/campfire has a unique session (identified by `callback_url`)
- Sessions persist in memory for 24 hours
- Automatic cleanup of inactive sessions

## HTML Formatting

Basecamp supports these HTML tags:

**Standard:**
- `<p>`, `<strong>`, `<em>`, `<a>`, `<ul>`, `<ol>`, `<li>`, `<br>`

**Chatbot-specific:**
- `<table>`, `<tr>`, `<td>`, `<th>`, `<thead>`, `<tbody>`
- `<details>`, `<summary>` (collapsible content)

The plugin automatically converts basic markdown to HTML:
- `**bold**` → `<strong>bold</strong>`
- `*italic*` → `<em>italic</em>`
- `[link](url)` → `<a href="url">link</a>`

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable/disable the channel |
| `botName` | string | `"claudia"` | Bot name in Basecamp |
| `webhookPath` | string | `"/basecamp/webhook"` | Webhook endpoint path |
| `port` | number | `3000` | Server port |

## Troubleshooting

### Webhook not receiving messages

1. Check that your webhook URL is publicly accessible
2. Verify the `command_url` in Basecamp matches your webhook endpoint
3. Check Clawdbot logs for webhook errors

### Bot not responding

1. Check Clawdbot logs for errors
2. Verify the callback URL is being received in webhooks
3. Test manually with curl:

```bash
curl -X POST http://localhost:3000/basecamp/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "command": "test message",
    "creator": {
      "id": 123,
      "name": "Test User",
      "email_address": "test@example.com"
    },
    "callback_url": "https://3.basecamp.com/test/callback"
  }'
```

## Development

### Setup

```bash
git clone https://github.com/claudia-6099/clawdbot-basecamp-plugin.git
cd clawdbot-basecamp-plugin
npm install --legacy-peer-deps
```

### Build

```bash
npm run build
```

### Watch mode

```bash
npm run dev
```

### Testing

Run all tests:
```bash
npm test
```

Watch mode:
```bash
npm run test:watch
```

Coverage report:
```bash
npm run test:coverage
```

### Linting

```bash
npm run lint
```

### Type checking

```bash
npm run type-check
```

### Project Structure

```
clawdbot-basecamp-plugin/
├── index.ts                 # Plugin entry point
├── src/
│   ├── channel.ts          # Channel implementation
│   ├── webhook.ts          # Webhook handler
│   ├── send.ts             # Send messages to Basecamp
│   ├── types.ts            # TypeScript types
│   ├── config-schema.ts    # Config validation
│   └── runtime.ts          # Runtime bridge
└── clawdbot.plugin.json    # Plugin metadata
```

## API Reference

### Webhook Payload

Basecamp sends this payload to your webhook:

```typescript
{
  command: string;              // User's message text
  creator: {
    id: number;
    name: string;
    email_address: string;
    // ... more fields
  };
  callback_url: string;         // Where to POST responses
}
```

### Response Format

POST to `callback_url`:

```json
{
  "content": "<p>Your HTML-formatted response</p>"
}
```

## License

MIT

## Support

For issues and questions:
- GitHub Issues: https://github.com/claudia-6099/clawdbot-basecamp-plugin/issues
- Clawdbot Docs: https://docs.clawd.bot
