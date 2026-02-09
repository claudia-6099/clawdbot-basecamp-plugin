import type { BasecampConfig } from './types.js';

/**
 * Default configuration for Basecamp plugin
 */
export const defaultConfig: BasecampConfig = {
  enabled: true,
  botName: 'claudia',
  webhookPath: '/basecamp/webhook',
  port: 3000,
};

/**
 * Validate Basecamp configuration
 */
export function validateConfig(config: Partial<BasecampConfig>): BasecampConfig {
  return {
    enabled: config.enabled ?? defaultConfig.enabled,
    botName: config.botName ?? defaultConfig.botName,
    webhookPath: config.webhookPath ?? defaultConfig.webhookPath,
    port: config.port ?? defaultConfig.port,
    oauth: config.oauth,
    chatTypeCache: config.chatTypeCache,
  };
}

/**
 * JSON Schema for configuration validation
 */
export const configSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    enabled: {
      type: 'boolean',
      default: true,
      description: 'Enable/disable the Basecamp channel',
    },
    botName: {
      type: 'string',
      default: 'claudia',
      description: 'Name of the bot in Basecamp',
    },
    webhookPath: {
      type: 'string',
      default: '/basecamp/webhook',
      description: 'Path for webhook endpoint',
    },
    port: {
      type: 'number',
      default: 3000,
      description: 'Port for webhook server',
    },
    oauth: {
      type: 'object',
      description: 'OAuth configuration for Basecamp API access (chat type detection)',
      properties: {
        clientId: { type: 'string', description: 'Basecamp OAuth app client ID' },
        clientSecret: { type: 'string', description: 'Basecamp OAuth app client secret' },
        redirectUri: { type: 'string', description: 'OAuth redirect URI' },
      },
    },
    chatTypeCache: {
      type: 'object',
      description: 'Chat type cache configuration',
      properties: {
        ttlDays: {
          type: 'number',
          default: 7,
          minimum: 1,
          description: 'Cache TTL in days (default: 7)',
        },
      },
    },
  },
};
