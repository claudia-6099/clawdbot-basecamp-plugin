# Basecamp Chatbot Plugin for Clawdbot - Development Brief

## Project Overview

Create a Clawdbot external channel plugin that integrates Basecamp 3 chatbots as a native messaging channel.

**Repository:** https://github.com/claudia-6099/clawdbot-basecamp-plugin

## Architecture Reference

**Primary reference:** `/Users/clawd/.nvm/versions/node/v24.13.0/lib/node_modules/clawdbot/extensions/bluebubbles/`

This is a complete example of a Clawdbot external channel plugin with:
- Channel implementation
- Webhook handling
- Session management
- Runtime bridge integration

**Documentation:**
- Basecamp API: https://github.com/basecamp/bc3-api/blob/master/sections/chatbots.md
- Clawdbot plugin docs: `/Users/clawd/.nvm/versions/node/v24.13.0/lib/node_modules/clawdbot/docs/plugin.md`

## Project Structure

```
clawdbot-basecamp-plugin/
├── package.json
├── clawdbot.plugin.json          # Plugin metadata
├── index.ts                       # Entry point
├── README.md
├── src/
│   ├── channel.ts                 # Channel implementation
│   ├── webhook.ts                 # Webhook handler
│   ├── send.ts                    # Send messages to Basecamp
│   ├── types.ts                   # TypeScript types
│   ├── config-schema.ts           # Config validation
│   └── runtime.ts                 # Runtime bridge
└── tsconfig.json
```

## Key Requirements

### 1. Configuration (Minimal)

```typescript
{
  channels: {
    basecamp: {
      enabled: true,
      botName: "claudia",              // Bot name for Basecamp
      webhookPath: "/basecamp/webhook", // Webhook endpoint
      port: 3000                        // Configurable port
    }
  }
}
```

**Important:** Do NOT require accountId, bucketId, chatId, or linesUrl in config. The `callback_url` from webhooks is used as the session identifier and response target.

### 2. Webhook Flow (Inbound)

When a user mentions the bot in Basecamp or sends a direct ping:

1. Basecamp POSTs to webhook endpoint with:
```json
{
  "command": "user's message text",
  "creator": {
    "id": 1007299143,
    "name": "Victor Cooper",
    "email_address": "victor@example.com",
    ...
  },
  "callback_url": "https://3.basecamp.com/.../lines"
}
```

2. Plugin:
   - Validates webhook (optional: shared secret)
   - Extracts message text from `command`
   - Uses `callback_url` as session identifier (unique per chat/campfire)
   - Routes to Clawdbot core via `api.runtime`

3. Clawdbot processes message and generates response

### 3. Response Flow (Outbound)

**Mode:** Deferred responses only (POST to callback_url after processing)

1. Plugin receives response from Clawdbot
2. Formats as HTML (Basecamp rich text format)
3. POSTs to the `callback_url` from the original webhook:

```json
{
  "content": "<p>Response text with <strong>formatting</strong></p>"
}
```

**Supported HTML tags:**
- Standard rich text: `p`, `strong`, `em`, `a`, `ul`, `ol`, `li`, `br`, etc.
- Chatbot-specific: `table`, `tr`, `td`, `th`, `thead`, `tbody`, `details`, `summary`

**Important:** Use `details`/`summary` for collapsible content (great for long responses).

### 4. Session Management

- **Session key:** `callback_url` (unique per chat/campfire)
- Multiple users in the same chat = same session
- Different chats/campfires = different sessions
- Direct pings = unique session per user

### 5. Features to Implement

**Must have:**
- ✅ Receive webhooks from Basecamp
- ✅ Parse message and creator info
- ✅ Route to Clawdbot core
- ✅ Format responses as HTML
- ✅ POST responses to callback_url
- ✅ Session management via callback_url
- ✅ Config validation

