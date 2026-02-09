import type { BasecampConfig } from './types.js';

/**
 * Default configuration for Basecamp plugin
 */
export const defaultConfig: BasecampConfig = {
  enabled: true,
  botName: 'claudia',
  webhookPath: '/basecamp/webhook',
  port: 3000,
  streamProgress: true,
  progressThrottleMs: 5000,
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
    streamProgress: config.streamProgress ?? defaultConfig.streamProgress,
    progressThrottleMs: config.progressThrottleMs ?? defaultConfig.progressThrottleMs,
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
    streamProgress: {
      type: 'boolean',
      default: true,
      description: 'Send periodic progress messages while the agent is generating a response',
    },
    progressThrottleMs: {
      type: 'number',
      default: 5000,
      minimum: 1000,
      description: 'Minimum interval in ms between progress messages (minimum 1000)',
    },
  },
};
