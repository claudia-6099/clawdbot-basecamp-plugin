import type { IncomingMessage, ServerResponse } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import type { BasecampConfig } from './types.js';
import { sendToBasecamp } from './send.js';
import { getChatType } from './chat-detection.js';

interface Logger {
  info: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
}

interface MonitorParams {
  config: BasecampConfig;
  log: Logger;
  accountId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cfg: any; // OpenClaw config object - type not exported by SDK
  abortSignal?: AbortSignal;
  runtime: any; // PluginRuntime - use any to avoid import issues
}

// Rate limiting store
interface RateLimitEntry {
  requests: number[];
  lastCleanup: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20; // 20 requests per minute per session

/**
 * Check if request should be rate limited
 */
function isRateLimited(sessionId: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(sessionId);

  if (!entry) {
    // First request from this session
    rateLimitStore.set(sessionId, {
      requests: [now],
      lastCleanup: now,
    });
    return false;
  }

  // Clean up old requests outside the window
  entry.requests = entry.requests.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW_MS);
  entry.lastCleanup = now;

  // Check if rate limit exceeded
  if (entry.requests.length >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  // Add current request
  entry.requests.push(now);
  rateLimitStore.set(sessionId, entry);

  return false;
}

/**
 * Validate that callback_url is from Basecamp
 */
function isValidBasecampCallback(callbackUrl: string): boolean {
  try {
    const url = new URL(callbackUrl);
    // Check for *.basecamp.com domains
    return url.hostname.endsWith('.basecamp.com') || url.hostname === 'basecamp.com';
  } catch {
    return false;
  }
}

/**
 * Dynamically load OpenClaw plugin SDK with robust path resolution.
 * Supports env override, package exports, and common global npm locations.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loadOpenClawPluginSdk(): any {
  // Allow explicit override via environment variable
  const envPath = process.env.OPENCLAW_PLUGIN_SDK;
  if (envPath) {
    try { return require(envPath); } catch { /* ignore */ }
  }

  // Try package export paths first (preferred in OpenClaw >= 2026.2.2)
  try { return require('openclaw/plugin-sdk'); } catch { /* ignore */ }
  try { return require('openclaw/dist/plugin-sdk/index.js'); } catch { /* ignore */ }

  // Fallback to common global npm locations
  const roots = [
    process.env.npm_config_prefix ? path.join(process.env.npm_config_prefix, 'lib', 'node_modules') : '',
    path.join(os.homedir(), '.npm-global', 'lib', 'node_modules'),
    '/usr/local/lib/node_modules',
    '/usr/lib/node_modules',
  ].filter(Boolean);

  for (const root of roots) {
    const candidate = path.join(root, 'openclaw', 'dist', 'plugin-sdk', 'index.js');
    try { return require(candidate); } catch { /* try next */ }
  }

  throw new Error('OpenClaw plugin SDK not found. Set OPENCLAW_PLUGIN_SDK env or install openclaw globally.');
}

/**
 * Monitor Basecamp webhooks
 * Registers HTTP handler and processes incoming webhook requests
 */
