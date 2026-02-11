# Session Configuration Guide

## The Problem

**Without proper configuration, all users sharing the same Basecamp chatbot will have their conversations mixed together.**

### Real-World Example

Janeth asks: "My name is Janeth, what's my favorite color?"
Bot remembers: "I don't have that information yet."

Arturo asks: "My name is Arturo, and my favorite color is blue."
Bot remembers: "Your favorite color is blue."

Janeth asks: "What's my name and favorite color?"
Bot responds: "Your name is Arturo and your favorite color is blue." ❌

**This happens because both users are routed to the same shared session.**

## Root Cause

The Basecamp plugin correctly passes user identity information (`creator.id`, `creator.name`, etc.) in every webhook message. However, **OpenClaw's session routing layer decides how to construct session keys BEFORE the plugin processes the message**.

This routing behavior is controlled by the global `session.dmScope` setting in `~/.openclaw/openclaw.json`:

- **Default behavior** (`dmScope: "main"` or unset): Routes ALL direct messages to a single session `agent:main:main`, ignoring user identity
- **Required behavior** (`dmScope: "per-channel-peer"`): Creates separate sessions for each user in each channel

## Required Configuration

Add this to your OpenClaw configuration file (`~/.openclaw/openclaw.json`):

```json
{
  "session": {
    "dmScope": "per-channel-peer"
  }
}
```

**Then restart the gateway:**

```bash
openclaw gateway restart
```

## How dmScope Values Affect Session Keys

| dmScope Value | Session Key Format | Behavior | Recommended? |
|---------------|-------------------|----------|--------------|
| `"main"` (default) | `agent:main:main` | **All users share ONE session** | ❌ No - causes contamination |
| `"per-peer"` | `agent:main:basecamp:dm:<user_id>` | Separate session per user across ALL channels | ⚠️ May cause issues in multi-channel setups |
| `"per-channel-peer"` | `agent:main:basecamp:dm:<callback_url>:user:<user_id>` | Separate session per user per channel | ✅ **Yes - use this** |

### Why per-channel-peer?

With `per-channel-peer`, each user gets an isolated session in each Basecamp chat:

- Janeth in Chat A: `agent:main:basecamp:dm:https://3.basecamp.com/.../lines/123:user:1001`
- Arturo in Chat A: `agent:main:basecamp:dm:https://3.basecamp.com/.../lines/123:user:1002`
- Janeth in Chat B: `agent:main:basecamp:dm:https://3.basecamp.com/.../lines/456:user:1001`

Each conversation is completely isolated.

## Verification Steps

### 1. Check Your Configuration

```bash
cat ~/.openclaw/openclaw.json | grep -A 2 '"session"'
```

You should see:
```json
"session": {
  "dmScope": "per-channel-peer"
}
```

### 2. Test Session Isolation

Have two different users send messages to the bot:

**User A (Janeth):**
```
!handy My name is Janeth
```

**User B (Arturo):**
```
!handy My name is Arturo
```

**User A (Janeth) again:**
```
!handy What is my name?
```

**Expected response:** "Your name is Janeth" (NOT "Arturo")

### 3. Verify Session Keys

Check that separate sessions were created:

```bash
openclaw sessions list | grep basecamp
```

You should see **TWO** different sessions with different user IDs:
```
agent:main:basecamp:dm:https://3.basecamp.com/.../lines:user:12345
agent:main:basecamp:dm:https://3.basecamp.com/.../lines:user:67890
```

If you only see ONE session (`agent:main:main`), the configuration is not working.

## Migration Guide for Existing Deployments

If you've already deployed the plugin without proper configuration, follow these steps:

### Step 1: Add the Configuration

Edit `~/.openclaw/openclaw.json`:

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

### Step 2: Restart the Gateway

```bash
openclaw gateway restart
```

### Step 3: Verify the Fix

The startup logs should show:
```
[Basecamp] Session isolation active: dmScope = "per-channel-peer" ✓
```

