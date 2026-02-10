# Basecamp Setup

## Prerequisites

- OpenClaw gateway running with the Basecamp plugin installed
- A **publicly accessible URL** pointing to your OpenClaw instance (e.g., via ngrok, Cloudflare Tunnel, or a reverse proxy like Caddy/nginx)
- A Basecamp account with admin access to create chatbot integrations

## 1. Get Your IDs

You'll need three IDs from Basecamp, all visible in the URL when you navigate to a chat:

```
https://3.basecamp.com/[ACCOUNT_ID]/buckets/[BUCKET_ID]/chats/[CHAT_ID]
```

- **Account ID** — Your Basecamp organization ID
- **Bucket ID** — The project ID containing the chat
- **Chat ID** — The specific Campfire or Ping chat ID

## 2. Get an Access Token

You need a Basecamp API token to create the chatbot integration. See [Basecamp's authentication guide](https://github.com/basecamp/api/blob/master/sections/authentication.md) for how to obtain one.

## 3. Create the Chatbot Integration

Register a chatbot in each Basecamp Campfire where you want the bot. The `command_url` must point to your publicly accessible OpenClaw webhook endpoint:

```bash
curl -X POST \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Handy",
    "command_url": "https://your-domain.com/basecamp/webhook"
  }' \
  https://3.basecampapi.com/$ACCOUNT_ID/buckets/$BUCKET_ID/chats/$CHAT_ID/integrations.json
```

**Important:**
- The `name` field is the bot's trigger name in Basecamp — users will type `!name` to invoke it
- The `command_url` must be reachable from the internet — Basecamp sends webhooks to this URL
- The webhook path must match your plugin config (default: `/basecamp/webhook`)
- The API base URL `https://3.basecampapi.com/` is fixed — the "3" is the API version, not the product version

## 4. Test the Integration

In your Basecamp chat, mention the bot:
```
!handy hello
```

The bot should respond via OpenClaw!

## OAuth Authentication (Optional)

OAuth is **entirely optional** — the plugin works fully without it. The only thing OAuth enables is **chat type detection**: distinguishing between **Campfires** (group chats) and **Pings** (direct/individual chats). Without OAuth, all conversations are treated as Pings (direct).

If your bot only operates in one type of chat, or you don't need OpenClaw to behave differently based on chat type, you can skip this section entirely.

### Register a Basecamp OAuth App

1. Go to [https://launchpad.37signals.com/integrations](https://launchpad.37signals.com/integrations)
2. Click **Register an application**
3. Fill in:
   - **Name:** Your bot name (e.g., "Handy")
   - **Redirect URI:** Your redirect URI (e.g., `http://localhost:3000/basecamp/oauth/callback`)
4. Note the **Client ID** and **Client Secret**

### Add OAuth to Config

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

### Authorize via Bot Commands

In any Basecamp chat where the bot is installed:

1. **Get the authorization URL:**
   ```
   !handy /basecamp-auth
   ```
   The bot will reply with a URL. Open it in your browser and authorize the app.

2. **Submit the authorization code:**
   ```
   !handy /basecamp-token AUTH_CODE_HERE
   ```
   The bot will exchange the code for access and refresh tokens, stored securely at `~/.openclaw/credentials/basecamp-oauth.json`.

3. **Verify status:**
   ```
   !handy /basecamp-status
   ```
   Shows whether OAuth is configured, token validity, and cache statistics.

### Token Management

- Tokens are stored at `~/.openclaw/credentials/basecamp-oauth.json` with `chmod 600` permissions
- Refresh tokens are used automatically when access tokens expire
- If a refresh fails, credentials are cleared and you'll need to re-authorize
