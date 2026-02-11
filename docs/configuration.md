# Configuration

## Session Configuration (Required)

**⚠️ CRITICAL:** You must configure session isolation to prevent conversation contamination.

This is a **global OpenClaw setting**, not part of the plugin configuration. Add this to the top level of `~/.openclaw/openclaw.json`:

```json
{
  "session": {
    "dmScope": "per-channel-peer"
  }
}
```

**Then restart:**
```bash
openclaw gateway restart
```

### ✅ Correct Placement (Top Level)

```json
{
  "session": {
    "dmScope": "per-channel-peer"
  },
  "plugins": {
    "entries": {
      "basecamp": {
        "enabled": true
      }
    }
  }
}
```

### ❌ Wrong Placement (Inside Plugin Config)

```json
{
  "plugins": {
    "entries": {
      "basecamp": {
        "enabled": true,
        "config": {
          "session": {
            "dmScope": "per-channel-peer"
          }
        }
      }
    }
  }
}
```

The session configuration **must be at the top level** because it controls OpenClaw's routing layer, which runs before the plugin processes messages.

Without this configuration, all users will share one session and their conversations will mix together.

See [Session Configuration Guide](session-configuration.md) for detailed explanation and troubleshooting.

---

## Config Schema

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable/disable the plugin |
| `webhookPath` | string | `"/basecamp/webhook"` | Webhook endpoint path |
| `port` | number | `3000` | Server port (usually gateway port) |
| `oauth.clientId` | string | — | Basecamp OAuth app client ID (optional) |
| `oauth.clientSecret` | string | — | Basecamp OAuth app client secret (optional) |
| `oauth.redirectUri` | string | — | OAuth redirect URI (optional) |
| `chatTypeCache.ttlDays` | number | `7` | How long to cache chat type detection results |

## Example Configurations

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

**Custom webhook path:**
```json
{
  "plugins": {
    "entries": {
      "basecamp": {
        "enabled": true,
        "config": {
          "webhookPath": "/webhook/basecamp"
        }
      }
    }
  }
}
```

## Session Context Variables

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
