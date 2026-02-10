# Bot Commands

## Basecamp Plugin Commands

These commands are available via the Basecamp chat (prefix with `!botname`):

| Command | Description |
|---------|-------------|
| `/basecamp-auth` | Generate OAuth authorization URL |
| `/basecamp-token <code>` | Exchange authorization code for OAuth tokens |
| `/basecamp-status` | Show OAuth status and cache statistics |

### `/basecamp-auth`

Generates a Basecamp OAuth authorization URL. Requires `oauth.clientId` and `oauth.redirectUri` to be configured. Open the returned URL in your browser to authorize the app.

### `/basecamp-token <code>`

Exchanges an authorization code (obtained after authorizing via `/basecamp-auth`) for access and refresh tokens. Tokens are stored securely at `~/.openclaw/credentials/basecamp-oauth.json` with `chmod 600` permissions.

### `/basecamp-status`

Shows the current OAuth status, including whether credentials are configured, token validity, and the number of cached chat type entries.

## OpenClaw Slash Commands

All standard OpenClaw slash commands work in Basecamp, including:

- `/new` — Start a new conversation session
- `/help` — Show available commands
- `/status` — Show bot status

Commands are authorized automatically — Basecamp webhooks are inherently authenticated since the `creator` field is verified by Basecamp.
