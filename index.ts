import type { PluginAPI } from '@clawdbot/plugin-sdk';
import { basecampChannel } from './src/channel.js';
import { registerWebhookHandler, cleanupOldSessions } from './src/webhook.js';
import { setupRuntime } from './src/runtime.js';
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
 *       webhookPath: "/basecamp/webhook",
 *       port: 3000
 *     }
 *   }
 * }
 */
export default async function registerBasecampPlugin(api: PluginAPI): Promise<void> {
  api.log.info('[Basecamp] Initializing plugin...');

  // Load and validate configuration
  const apiConfig = api.config as {channels?: {basecamp?: Partial<BasecampConfig>}};
  const rawConfig = apiConfig.channels?.basecamp || {};
  const config = validateConfig(rawConfig);

  if (!config.enabled) {
    api.log.info('[Basecamp] Plugin is disabled');
    return;
  }

  api.log.info('[Basecamp] Plugin configuration:', config);

  // Setup runtime bridge
  setupRuntime(api);

  // Register webhook handler
  registerWebhookHandler(api, config.webhookPath);

  // Register channel implementation
  api.registerChannel({ plugin: basecampChannel });

  // Setup periodic session cleanup (every 6 hours)
  const cleanupInterval = setInterval(() => {
    api.log.debug('[Basecamp] Cleaning up old sessions...');
    cleanupOldSessions(24 * 60 * 60 * 1000); // 24 hours
  }, 6 * 60 * 60 * 1000);

  // Cleanup on shutdown
  api.onShutdown(() => {
    clearInterval(cleanupInterval);
    api.log.info('[Basecamp] Plugin shutdown complete');
  });

  api.log.info('[Basecamp] Plugin initialized successfully');
  api.log.info(`[Basecamp] Webhook endpoint: ${config.webhookPath}`);
  api.log.info(`[Basecamp] Bot name: ${config.botName}`);
}
