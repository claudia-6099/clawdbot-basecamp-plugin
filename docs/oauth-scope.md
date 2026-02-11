# OAuth Scope and Session Isolation

This document clarifies the relationship between OAuth configuration and session isolation in the Basecamp plugin.

## TL;DR

- **OAuth is optional** - Used only for chat type detection (Campfire vs Ping)
- **Session isolation is mandatory** - Requires `session.dmScope = "per-channel-peer"`
- **OAuth ≠ Session isolation** - They are independent concerns

## OAuth in This Plugin

### What OAuth is Used For

The Basecamp plugin uses OAuth for a **single, optional feature**: detecting whether a chat is a Campfire (group chat) or Ping (direct message).

```
User sends message → Plugin queries Basecamp API → Returns chat type → Sets context.ChatType
```

This information is purely **metadata** and does not affect session routing or user authentication.

### Why Global OAuth is Acceptable

The plugin uses a **single, global OAuth token** for all API queries. This is acceptable because:

1. **Read-only metadata queries**: Only retrieves public chat information
2. **No user impersonation**: Doesn't send messages or perform actions on behalf of users
3. **User authentication via webhooks**: Basecamp webhooks are cryptographically signed and include verified user identity
4. **Trusted webhook source**: User identity from webhooks is trustworthy (validated by Basecamp)

### What OAuth Does NOT Do

OAuth in this plugin does **not**:

- Authenticate users (done via webhook signatures)
- Authorize user actions (all users are equally authorized)
- Create separate sessions per user (done via `session.dmScope`)
- Impersonate users for API calls (uses single bot token)
- Provide any security benefit for session isolation

## Session Isolation

### How Session Isolation Works

Session isolation is completely **independent of OAuth**. It works through:

1. **Webhook payload includes user identity**:
   ```json
   {
     "creator": {
       "id": 12345,
       "name": "Janeth",
       "email_address": "janeth@example.com"
     }
   }
   ```

2. **Monitor constructs From field**:
   ```typescript
   From: `${callback_url}:user:${creator.id}`
   ```

3. **OpenClaw routes to session based on dmScope**:
   - `dmScope: "main"` → Ignores user ID, routes to `agent:main:main`
   - `dmScope: "per-channel-peer"` → Uses full From field, routes to unique session per user

4. **No OAuth required**: User identity comes from trusted webhook, not OAuth token

### Why dmScope is Required

Without proper `dmScope` configuration:

```
Janeth's message → Webhook includes creator.id=12345 → OpenClaw ignores it → Routes to agent:main:main
Arturo's message → Webhook includes creator.id=67890 → OpenClaw ignores it → Routes to agent:main:main
Result: BOTH users share one session ❌
```

With `dmScope: "per-channel-peer"`:

```
Janeth's message → Webhook includes creator.id=12345 → OpenClaw uses it → Routes to ...user:12345
Arturo's message → Webhook includes creator.id=67890 → OpenClaw uses it → Routes to ...user:67890
Result: Each user gets their own session ✓
```

## Configuration Independence

These are **two separate configurations**:

### Session Isolation (Required)

**Location**: `~/.openclaw/openclaw.json` (top level)

```json
{
  "session": {
    "dmScope": "per-channel-peer"
  }
}
```

**Purpose**: Prevent conversation contamination
**Required**: Yes, for multi-user setups
**Affects**: Session routing for all channels

### OAuth (Optional)

**Location**: `~/.openclaw/openclaw.json` (plugin config)

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

**Purpose**: Enable chat type detection
**Required**: No, defaults to "direct" without OAuth
**Affects**: Only `context.ChatType` and `context.ChatName` metadata

## Common Misconceptions

### ❌ "OAuth provides session security"

**False.** OAuth in this plugin only queries metadata. Session security comes from:
1. Webhook signature validation (done by Basecamp)
2. Proper `dmScope` configuration (done by OpenClaw)

### ❌ "Without OAuth, sessions will mix"

**False.** Session isolation is controlled by `session.dmScope`, not OAuth. You can have:
- OAuth enabled + dmScope wrong = Contaminated sessions
- OAuth disabled + dmScope correct = Isolated sessions ✓

### ❌ "I need per-user OAuth for session isolation"

**False.** Global OAuth is sufficient. User identity for sessions comes from webhook payloads, not OAuth tokens.

### ❌ "OAuth and dmScope are the same thing"

**False.** They are completely independent:
- OAuth = Optional API queries for metadata
- dmScope = Required routing configuration for sessions

## Per-User OAuth (Future Enhancement)

### When Would Per-User OAuth Be Needed?

Per-user OAuth would be required if the plugin needed to:

1. **Send messages as specific users** (impersonation)
2. **Access private user data** (personal settings, DMs with others)
3. **Perform actions requiring user authorization** (create projects, invite people)

None of these apply to the current plugin design.

### Current Architecture

```
Plugin uses:
- Single global OAuth token → Read chat metadata
- Webhook user identity → Route to correct session
- Webhook callback_url → Send responses

No per-user OAuth needed.
```

### If Per-User OAuth Were Implemented

This would require:

1. **OAuth flow per user**: Each user goes through OAuth individually
2. **Token storage per user**: Store access tokens keyed by user ID
3. **Token selection**: Choose correct token based on message sender
4. **Token refresh**: Handle expiration and refresh for each user
5. **Fallback behavior**: Handle users who haven't authenticated

**Significant complexity** for minimal benefit in this use case.

## Verification

### Test 1: Session Isolation Without OAuth

1. **Remove OAuth config** (or leave it unconfigured)
2. **Set `dmScope: "per-channel-peer"`**
3. **Restart gateway**
4. **Have two users send messages**

**Expected**: Each user gets their own session ✓

This proves session isolation works **without OAuth**.

### Test 2: OAuth Without dmScope

1. **Configure OAuth properly**
2. **Leave `dmScope` unset** (defaults to "main")
3. **Restart gateway**
4. **Have two users send messages**

**Expected**: Sessions are still contaminated ❌

This proves OAuth **does not provide session isolation**.

## Best Practices

1. **Always set dmScope first** - Session isolation is mandatory
2. **OAuth is optional** - Only configure if you need chat type detection
3. **Don't conflate the two** - They serve different purposes
4. **Document separately** - Make it clear they're independent
5. **Test independently** - Verify session isolation works without OAuth

## Summary Table

| Feature | Purpose | Required? | Config Location | Affects Sessions? |
|---------|---------|-----------|-----------------|-------------------|
| `session.dmScope` | Isolate sessions per user | **Yes** | Top-level in openclaw.json | **Yes** |
| OAuth | Detect chat type metadata | No | Plugin config | No |
| Webhook signatures | Validate user identity | Yes (automatic) | N/A (Basecamp handles) | Yes (provides identity) |

## See Also

- [Session Configuration Guide](session-configuration.md) - How to configure dmScope
- [Basecamp Setup](basecamp-setup.md) - How to configure OAuth (optional)
- [How It Works](how-it-works.md) - Architecture overview
