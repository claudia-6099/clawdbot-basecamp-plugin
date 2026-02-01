import type { IncomingMessage, ServerResponse } from 'node:http';
import type { BasecampConfig } from './types.js';
import { sendToBasecamp } from './send.js';

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
  runtime: any;
  cfg: any;
  abortSignal?: AbortSignal;
}

/**
 * Monitor Basecamp webhooks
 * Registers HTTP handler and processes incoming webhook requests
 */
export async function monitorBasecampProvider(params: MonitorParams): Promise<() => void> {
  const { config, log, accountId, runtime, cfg, abortSignal } = params;

  log.info(`[${accountId}] Starting Basecamp webhook monitor`);

  // Import OpenClaw functions
  // @ts-ignore
  const { registerPluginHttpRoute } = require('/home/ec2-user/.npm-global/lib/node_modules/openclaw/dist/plugins/http-registry.js');

  // @ts-ignore
  const { normalizePluginHttpPath } = require('/home/ec2-user/.npm-global/lib/node_modules/openclaw/dist/plugins/http-path.js');

  // @ts-ignore
  const { dispatchReplyWithBufferedBlockDispatcher } = require('/home/ec2-user/.npm-global/lib/node_modules/openclaw/dist/auto-reply/reply/provider-dispatcher.js');

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
        // Read request body
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(chunk);
        }
        const body = Buffer.concat(chunks).toString('utf8');
        const payload = JSON.parse(body);

        // Debug: Log the full payload to see structure
        log.info(`[${accountId}] Webhook payload: ${JSON.stringify(payload, null, 2)}`);

        // Validate payload
        if (!payload.command || !payload.callback_url || !payload.creator) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Invalid webhook payload' }));
          return;
        }

        log.info(`[${accountId}] Received message from ${payload.creator.name}: command="${payload.command}"`);

        // Respond with 204 No Content since we'll send response via callback_url
        // (Basecamp displays any immediate response in chat, so we return nothing)
        res.statusCode = 204;
        res.end();

        // Build context payload for OpenClaw
        // OpenClaw expects Body/RawBody/CommandBody (not Text)
        // Create unique session per person by combining callback_url + creator.id
        const sessionId = `${payload.callback_url}:user:${payload.creator.id}`;
        const ctxPayload = {
          From: sessionId, // Unique session per person
          UserName: payload.creator.name,
          UserEmail: payload.creator.email_address,
          UserId: payload.creator.id.toString(),
          Body: payload.command,
          RawBody: payload.command,
          CommandBody: payload.command,
          Channel: 'basecamp',
          AccountId: accountId,
        };

        log.info(`[${accountId}] Dispatching to agent with Body="${ctxPayload.Body}"`);

        // Dispatch to agent system and stream responses back
        await dispatchReplyWithBufferedBlockDispatcher({
          ctx: ctxPayload,
          cfg,
          dispatcherOptions: {
            deliver: async (deliveryPayload: any) => {
              if (deliveryPayload.text) {
                log.info(`[${accountId}] Delivering response to ${payload.callback_url}`);
                try {
                  await sendToBasecamp(payload.callback_url, deliveryPayload.text);
                  log.info(`[${accountId}] Response delivered successfully`);
                } catch (err) {
                  log.error(`[${accountId}] Failed to deliver response`, { error: err });
                  throw err;
                }
              }
            },
            onError: (err: any, info: any) => {
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

  // Handle abort signal
  const cleanup = () => {
    log.info(`[${accountId}] Stopping Basecamp webhook monitor`);
    unregisterHttp();
  };

  if (abortSignal) {
    abortSignal.addEventListener('abort', cleanup);
  }

  return cleanup;
}
