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
    outbound: {
      deliveryMode: 'direct' as const,
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
      buildToolContext: ({ context }: { context: any }) => ({
        basecampCallbackUrl: context.BasecampCallbackUrl,
        basecampTarget: context.To,
      }),
    },
    actions: {
      listActions: () => {
        // Only enable actions if the plugin is configured
        if (!config.enabled) return [];
        return ['report_progress', 'send_to_basecamp'];
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      handleAction: async ({ action, params, toolContext }: any) => {
        if (action === 'report_progress' || action === 'send_to_basecamp') {
          // Get message parameter
          const message = params.message || params.text || params.content;
          if (!message || typeof message !== 'string') {
            return {
              ok: false,
              error: 'Missing required parameter: message (string)',
            };
          }

          // Get target from params or tool context
          const target = params.target || toolContext?.basecampCallbackUrl || toolContext?.basecampTarget;
          if (!target) {
            return {
              ok: false,
              error: 'No Basecamp callback URL available. This tool can only be used within an active Basecamp conversation.',
            };
          }

          try {
            await sendToBasecamp(target, message);
            log.info(`[${action}] Progress update sent to Basecamp`);
            return {
              ok: true,
              message: 'Progress update delivered to Basecamp',
            };
          } catch (error) {
            log.error(`[${action}] Failed to send progress update`, { error });
            return {
              ok: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        }

        return {
          ok: false,
          error: `Unknown action: ${action}`,
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
