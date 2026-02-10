# How It Works

## Message Flow

1. **Basecamp → OpenClaw**
   - User mentions `!handy` in Basecamp chat
   - Basecamp sends webhook to `https://your-server.com/basecamp/webhook`
   - Plugin receives webhook, validates callback URL domain, and applies rate limiting

2. **OpenClaw Processing**
   - Creates/resumes session for user (keyed by `callback_url + creator_id`)
   - Detects chat type (group campfire vs direct ping) via Basecamp API if OAuth is configured
   - Routes message to AI agent with full user context
   - If 3 seconds pass without a response, sends a "Thinking..." thinking indicator

3. **OpenClaw → Basecamp**
   - Each response block is delivered to Basecamp as it completes (streaming)
   - Message appears in Basecamp chat with HTML formatting preserved
   - Slash commands (`/new`, `/help`, etc.) are fully supported

## Session Management

- **Key:** `callback_url:user:creator_id` (unique per person per chat)
- **Isolation:** Each user maintains fully independent conversation context, even in group campfires
- **Lifecycle:** Auto-created on first message, cleaned up after 24h inactivity
- **Cleanup:** Automatic every 6 hours
- **Concurrent users:** Multiple users can interact with the bot simultaneously without interference

## Slash Commands

All OpenClaw slash commands work in Basecamp (e.g., `/new`, `/help`, `/status`). Commands are authorized automatically — Basecamp webhooks are inherently authenticated since the `creator` field is verified by Basecamp.

## Thinking Indicator

When a user sends a non-command message, the plugin waits 3 seconds. If the agent hasn't produced any response blocks yet, it sends an italic "Thinking..." message to Basecamp so the user knows the bot is working. The indicator is automatically cancelled if a response arrives within 3 seconds.

## Block Streaming

Instead of waiting for the entire agent response to complete, the plugin delivers each response block to Basecamp as soon as it's ready. This means users see responses appearing progressively rather than waiting for a potentially long generation to finish.

## Chat Type Detection

When OAuth is configured, the plugin automatically detects whether each conversation is a **group campfire** or a **direct ping**:

- **Group** (`ChatType: "group"`): Messages from project campfires. The chat name is included as `ChatName`.
- **Direct** (`ChatType: "direct"`): Messages from Basecamp pings (1-on-1 conversations).

Detection results are cached to disk (`~/.openclaw/cache/basecamp-chat-types.json`) with a configurable TTL (default 7 days).

**Without OAuth:** All chats default to `"direct"` type. This is the standard behavior and works fine for most use cases.

## Progress Reporting Tool

The plugin provides custom tools that scripts and sub-agents can use to report progress during long-running operations.

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

#### `send_to_basecamp`
Alias for `report_progress` — same functionality, alternative name.

### How Progress Reporting Works

1. **Context Storage:** When a webhook is received, the `callback_url` is stored in the session context as `BasecampCallbackUrl`
2. **Tool Context:** The `threading.buildToolContext` provides this URL to tools via `toolContext.basecampCallbackUrl`
3. **Action Handler:** The action handler uses the callback URL to send messages back to Basecamp