**Not needed:**
- ❌ OAuth (Basecamp chatbots don't use it)
- ❌ Reactions (not supported by Basecamp)
- ❌ Read receipts
- ❌ Typing indicators
- ❌ Attachments (initially - can add later)

## Technical Details

### Plugin Manifest (clawdbot.plugin.json)

```json
{
  "id": "basecamp",
  "channels": ["basecamp"],
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {}
  }
}
```

### Entry Point (index.ts)

Must export:
```typescript
export default async function registerBasecampPlugin(api: PluginAPI) {
  // Register webhook handler
  // Register channel implementation
  // Set up runtime bridge
}
```

### Webhook Registration

Use `api.registerHttpHandler` to register the webhook endpoint:
```typescript
api.registerHttpHandler({
  path: config.webhookPath || '/basecamp/webhook',
  method: 'POST',
  handler: async (req, res) => {
    // Parse Basecamp webhook
    // Route to Clawdbot
    // Return 200 OK
  }
});
```

### Channel Implementation

Implement the channel interface:
```typescript
export const basecampChannel: Channel = {
  id: 'basecamp',
  name: 'Basecamp',
  send: async (target, message, options) => {
    // POST to callback_url
  },
  // Other channel methods as needed
};
```

### Dependencies

```json
{
  "dependencies": {
    "@clawdbot/plugin-sdk": "latest",
    "node-fetch": "^2.6.7"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

## Development Steps

1. **Setup**
   - Initialize package.json
   - Create tsconfig.json
   - Set up basic project structure

2. **Core Implementation**
   - Implement webhook handler (webhook.ts)
   - Implement channel (channel.ts)
   - Implement send logic (send.ts)
   - Define types (types.ts)

3. **Integration**
   - Wire up entry point (index.ts)
   - Configure runtime bridge (runtime.ts)
   - Add config schema validation

4. **Testing**
   - Manual testing with Basecamp
   - Verify session management
   - Test HTML formatting

5. **Documentation**
   - Write README.md
   - Document configuration
   - Add usage examples

## Basecamp API Notes

**Creating a chatbot in Basecamp (manual step - user will do this):**

```bash
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"service_name":"claudia","command_url":"https://your-ec2-instance.com/basecamp/webhook"}' \
  https://3.basecampapi.com/$ACCOUNT_ID/buckets/$BUCKET_ID/chats/$CHAT_ID/integrations.json
```

This returns a `lines_url` - but we don't need it because we use `callback_url` from webhooks.

**Webhook payload example:**
```json
{
  "command": "What up?",
  "creator": {
    "id": 1007299143,
    "name": "Victor Cooper",
    "email_address": "victor@honchodesign.com",
    "title": "Chief Strategist"
  },
  "callback_url": "https://3.basecamp.com/195539477/integrations/ABC123/buckets/2085958501/chats/9007199254741775/lines"
}
```

**Response format:**
- Simple: `{"content": "<p>Hello from Claudia!</p>"}`
- With table: See examples in Basecamp API docs
- With collapsible: `<details><summary>Title</summary>Content</details>`

## Important Notes

1. **No authentication needed** - Basecamp doesn't require OAuth for chatbots
2. **Stateless webhook handling** - Each webhook is independent
3. **Session = callback_url** - Don't try to maintain persistent connections
4. **HTML formatting** - Convert markdown to HTML for Basecamp
5. **Error handling** - Always return 200 OK to Basecamp (log errors internally)
6. **Hardcoded values OK** - This is for a single Basecamp instance

## Success Criteria

✅ Plugin loads successfully in Clawdbot
✅ Webhook receives Basecamp messages
✅ Messages route to Clawdbot and get responses
✅ Responses post back to Basecamp correctly
✅ HTML formatting works (tables, details/summary)
✅ Different chats/campfires maintain separate sessions
✅ Configuration is minimal and clear

## References to Study

1. BlueBubbles plugin structure: `/Users/clawd/.nvm/versions/node/v24.13.0/lib/node_modules/clawdbot/extensions/bluebubbles/`
2. Basecamp chatbot API: https://github.com/basecamp/bc3-api/blob/master/sections/chatbots.md
3. Clawdbot plugin docs: `/Users/clawd/.nvm/versions/node/v24.13.0/lib/node_modules/clawdbot/docs/plugin.md`

## Development Environment

- **Working directory:** `/Users/clawd/clawd/clawdbot-basecamp-plugin`
- **Node version:** v24.13.0 or later
- **TypeScript:** Use modern features
- **Testing:** Local Clawdbot instance

Good luck! 🚀