export async function monitorBasecampProvider(params: MonitorParams): Promise<() => void> {
  const { config, log, accountId, cfg, abortSignal, runtime } = params;

  log.info(`[${accountId}] Starting Basecamp webhook monitor`);

  // Load OpenClaw SDK functions dynamically (avoids hardcoded paths)
  const sdk = loadOpenClawPluginSdk();
  const { registerPluginHttpRoute, normalizePluginHttpPath } = sdk;
  // Use runtime for dispatch function (not exported from SDK directly)
  const dispatchReplyWithBufferedBlockDispatcher = runtime.channel.reply.dispatchReplyWithBufferedBlockDispatcher;

  const normalizedPath = normalizePluginHttpPath(config.webhookPath, '/basecamp/webhook') ?? '/basecamp/webhook';

  const unregisterHttp = registerPluginHttpRoute({
    path: normalizedPath,
    pluginId: 'basecamp',
    accountId,
    log: (msg: string) => log.info(msg),
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      // Handle GET requests for webhook verification
      if (req.method === 'GET') {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain');
        res.end('OK');
        return;
      }

      // Only accept POST requests
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.setHeader('Allow', 'GET, POST');
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Method Not Allowed' }));
        return;
      }

      try {
        // Debug: Log headers to check for security tokens
        log.info(`[${accountId}] Webhook headers: ${JSON.stringify(req.headers, null, 2)}`);

        // Read request body
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(chunk);
        }
        const body = Buffer.concat(chunks).toString('utf8');
        const payload = JSON.parse(body);

        // Debug: Log the full payload to see structure
        log.info(`[${accountId}] Webhook payload: ${JSON.stringify(payload, null, 2)}`);

        // Validate payload structure
        if (!payload.command || !payload.callback_url || !payload.creator) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Invalid webhook payload' }));
          return;
        }

        // Security: Verify callback_url is from Basecamp
        if (!isValidBasecampCallback(payload.callback_url)) {
          log.warn(`[${accountId}] Rejected webhook with invalid callback_url: ${payload.callback_url}`);
          res.statusCode = 403;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Invalid callback URL domain' }));
          return;
        }

        // Build session ID for rate limiting and context
        const sessionId = `${payload.callback_url}:user:${payload.creator.id}`;

        // Security: Rate limiting per session
        if (isRateLimited(sessionId)) {
          log.warn(`[${accountId}] Rate limit exceeded for session: ${payload.creator.name} (${payload.creator.id})`);
          res.statusCode = 429;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Retry-After', '60');
          res.end(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }));
          return;
        }

        log.info(`[${accountId}] Received message from ${payload.creator.name}: command="${payload.command}"`);

        // Respond with 204 No Content since we'll send response via callback_url
        // (Basecamp displays any immediate response in chat, so we return nothing)
        res.statusCode = 204;
        res.end();

        // Detect chat type (group campfire vs direct ping) via Basecamp API
        const chatTypeResult = await getChatType(payload.callback_url, config, log);
        log.info(`[${accountId}] Chat type: ${chatTypeResult.chatType}${chatTypeResult.chatName ? ` (${chatTypeResult.chatName})` : ''}`);

        // Build context payload for OpenClaw
        // OpenClaw expects Body/RawBody/CommandBody (not Text)
        // Create unique session per person by combining callback_url + creator.id
        // Inject user info at the start of the message so the agent knows who's writing
        const userPrefix = `[${payload.creator.name} | ${payload.creator.email_address}]: `;
        const bodyWithUser = userPrefix + payload.command;

        const ctxPayload: Record<string, unknown> = {
          From: sessionId, // Unique session per person
          SenderName: payload.creator.name, // OpenClaw uses this for "You are talking to X"
          SenderId: payload.creator.id.toString(),
          SenderUsername: payload.creator.email_address,
          UserName: payload.creator.name, // Keep for backward compatibility
          UserEmail: payload.creator.email_address,
          UserId: payload.creator.id.toString(),
          Body: bodyWithUser,
          RawBody: payload.command,
          CommandBody: payload.command,
          Channel: 'basecamp',
          Provider: 'basecamp', // Required for OpenClaw to find channel dock and buildToolContext
          Surface: 'basecamp', // Alternative lookup field
          AccountId: accountId,
          // Basecamp webhooks are inherently authenticated (creator is verified by Basecamp)
          CommandAuthorized: true,
          // Chat type detection (direct ping vs group campfire; defaults to direct)
          ChatType: chatTypeResult.chatType !== 'unknown' ? chatTypeResult.chatType : 'direct',
          // Custom Basecamp fields for tools/scripts to access
          BasecampCallbackUrl: payload.callback_url, // For progress reporting
          To: payload.callback_url, // Standard target field
        };
        if (chatTypeResult.chatName) {
          ctxPayload.ChatName = chatTypeResult.chatName;
        }

        log.info(`[${accountId}] Dispatching to agent with Body="${ctxPayload.Body}"`);

        // Schedule a "thinking" indicator after 3s — cancelled if a block arrives first
        const isCommand = payload.command.trimStart().startsWith('/');
        let thinkingTimer: ReturnType<typeof setTimeout> | undefined;
        if (!isCommand) {
          thinkingTimer = setTimeout(() => {
            thinkingTimer = undefined;
            sendToBasecamp(payload.callback_url, '<em>\uD83E\uDDE0 Thinking...</em>').catch((err) => {
              log.warn(`[${accountId}] Failed to send thinking indicator`, { error: err });
            });
          }, 3000);
        }

        // Handle plugin-specific commands before dispatching to agent
        const pluginCommands = ['/basecamp-auth', '/basecamp-token', '/basecamp-status'];
        const commandMatch = pluginCommands.find(cmd =>
          payload.command.trimStart().toLowerCase().startsWith(cmd)
        );

        if (commandMatch) {
          log.info(`[${accountId}] Handling plugin command: ${commandMatch}`);

          // Import the channel action handler
          const { createBasecampChannel } = await import('./channel.js');
          const channel = createBasecampChannel(config, log, runtime);

          // Determine action name and parameters
          let action: string;
          const params: Record<string, unknown> = {};

          if (commandMatch === '/basecamp-auth') {
            action = 'basecamp-auth';
          } else if (commandMatch === '/basecamp-token') {
            action = 'basecamp-token';
            // Extract the token/code from the command
            const parts = payload.command.trim().split(/\s+/);
            if (parts.length > 1) {
              params.code = parts.slice(1).join(' ');
            }
          } else if (commandMatch === '/basecamp-status') {
            action = 'basecamp-status';
          } else {
            action = '';
          }

          // Build tool context
          const toolContext = {
            currentChannelId: payload.callback_url,
            currentChannelProvider: 'basecamp' as const,
            basecampCallbackUrl: payload.callback_url,
            basecampTarget: payload.callback_url,
          };

          try {
            // Call the action handler
            const result = await channel.actions.handleAction({ action, params, toolContext });

            // Extract the response text
            let responseText = '';
            if (result.content && Array.isArray(result.content)) {
              for (const item of result.content) {
                if (item.type === 'text' && item.text) {
                  responseText += item.text + '\n';
                }
              }
            }

            // Send the response back to Basecamp
            if (responseText.trim()) {
              await sendToBasecamp(payload.callback_url, responseText.trim());
              log.info(`[${accountId}] Plugin command response sent`);
            }
          } catch (error) {
            log.error(`[${accountId}] Plugin command failed`, { error });
            await sendToBasecamp(
              payload.callback_url,
              `Error executing ${commandMatch}: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
          }

          // Don't dispatch to agent - command was handled
          return;
        }

        // Dispatch to agent system — deliver each complete block as it arrives
        await dispatchReplyWithBufferedBlockDispatcher({
          ctx: ctxPayload,
          cfg,
          dispatcherOptions: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            deliver: async (deliveryPayload: any) => {
              // First block arrived — cancel thinking indicator if it hasn't fired
              if (thinkingTimer) {
                clearTimeout(thinkingTimer);
                thinkingTimer = undefined;
              }
              if (deliveryPayload.text) {
                log.info(`[${accountId}] Delivering block to ${payload.callback_url}`);
                try {
                  await sendToBasecamp(payload.callback_url, deliveryPayload.text);
                  log.info(`[${accountId}] Block delivered successfully`);
                } catch (err) {
                  log.error(`[${accountId}] Failed to deliver block`, { error: err });
                  throw err;
                }
              }
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onError: (err: any, info: any) => {
              if (thinkingTimer) {
                clearTimeout(thinkingTimer);
                thinkingTimer = undefined;
              }
              log.error(`[${accountId}] ${info.kind} reply failed`, { error: err });
            },
          },
          replyOptions: {},
        });

      } catch (error) {
        log.error(`[${accountId}] Webhook error`, { error });
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      }
    },
  });

  log.info(`[${accountId}] Basecamp webhook handler registered at ${normalizedPath}`);

  // Periodic cleanup of rate limit store (every 5 minutes)
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    for (const [sessionId, entry] of rateLimitStore.entries()) {
      // Remove entries with no recent requests
      if (now - entry.lastCleanup > 5 * 60 * 1000) {
        rateLimitStore.delete(sessionId);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      log.debug(`[${accountId}] Cleaned up ${cleaned} expired rate limit entries`);
    }
  }, 5 * 60 * 1000);

  // Handle abort signal
  const cleanup = () => {
    log.info(`[${accountId}] Stopping Basecamp webhook monitor`);
    clearInterval(cleanupInterval);
    unregisterHttp();
  };

  if (abortSignal) {
    abortSignal.addEventListener('abort', cleanup);
  }

  return cleanup;
}
