import { sendToBasecamp } from './send.js';

/**
 * Basecamp Channel Plugin implementation
 * Implements the OpenClaw Channel interface for Basecamp integration
 */
export const basecampChannel = {
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
    chatTypes: ['direct'],
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
    listAccountIds: (cfg: any) => {
      const basecampConfig = cfg.channels?.basecamp;
      return basecampConfig?.enabled ? ['default'] : [];
    },
    resolveAccount: (cfg: any, accountId?: string) => {
      const basecampConfig = cfg.channels?.basecamp;
      return {
        accountId: accountId ?? 'default',
        enabled: basecampConfig?.enabled ?? false,
        botName: basecampConfig?.botName ?? 'claudia',
        webhookPath: basecampConfig?.webhookPath ?? '/basecamp/webhook',
        port: basecampConfig?.port ?? 3000,
      };
    },
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
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    },
  },
};
