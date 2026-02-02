import { sendToBasecamp } from './send.js';
import { monitorBasecampProvider } from './monitor.js';
import type { BasecampConfig } from './types.js';

interface Logger {
  info: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
}

/**
 * Factory that creates the Basecamp Channel Plugin implementation.
 * Implements the OpenClaw Channel interface for Basecamp integration.
 */
export function createBasecampChannel(config: BasecampConfig, log: Logger) {
  return {
    id: 'basecamp',
    meta: {
      id: 'basecamp',
      label: 'Basecamp',
      selectionLabel: 'Basecamp 3 Chatbots',
      docsPath: '/channels/basecamp',
      docsLabel: 'basecamp',
      blurb: 'Integrate with Basecamp 3 chatbots via webhooks.',
      aliases: ['bc', 'basecamp3'],
    },
    capabilities: {
      chatTypes: ['direct'] as const,
      media: {
        images: false,
        videos: false,
        audio: false,
        files: false,
      },
      formatting: {
        markdown: true,
        html: true,
      },
      features: {
        reactions: false,
        threads: false,
        editing: false,
        deletion: false,
      },
    },
    config: {
      listAccountIds: () => {
        return config.enabled ? ['default'] : [];
      },
      resolveAccount: (_cfg: unknown, accountId?: string) => ({
        accountId: accountId ?? 'default',
        enabled: config.enabled,
        botName: config.botName,
        webhookPath: config.webhookPath,
        port: config.port,
        config: config,
      }),
      isConfigured: () => config.enabled && Boolean(config.webhookPath),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      describeAccount: (account: any) => ({
        accountId: account.accountId || 'default',
        name: account.botName || config.botName,
        enabled: config.enabled,
        configured: true,
        webhookPath: config.webhookPath,
      }),
    },
    messaging: {
      // Tell OpenClaw how to recognize valid Basecamp targets
      targetResolver: {
        hint: '<basecamp-callback-url>',
        // Recognize Basecamp callback URLs as valid target IDs
        looksLikeId: (raw: string) => {
          const trimmed = raw.trim();
          if (!trimmed) return false;
          try {
            const url = new URL(trimmed);
            return url.hostname.endsWith('.basecamp.com') || url.hostname === 'basecamp.com';
          } catch {
            return false;
          }
        },
      },
    },
    outbound: {
      deliveryMode: 'direct' as const,
      // Resolve/validate targets - accept any valid Basecamp callback URL
      resolveTarget: ({ to }: { to?: string }) => {
        const trimmed = to?.trim();
        if (!trimmed) {
          return {
            ok: false,
            error: new Error('Basecamp target (callback URL) is required'),
          };
        }
        // Validate it's a Basecamp URL
        try {
          const url = new URL(trimmed);
          if (!url.hostname.endsWith('.basecamp.com') && url.hostname !== 'basecamp.com') {
            return {
              ok: false,
              error: new Error(`Invalid Basecamp callback URL domain: ${url.hostname}`),
            };
          }
        } catch {
          return {
            ok: false,
            error: new Error(`Invalid URL format: ${trimmed}`),
          };
        }
        // Valid Basecamp callback URL
        return { ok: true, to: trimmed };
      },
      sendText: async ({ text, target }: { text: string; target: string }) => {
        try {
          await sendToBasecamp(target, text);
          return { ok: true };
        } catch (error) {
          return {
            ok: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      },
    },
    threading: {
      // Provide Basecamp-specific context to tools
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      buildToolContext: ({ context, hasRepliedRef }: { context: any; hasRepliedRef?: { value: boolean } }) => ({
        // Standard OpenClaw fields
        currentChannelId: context.To?.trim() || undefined, // callback_url is the target
        currentChannelProvider: 'basecamp' as const,
        hasRepliedRef,
        // Basecamp-specific fields
        basecampCallbackUrl: context.To, // To = callback_url
        basecampTarget: context.To,
      }),
    },
    actions: {
      listActions: () => {
        // Only enable actions if the plugin is configured
        // Use 'send' as it's a standard action that accepts targets
        // Also expose report_progress for semantic clarity
        if (!config.enabled) return [];
        return ['send', 'report_progress', 'send_to_basecamp'];
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      handleAction: async ({ action, params, toolContext }: any) => {
        // Debug logging
        log.info(`[handleAction] action=${action}, params=${JSON.stringify(params)}, toolContext=${JSON.stringify(toolContext)}`);

        if (action === 'send' || action === 'report_progress' || action === 'send_to_basecamp') {
          // Get message parameter
          const message = params.message || params.text || params.content;
          if (!message || typeof message !== 'string') {
            const result = { ok: false, error: 'Missing required parameter: message (string)' };
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
              details: result,
            };
          }

          // Get target from params or tool context
          // Check multiple fields: explicit param (to/target), Basecamp-specific, or standard OpenClaw field
          // For 'send' action, OpenClaw converts target -> to
          const target = params.to ||
            params.target ||
            toolContext?.basecampCallbackUrl ||
            toolContext?.basecampTarget ||
            toolContext?.currentChannelId;
          if (!target) {
            const result = { ok: false, error: 'No Basecamp callback URL available. This tool can only be used within an active Basecamp conversation. Ensure Provider is set to "basecamp" in the session context.' };
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
              details: result,
            };
          }

          try {
            await sendToBasecamp(target, message);
            log.info(`[${action}] Progress update sent to Basecamp`);
            // Return in AgentToolResult format with content array
            const result = { ok: true, message: 'Progress update delivered to Basecamp' };
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
              details: result,
            };
          } catch (error) {
            log.error(`[${action}] Failed to send progress update`, { error });
            const result = { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
              details: result,
            };
          }
        }

        const result = { ok: false, error: `Unknown action: ${action}` };
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          details: result,
        };
      },
    },
    gateway: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      startAccount: async (ctx: any) => {
        const accountId = ctx.accountId ?? 'default';
        log.info(`Starting Basecamp channel for account: ${accountId}`);

        // Start monitoring webhooks
        const cleanup = await monitorBasecampProvider({
          config,
          log,
          accountId,
          cfg: ctx.cfg,
          abortSignal: ctx.abortSignal,
        });

        return cleanup;
      },
    },
  };
}