If you see a warning box instead, the configuration was not applied correctly.

### Step 4: Test with Real Users

Have users send new messages. Each user will automatically get a fresh, isolated session.

### Step 5: Clean Up Old Contaminated Session (Optional)

The old contaminated session is automatically abandoned, but you can delete it to free up resources:

```bash
openclaw sessions list
openclaw sessions delete agent:main:main
```

**No data migration needed** - OpenClaw automatically creates new session files based on the new dmScope setting.

## Technical Details

### How Session Routing Works

1. **Webhook arrives** with user information: `callback_url`, `creator.id`, `creator.name`, etc.
2. **Monitor constructs From field**: `${callback_url}:user:${creator.id}`
3. **OpenClaw routing layer reads `session.dmScope`** from global config
4. **Session key is constructed** based on dmScope:
   - If `dmScope: "main"` → uses `agent:main:main` (ignores From field)
   - If `dmScope: "per-channel-peer"` → uses From field to create unique key
5. **Message is routed** to the appropriate session
6. **Plugin processes message** in the context of that session

### Why This is a Global Config

Session routing is an **architectural decision** in OpenClaw core, not a plugin-specific feature. The `session.dmScope` setting affects how ALL channels route direct messages, not just Basecamp.

This design allows consistent session behavior across all messaging platforms (Slack, Discord, Basecamp, etc.).

### Where NOT to Put This Config

❌ **Wrong - inside plugin config:**
```json
{
  "plugins": {
    "entries": {
      "basecamp": {
        "enabled": true,
        "config": {
          "session": {
            "dmScope": "per-channel-peer"  // This won't work!
          }
        }
      }
    }
  }
}
```

✅ **Correct - top level:**
```json
{
  "session": {
    "dmScope": "per-channel-peer"  // This works!
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

## Troubleshooting

### Warning Still Appears After Configuration

If you see the warning box after adding the configuration:

1. **Check file location**: Configuration must be in `~/.openclaw/openclaw.json` (not in plugin directory)
2. **Check JSON syntax**: Use a JSON validator to ensure no syntax errors
3. **Verify restart**: Make sure you actually restarted the gateway (`openclaw gateway restart`)
4. **Check logs**: Look for config parsing errors in gateway logs

### Users Still Seeing Mixed Conversations

If conversations are still mixing after configuration:

1. **Verify session keys**: Run `openclaw sessions list | grep basecamp` and confirm you see multiple sessions with different user IDs
2. **Check From field**: Look in gateway logs for the `From:` field in incoming messages - it should include user ID
3. **Clear old sessions**: Delete the old `agent:main:main` session if it still exists
4. **Test with /new command**: Have users start fresh conversations with `/new`

### Different dmScope Values

If you're using a different dmScope value:

- `"per-peer"`: Works but creates cross-channel sessions (user has same session in all chats)
- `"per-channel"`: Won't work - all users in same channel share a session
- Custom values: Not recommended unless you understand OpenClaw routing internals

## Best Practices

1. **Set dmScope BEFORE deploying** - Configure this during initial setup to avoid contaminated sessions
2. **Document in deployment guide** - Include this in your internal deployment documentation
3. **Test with multiple users** - Always verify session isolation works before production use
4. **Monitor session count** - Regularly check `openclaw sessions list` to verify proper isolation
5. **Consider automation** - Add a startup check script to verify dmScope is configured correctly

## See Also

- [OpenClaw Session Documentation](https://docs.openclaw.ai/sessions) - Learn more about session routing
- [Configuration Guide](configuration.md) - Other plugin configuration options
- [Troubleshooting Guide](troubleshooting.md) - Common issues and solutions

## Summary

- **Problem**: Default `dmScope: "main"` causes all users to share one session
- **Solution**: Set `session.dmScope: "per-channel-peer"` in `~/.openclaw/openclaw.json`
- **Verification**: Check for multiple session keys with different user IDs
- **Migration**: Just add config and restart - no data migration needed
