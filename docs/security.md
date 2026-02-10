# Security

## Webhook Security

Since Basecamp does not provide webhook signature verification (unlike GitHub, Stripe, etc.), this plugin implements multiple security layers:

### 1. Callback URL Domain Validation
- Only accepts webhooks with `callback_url` from `*.basecamp.com` domains
- Rejects spoofed requests with malicious callback URLs
- Returns `403 Forbidden` for invalid domains

### 2. Rate Limiting
- **Limit:** 20 requests per minute per session (per user per chat)
- **Window:** 60-second sliding window
- **Response:** `429 Too Many Requests` with `Retry-After: 60` header
- **Cleanup:** Automatic memory cleanup every 5 minutes

### 3. HTTPS Requirement
- Basecamp requires all webhook URLs to use HTTPS
- Ensures encrypted communication

### 4. URL Secrecy
- The webhook URL itself acts as an authentication token
- Use a long, random path (e.g., `/webhook/basecamp/ai-ops-a8f3b9e2`)
- Keep webhook URLs secret and rotate if compromised

### 5. Command Authorization
- All slash commands are automatically authorized via `CommandAuthorized: true`
- Basecamp webhooks are inherently authenticated — the `creator` field is verified by Basecamp itself

## Best Practices

1. **Use a reverse proxy** (nginx, caddy) with additional rate limiting
2. **Monitor logs** for suspicious activity patterns
3. **Rotate webhook URLs** periodically or after suspected compromise
4. **Use environment variables** for webhook paths in production
5. **Implement IP allowlisting** if Basecamp publishes webhook IP ranges
