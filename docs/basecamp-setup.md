# Basecamp Setup

## 1. Get Your Account ID

Your Basecamp Account ID is in any Basecamp URL:
- Account ID: `https://3.basecamp.com/[ACCOUNT_ID]/...`

## 2. Create Chatbot Integration

For each Basecamp chat/campfire where you want the bot:

```bash
curl -X POST \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Handy Bot",
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

**Note:** The base URL `https://3.basecampapi.com/` is fixed — it's Basecamp's official API endpoint. The "3" is the API version, not the product version.

## 3. Test the Integration

In your Basecamp chat, trigger the bot:
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
   - **Name:** Your bot name (e.g., "Handy Bot")
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
