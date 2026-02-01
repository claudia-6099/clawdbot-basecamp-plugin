import type { OpenClawPluginApi } from 'openclaw/plugin-sdk';
import { createBasecampChannel } from './src/channel.js';
import { cleanupOldSessions } from './src/webhook.js';
import { validateConfig } from './src/config-schema.js';
import type { BasecampConfig } from './src/types.js';

/**
 * Basecamp Chatbot Plugin for OpenClaw
 *
 * Integrates Basecamp 3 chatbots as a native OpenClaw channel.
 *
 * @example
 * // In your OpenClaw config:
 * {
 *   channels: {
 *     basecamp: {
 *       enabled: true,
 *       botName: "claudia",
 *       webhookPath: "/basecamp/webhook"
 *     }
 *   }
 * }
 */
export default {
  id: 'basecamp',
  name: 'Basecamp Channel',
  description: 'Basecamp 3 chatbot integration channel for OpenClaw',

  register(api: OpenClawPluginApi) {
    const log = api.runtime.logging.getChildLogger('basecamp');
    log.info('Initializing plugin...');

    // Load and validate configuration
    const channelsConfig = (api.config as { channels?: { basecamp?: Partial<BasecampConfig> } })
      .channels;
    const rawConfig = channelsConfig?.basecamp ?? {};
    const config = validateConfig(rawConfig);

    if (!config.enabled) {
      log.info('Plugin is disabled');
      return;
    }

    log.info('Plugin configuration:', config);

    // Register channel implementation with gateway webhook handling
    api.registerChannel({ plugin: createBasecampChannel(config, log) });

    // Setup periodic session cleanup via registered service
    let cleanupInterval: ReturnType<typeof setInterval> | undefined;
    api.registerService({
      id: 'basecamp-cleanup',
      start() {
        cleanupInterval = setInterval(() => {
          log.debug('Cleaning up old sessions...');
          cleanupOldSessions(24 * 60 * 60 * 1000); // 24 hours
        }, 6 * 60 * 60 * 1000);
      },
      stop() {
        if (cleanupInterval) clearInterval(cleanupInterval);
        log.info('Plugin shutdown complete');
      },
    });

    log.info('Plugin initialized successfully');
    log.info(`Bot name: ${config.botName}`);
  },
};
