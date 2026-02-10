# Troubleshooting

## Plugin not loading

**Error:** `plugin manifest not found: openclaw.plugin.json`

**Solution:**
1. Verify `openclaw.plugin.json` exists in plugin root
2. Check `plugins.load.paths` uses absolute path
3. Restart OpenClaw gateway: `openclaw gateway restart`

## Channel not recognized

**Error:** `unknown channel id: basecamp`

**Solution:**
1. Verify `plugins.entries.basecamp` exists in config
2. Check plugin is enabled: `openclaw plugins list`
3. Verify `openclaw.channel` metadata in package.json

## Webhook not receiving messages

**Checklist:**
1. Webhook URL is publicly accessible
2. URL matches `webhookPath` in config (e.g., `/basecamp/webhook`)
3. Firewall allows incoming HTTP/HTTPS
4. SSL certificate valid (if using HTTPS)
5. Basecamp integration created with correct `command_url`

**Test webhook manually:**
```bash
curl -X POST http://localhost:3000/basecamp/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "command": "hello",
    "callback_url": "https://3.basecamp.com/test/callback"
  }'
```

## Bot not responding in Basecamp

**Common causes:**
1. Bot name mismatch (config: `handy`, Basecamp trigger: `!other-name`)
2. Session creation failed (check OpenClaw logs)
3. Callback URL unreachable (Basecamp must reach your server)

**Debug:**
1. Check OpenClaw logs: `openclaw gateway logs`
2. Verify plugin loaded: `openclaw plugins info basecamp`
3. Test send manually using the callback URL
